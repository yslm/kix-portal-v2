import { http } from './http'
import type {
  OpportunityScore,
  OpportunityScoreRequest,
  VoucherTemplatesResponse,
  PublishResponse
} from './types'

/**
 * POST /api/v1/portal/builder/opportunity-score
 *
 * Source: kix-platform/landing/portal.html · `_refreshOpportunityScore()`
 * (~line 10058). Note the namespace is `/portal/builder/`, NOT
 * `/portal-admin/` — the rule-based scoring engine sits on the public
 * merchant path.
 *
 * Plan 3 Task 5 only ports the Builder entry view. The legacy caller
 * assembles `cfg` from real Game / Voucher / Rule / Schedule / Safety
 * sub-forms; in Plan 3 those sub-forms are intentionally OUT OF SCOPE
 * and each will land in its own future task. Until then, the view sends
 * a minimal empty baseline (see `defaultEmptyConfig` below) so the card
 * has something to render.
 */
export const fetchOpportunityScore = (body: OpportunityScoreRequest) =>
  http.post<OpportunityScore>('/api/v1/portal/builder/opportunity-score', body)

/**
 * Empty-baseline request body used by the Plan 3 entry view. Mirrors the
 * legacy caller's shape (line 10049-10056 in portal.html) but with empty
 * sub-objects until each sub-form is migrated.
 */
export const defaultEmptyConfig: OpportunityScoreRequest = {
  game: {},
  voucher: {},
  rule: {},
  schedule: {},
  safety: {},
  audience: { type: 'recent_visitors_7d' }
}

// ---------------------------------------------------------------------------
// Module sub-forms + publish (Builder deferred feature, now shipped)
// ---------------------------------------------------------------------------

/** GET /builder/voucher-templates?vertical=<v> — populates the voucher
 *  template select for the chosen vertical. */
export const fetchVoucherTemplates = (vertical: string) =>
  http.get<VoucherTemplatesResponse>('/api/v1/portal/builder/voucher-templates', {
    params: { vertical }
  })

/** POST /builder/rule-configure — persists the rule module to Redis so the
 *  publish step can read it (legacy reads rule/schedule server-side). */
export const configureRule = (body: Record<string, unknown>) =>
  http.post('/api/v1/portal/builder/rule-configure', body)

/** POST /builder/schedule-configure — persists the schedule module to Redis
 *  (publish reads `brand:{bid}:builder_schedule`). */
export const configureSchedule = (body: Record<string, unknown>) =>
  http.post('/api/v1/portal/builder/schedule-configure', body)

/**
 * POST /builder/publish — atomic campaign publish. game/voucher/safety/
 * tournament come from the body; rule/schedule are read from Redis (hence
 * the configure calls above must run first). A KYC gate returns HTTP 403
 * with `{ error: 'kyc_required', next }` — handle on the axios error.
 */
export const publishCampaign = (body: Record<string, unknown>) =>
  http.post<PublishResponse>('/api/v1/portal/builder/publish', body)
