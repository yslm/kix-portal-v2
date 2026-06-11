import { http } from './http'
import type { CreativesListResponse } from './types'

/**
 * Portal admin · Creatives (asset library) API.
 *
 * Mirrors the legacy fallback fetcher `_kixLoadCreativesLegacy()` in
 * `kix-platform/landing/portal.html` (~line 6919-6940), which calls
 *   `fetch('/api/v1/portal/settings/creatives/' + brand_id)`
 * and reads `(d && d.items) || []` off the response.
 *
 * The live legacy view actually hits the PAGINATED variant
 *   `/api/v1/portal/settings/creatives/<bid>/page?page=&page_size=`
 * (T5.C N3 sweep — see portal.html line 6907-6913). Plan 5 T7 ports
 * against the simpler non-paginated endpoint to keep the first cut
 * honest (no pagination controls until that surface lands as a
 * follow-up).
 *
 * Brand id is in the URL path — same settings-router pattern as
 * `fetchBrandProfile()`, NOT the JWT-inferred /portal-admin/ shape
 * used by `listGeofences()` / `listCustomers()` / `listAudiences()`.
 * The legacy `_t44Bid()` helper at portal.html falls back to
 * `'demo_brand'` when `kix_brand_id` is unset in localStorage; we
 * mirror that default here for parity (matches the convention in
 * `fetchBrandProfile()` and `fetchLiveCards()` in this same folder).
 *
 * Plan 5 T7 ports ONLY the list-read endpoint. Deferred items (still
 * served by the legacy view at portal.html lines 1871-1907):
 *
 *   - "+ Upload asset" CTA + hidden `<input type="file">` + the POST
 *     metadata-only registration at portal.html line 6860-6868
 *     (`kixUploadCreatives()` at line 6844). The real S3 wiring lives
 *     in `app/services/asset_storage.py` and uploads via
 *     `/api/v1/assets/upload` (portal.html line 5785).
 *
 *   - Per-asset edit / delete actions — not present in the legacy
 *     view either (the only mutation surface is the upload flow).
 *
 *   - Brand-kit hero card (primary logo + brand colours + typography
 *     placeholder) — pure decoration in the legacy view, no data
 *     on the wire. Can be folded back in once the brand-profile
 *     editor surfaces `logo_url` / `brand_color`.
 *
 *   - Pagination controls (Prev / Next + page label) — would require
 *     porting `kixPaginate*` helpers and bumping to the `/page`
 *     endpoint shape `{ items, total, has_more }`.
 *
 * @see src/views/kix/Creatives.vue
 */
export const listCreatives = (brandId?: string) =>
  http.get<CreativesListResponse>(
    `/api/v1/portal/settings/creatives/${encodeURIComponent(brandId || 'demo_brand')}`
  )
