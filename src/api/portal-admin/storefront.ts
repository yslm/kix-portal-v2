import { http } from './http'
import type { StorefrontResponse } from './types'

/**
 * Portal · Storefront (public brand-page) API.
 *
 * Wire endpoint:
 *   GET /api/v1/storefront/{brand_id}
 *     → StorefrontProfile (display_name, logo, brand_color, bio,
 *       follower_count, avg_rating, …). See `get_storefront` at
 *       app/routers/storefront.py line 462-484.
 *
 * Path-style brand id (NOT a `?brand=` query param) because the
 * storefront router serves the PUBLIC brand page — same URL pattern
 * the portal uses for /sf/{bid} that 302-redirects into
 * /landing/storefront.html. There is no auth requirement on this GET
 * (the storefront is by design world-readable so customers landing
 * after a QR scan can view it without signing in). The v2 caller
 * still resolves brand via `resolveBrandId()` so the merchant sees
 * their OWN preview, not a hard-coded demo brand.
 *
 * Plan 5 T4 deferred items (still served by the legacy view):
 *   - POST /api/v1/storefront/{bid}/configure — `configureStorefront()`
 *     mutation that accepts the full StorefrontConfig body (display_name,
 *     bio, logo_url, brand_color, contact, featured_games, etc).
 *     Belongs with the customisation editor in a later task.
 *   - GET /api/v1/storefront/{bid}/games, /vouchers, /stores,
 *     /reviews — tab-specific data feeds for the public page itself,
 *     not for the merchant-facing portal preview.
 *
 * @see src/views/kix/Storefront.vue
 */
export const fetchStorefront = (brandId: string) =>
  http.get<StorefrontResponse>(`/api/v1/storefront/${encodeURIComponent(brandId)}`)
