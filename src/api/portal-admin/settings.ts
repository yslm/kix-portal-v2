import { http } from './http'
import type { BrandProfileResponse } from './types'

/**
 * Portal admin · Settings view API.
 *
 * One endpoint per UI section as ported from kix-platform/landing/portal.html.
 * Additional fetchers (billing invoices, payment methods, stores list, team
 * members, integrations, notification prefs, security state) live alongside
 * this file as the remaining Settings sub-sections are migrated.
 *
 * @see src/views/kix/Settings.vue
 */

/**
 * GET /api/v1/portal/settings/profile/<brand_id>
 *
 * Returns the brand's profile (display name, contact info, tax ID, country,
 * website, city, logo URL, business type). Reference renderer:
 * kix-platform/landing/portal.html → `kixLoadProfile()` (~line 5937).
 *
 * Brand falls back to `'demo_brand'` (matches the legacy `_t44Bid()` helper
 * default when `kix_brand_id` is not set in localStorage).
 */
export const fetchBrandProfile = (brandId?: string) =>
  http.get<BrandProfileResponse>(
    `/api/v1/portal/settings/profile/${encodeURIComponent(brandId || 'demo_brand')}`
  )
