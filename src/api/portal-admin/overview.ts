import { http } from './http'
import type { LiveCardsResponse, SetupGuideResponse } from './types'

/**
 * Portal admin · Overview view API.
 *
 * One endpoint per UI section as ported from kix-platform/landing/portal.html.
 * Add additional fetchers (NBA card, setup-guide card, metric cards, …) here
 * as the remaining overview sections are migrated.
 *
 * @see src/views/kix/Overview.vue
 */

/**
 * GET /api/v1/portal/builder/live-cards?brand_id=<id>
 *
 * Powers the "live-cards" grid in the Overview view (the small, on-canvas
 * "live now" card per active campaign). Reference renderer:
 * kix-platform/landing/portal.html → `_loadLiveStats()` (~line 10082).
 *
 * Brand falls back to `'demo_brand'` (same default the legacy `_bid()`
 * helper used when no `kix_brand_id` was set in localStorage).
 */
export const fetchLiveCards = (brandId?: string) =>
  http.get<LiveCardsResponse>('/api/v1/portal/builder/live-cards', {
    params: { brand_id: brandId || 'demo_brand' }
  })

/**
 * GET /api/v1/portal-admin/setup-guide
 *
 * Powers the Shopify-style setup checklist card on the Overview view
 * (`#setup-guide-card` in the legacy portal.html, line 1324). Brand is
 * inferred server-side from the JWT (`get_current_brand` dependency) —
 * no `?brand=` / `?brand_id=` query parameter. Same pattern as
 * `listCustomers()` / `listAudiences()` / `listRules()`.
 *
 * Response (`SetupGuideResponse`):
 *   { brand_id, steps: SetupStep[], done, total, complete, source }
 *
 * Each step row: `{ key, done, view?, count? }` — see SetupStep typedef
 * for the canonical step keys and their underlying Redis signals
 * (portal_admin.py · `setup_guide()` at line 3618-3687).
 *
 * Reference legacy fetcher: `kixLoadSetupGuide()` at portal.html line 4199.
 */
export const fetchSetupGuide = () =>
  http.get<SetupGuideResponse>('/api/v1/portal-admin/setup-guide')
