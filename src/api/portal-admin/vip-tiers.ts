import { http } from './http'
import type { LoyaltyTiersResponse, LoyaltyTierDistributionResponse } from './types'

/**
 * Portal admin · VIP / Loyalty tiers API.
 *
 * Two paired GETs the legacy view fires in parallel (portal.html line
 * 4089-4090):
 *
 *   GET /api/v1/portal-admin/loyalty-tiers
 *     → tier ladder config (defaults until the merchant saves their own)
 *
 *   GET /api/v1/portal-admin/loyalty-tiers/distribution
 *     → per-tier `members` count derived from REAL player XP over the
 *       brand's `users_ever` set (sampled, cap 500).
 *
 * Both endpoints live on the portal-admin router and infer brand from
 * the JWT via `get_current_brand` — no `?brand=` query param, same
 * pattern as listCustomers() / listAudiences() / listRules() /
 * listAbTests() / listTemplates() / listCases().
 *
 * Backend handlers:
 *   - `get_loyalty_tiers` at app/routers/portal_admin.py line 3531-3550
 *   - `loyalty_tier_distribution` at portal_admin.py line 3575-3612
 *
 * `listLoyaltyTierDistribution()` may legitimately fail (the legacy
 * fetcher uses `.catch(() => null)` because the route 503s when Redis
 * is unavailable — see portal_admin.py line 3582-3583). The v2 caller
 * surfaces this as a separate `distError` state so the page can still
 * render the tier ladder when only the distribution graph is broken.
 *
 * Plan 5 T3 deferred items (still served by the legacy view):
 *   - PUT /api/v1/portal-admin/loyalty-tiers — `saveLoyaltyTiers()`
 *     mutation. Server-validated: lowest min_xp must be 0, names must
 *     be unique (case-insensitive). The 422 error surfacing belongs
 *     with the editor form work in a later task.
 *
 * @see src/views/kix/VipTiers.vue
 */
export const listLoyaltyTiers = () =>
  http.get<LoyaltyTiersResponse>('/api/v1/portal-admin/loyalty-tiers')

export const listLoyaltyTierDistribution = () =>
  http.get<LoyaltyTierDistributionResponse>('/api/v1/portal-admin/loyalty-tiers/distribution')
