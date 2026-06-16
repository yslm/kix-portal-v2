import { http } from './http'
import type { AudiencesListResponse } from './types'

/**
 * Portal admin · Audiences view API.
 *
 * Mirrors the simpler portal-admin endpoint
 *   GET /api/v1/portal-admin/audiences
 * declared at `app/routers/portal_admin.py:571` with
 * `response_model=list[Audience]`. Brand identity is inferred from the JWT
 * (`get_current_brand` dependency) — same pattern as `listCustomers()`,
 * no explicit `?brand=` param, unlike `listFlows()`.
 *
 * The LIVE legacy view actually hits the paginated route
 *   GET /api/v1/portal/settings/audiences/<bid>/page?page=&page_size=
 * (see `kixLoadAudiences()` at portal.html line 6799). That route returns
 * `{ items, total, has_more }` with a settings-router row schema
 * (`audience_id`, `source`, `size`, `last_refreshed_at.formatted_display`,
 * `status`). We deliberately port against the simpler portal-admin route
 * for Plan 4 T4 because:
 *   1. The first cut is list-only (no pagination state to manage)
 *   2. Brand inference from JWT removes one moving piece
 *   3. The schema is closer to the canonical `Audience` pydantic model
 *      (id / name / type / size_estimate / created_at / last_used_at)
 *
 * Plan 4 T4 deferred items (still served by the legacy view):
 *   - Paginated variant `/portal/settings/audiences/<bid>/page`
 *     (legacy `kixLoadAudiences()` at line 6799 + the static prev/next
 *     handlers at line 6790-6796)
 *   - New-audience form (`#audience-new-form` at line 1830-1857) and the
 *     submit fetcher `kixSubmitNewAudience()`
 *   - Edit / rename via `kixEditAudience()` (line 6830-6839) — PATCHes
 *     `/portal/settings/audiences/<bid>/<aid>`
 *   - RFM-summary integration that powers the source-quick-segment select
 *     options (`kixAudiencePreset()` at line 6660-ish)
 *   - StatusBadge wiring — the portal-admin route has no `status` field,
 *     so the badge is deferred until the paginated route is ported
 *
 * @see src/views/kix/Audiences.vue
 */
export const listAudiences = () => http.get<AudiencesListResponse>('/api/v1/portal-admin/audiences')

import { resolveBrandId } from '@/utils/kix/resolveBrandId'

/**
 * POST /portal/settings/audiences/{brand} — create an audience (deferred,
 * now shipped; kixCreateAudience ~6903). Note the SETTINGS namespace, not
 * portal-admin (the admin endpoint is a read-only demo list).
 */
export const createAudience = (
  body: { name: string; source?: string; description?: string | null },
  brandId?: string
) =>
  http.post(
    `/api/v1/portal/settings/audiences/${encodeURIComponent(brandId ?? resolveBrandId())}`,
    body
  )
