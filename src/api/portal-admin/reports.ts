import { http } from './http'
import type {
  OwnerReportSummary,
  RedemptionsTodayResponse,
  RfmSummaryResponse,
  StatusStrip,
  TopCampaignsResponse,
  FunnelResponse,
  MonitoringLiveResponse,
  OpsTodayResponse,
  LiveMonitor,
  AttributionResponse
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
 * GET /api/v1/portal-admin/reports/top-campaigns?limit=<n>
 *
 * Powers the Reports · Performance "Top campaigns by ROAS" table
 * (legacy `#reports-top-campaigns`, data-source attribute at portal.html
 * line 2015; renderer `kixLoadTopCampaigns()` ~line 5010). Brand is
 * inferred server-side from the JWT — no `?brand=` query param.
 *
 * Returns `{ items, source, updated_at, empty_state_hint }`. For real
 * brands spend/conversions/roas are `null` until per-campaign attribution
 * exists (honest, not fabricated) — the table renders em-dashes.
 */
export const fetchTopCampaigns = (limit = 5) =>
  http.get<TopCampaignsResponse>(`${PORTAL_ADMIN}/reports/top-campaigns`, {
    params: { limit }
  })

/**
 * GET /api/v1/portal-admin/reports/funnel?source=true
 *
 * Powers the Reports · Engagement conversion funnel (legacy
 * `#engagement-funnel`, renderer `kixRenderFunnelSvg()` ~line 5030).
 * `source=true` returns the `{ items, source, empty_state_hint, … }`
 * envelope (vs a bare `FunnelStep[]` when omitted). Brand is inferred
 * server-side from the JWT — no `?brand=` query param.
 */
export const fetchFunnel = () =>
  http.get<FunnelResponse>(`${PORTAL_ADMIN}/reports/funnel`, {
    params: { source: true }
  })

export const fetchMonitoringLive = () =>
  http.get<MonitoringLiveResponse>(`${PORTAL_ADMIN}/monitoring/live`)

export const fetchOpsToday = () => http.get<OpsTodayResponse>(`${PORTAL_ADMIN}/ops/today`)

/**
 * Compose the Reports · Live monitoring "Live now" reading. Fans out
 * /monitoring/live and /ops/today in parallel; each leg is independently
 * tolerated (same `.catch(() => null)` pattern as `fetchOwnerReport`):
 * a failed endpoint yields `null` fields, never a fabricated number.
 *
 * `plays_today` prefers /monitoring/live but falls back to /ops/today's
 * `plays` (both read the same `brand:{bid}:game_plays:{day}` counter) so
 * a partial outage still surfaces it. Returns the `{ data }` shape that
 * `useNonCriticalCard` expects.
 */
export async function fetchLiveMonitor(): Promise<{ data: LiveMonitor }> {
  const [liveRes, opsRes] = await Promise.all([
    fetchMonitoringLive().catch(() => null),
    fetchOpsToday().catch(() => null)
  ])

  const live = liveRes?.data ?? null
  const ops = opsRes?.data ?? null

  return {
    data: {
      plays_per_min: live ? (live.plays_per_min ?? null) : null,
      plays_today: live ? (live.plays_today ?? null) : ops ? (ops.plays ?? null) : null,
      redemptions_today: ops ? (ops.redemptions ?? null) : null,
      new_customers_today: ops ? (ops.new_customers ?? null) : null
    }
  }
}

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

/**
 * GET /reports/attribution?window= — multi-touch attribution by channel
 * (deferred, now shipped; legacy ~5018). window ∈ 1d_click | 7d_click |
 * 28d_click | 1d_view.
 */
export const fetchAttribution = (window = '7d_click') =>
  http.get<AttributionResponse>(`${PORTAL_ADMIN}/reports/attribution`, { params: { window } })

/**
 * GET /reports/export.csv — cohort CSV as a Blob for client-side download
 * (deferred, now shipped; legacy ~4977). kixHttp adds the auth header.
 */
export const exportReportsCsv = () =>
  http.get(`${PORTAL_ADMIN}/reports/export.csv`, { responseType: 'blob' })
