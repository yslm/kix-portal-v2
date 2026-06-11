import { http } from './http'
import type { FlowsListResponse } from './types'

/**
 * Portal admin · Flows view API.
 *
 * Mirrors the legacy `kixLoadFlows()` fetcher in
 * `kix-platform/landing/portal.html` (~line 8750), which calls
 *   `fetch(KIX_FLOWS_API + '?brand=' + encodeURIComponent(KIX_BRAND_ID))`
 * with `KIX_FLOWS_API = '/api/v1/portal-admin/flows'` (line 8588).
 *
 * Unlike `/portal-admin/campaigns` (which infers brand from the JWT),
 * the flows endpoint takes an explicit `brand` query param — the v2
 * caller resolves it via `resolveBrandId()` the same way `Games.vue` does.
 *
 * @see src/views/kix/Flows.vue
 */
export const listFlows = (brand: string) =>
  http.get<FlowsListResponse>('/api/v1/portal-admin/flows', {
    params: { brand }
  })
