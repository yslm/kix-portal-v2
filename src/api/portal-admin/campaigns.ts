import { http } from './http'
import type { CampaignsListResponse } from './types'

/**
 * Portal admin · Campaigns view API.
 *
 * Mirrors the legacy `kixLoadCampaignsList()` fetcher in
 * `kix-platform/landing/portal.html` (~line 5321). The endpoint is auth-only
 * (Bearer token resolves the brand server-side) — no `brand_id` query
 * parameter is sent. Pass-through to `kixHttp` keeps the JWT header in
 * place via the shared axios instance.
 *
 * @see src/views/kix/Campaigns.vue
 */

/**
 * GET /api/v1/portal-admin/campaigns
 *
 * Returns the active brand's campaign list. The backend declares
 * `response_model=list[Campaign]` so the body is a BARE ARRAY in normal
 * operation, but the view also handles `{ campaigns: [...] }` and
 * `{ items: [...] }` wrapper shapes (the legacy renderer did the same;
 * see the "Marathon fix" comment in portal.html lines 5329-5332).
 *
 * No `brand_id` is sent on the wire — the legacy renderer at
 * portal.html:5326 and the A/B picker at portal.html:7030 both rely on
 * the JWT alone to resolve the brand server-side. We mirror that.
 */
export const listCampaigns = () => http.get<CampaignsListResponse>('/api/v1/portal-admin/campaigns')
