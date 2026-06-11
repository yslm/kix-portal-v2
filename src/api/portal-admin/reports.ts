import { http } from './http'
import type {
  OwnerReportSummary,
  RedemptionsTodayResponse,
  RfmSummaryResponse,
  StatusStrip
} from './types'

/**
 * Portal admin · Reports view API.
 *
 * Mirrors the legacy `kixLoadOwnerReport()` aggregator in
 * `kix-platform/landing/portal.html` (~line 3978). The legacy code fans
 * three GETs out in parallel and folds them into the three Simple-mode
 * "owner numbers": new customers · today's redemptions · returning
 * players. Each fetch is independent — the legacy `.catch(() => null)`
 * pattern tolerates a partial failure (a missing data point renders as
 * an em-dash, not as a broken view).
 *
 * Endpoints (all under the `KIX_API = '/api/v1/portal-admin'` base):
 *   GET /overview                       → StatusStrip
 *   GET /redemptions/today              → { count, value_str, recent }
 *   GET /customers/rfm-summary          → { segments: { champions,
 *                                                       loyal, at_risk,
 *                                                       new, lost }, … }
 *
 * Deferred: the Advanced-mode reports tabs (`Performance / Engagement /
 * Live monitoring`) — their KPI grid, top-campaigns table, funnel,
 * heatmap, and live event feed are tracked for future Plan 4 sub-tasks.
 *
 * @see src/views/kix/Reports.vue
 */

const PORTAL_ADMIN = '/api/v1/portal-admin'

export const fetchStatusStrip = () => http.get<StatusStrip>(`${PORTAL_ADMIN}/overview`)

export const fetchRedemptionsToday = () =>
  http.get<RedemptionsTodayResponse>(`${PORTAL_ADMIN}/redemptions/today`)

export const fetchRfmSummary = () =>
  http.get<RfmSummaryResponse>(`${PORTAL_ADMIN}/customers/rfm-summary`)

/**
 * Compose the owner-report summary. Each leg is independently tolerated:
 * if one endpoint fails (RFM is 503 when Redis is unavailable, for
 * instance), the corresponding field is `null` and the view renders an
 * em-dash — same partial-data behaviour as the legacy aggregator.
 *
 * Note: brand identity comes from the JWT (`get_current_brand`
 * dependency on the portal-admin router), so this composer takes NO
 * brand argument — unlike `listFlows` which forwards an explicit
 * `?brand=` query param. The view still calls `resolveBrandId()` for
 * logging/parity with the other v2 views, but the value is not passed
 * through to the server.
 */
export async function fetchOwnerReport(): Promise<OwnerReportSummary> {
  const [overviewRes, redemptionsRes, rfmRes] = await Promise.all([
    fetchStatusStrip().catch(() => null),
    fetchRedemptionsToday().catch(() => null),
    fetchRfmSummary().catch(() => null)
  ])

  const overview = overviewRes?.data ?? null
  const redemptions = redemptionsRes?.data ?? null
  const rfm = rfmRes?.data ?? null

  // Legacy line 3987: `ov.new_customers_7d ?? ov.new_customers ?? null`.
  const newCustomers =
    overview != null ? (overview.new_customers_7d ?? overview.new_customers ?? null) : null

  // Legacy line 3988: `rd.count ?? 0`. We mirror that: when the endpoint
  // resolved (even with zero) we surface a number; when it failed we
  // surface null so the view can render em-dash.
  const redemptionsToday = redemptions != null ? (redemptions.count ?? 0) : null

  // Legacy line 3990-3992: champions + loyal + at_risk = "players who
  // came back". Null when the RFM endpoint is unavailable.
  let returningPlayers: number | null = null
  if (rfm && rfm.segments) {
    const s = rfm.segments
    returningPlayers = (s.champions || 0) + (s.loyal || 0) + (s.at_risk || 0)
  }

  return { newCustomers, redemptionsToday, returningPlayers }
}
