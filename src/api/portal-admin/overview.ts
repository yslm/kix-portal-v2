import { http } from './http'
import type { LiveCardsResponse } from './types'

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
