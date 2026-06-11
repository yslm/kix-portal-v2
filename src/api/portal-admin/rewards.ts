import { http } from './http'
import type { RewardTemplatesResponse } from './types'
import { resolveBrandId } from '@/utils/kix/resolveBrandId'

/**
 * Portal admin · Rewards consolidated view API — Plan 5 T8.
 *
 * Templates-tab fetcher. Mirrors the legacy `kixLoadPrizes()` at
 * `kix-platform/landing/portal.html` line 5721-5751, which calls
 *   `fetch('/api/v1/prizes?brand_id=' + encodeURIComponent(_t44Bid()))`
 * and reads `(d && d.prizes) || []` off the response.
 *
 * Brand id is a `?brand_id=` query param (NOT a JWT-inferred
 * `/portal-admin/` path), because the legacy router for prizes
 * predates the portal-admin convention — it lives at the top-level
 * `/api/v1/prizes` namespace. The v2 caller resolves brand via
 * `resolveBrandId()` (falls back to `'demo_brand'`) so the merchant
 * sees their OWN catalog, matching the `_t44Bid()` default at
 * portal.html when `kix_brand_id` is unset.
 *
 * Plan 5 T8 ports ONLY the list-read endpoint for the Templates
 * tab. The other 3 tabs (Game links / Issuance / Redemption)
 * ship as stubs in this task — endpoints DEFERRED:
 *
 *   - Game links · `kixCQLoadGameRewards()` at portal.html
 *     line 5577-5620 (binds prize templates to game rewards).
 *   - Issuance · `kixCQLoadIssuance()` (per-customer voucher
 *     issuance log + filters; endpoint TBD in the audit).
 *   - Redemption · `kixCQLookup()` + `kixCQRedeem()` (real-time
 *     redemption lookup + QR scan stats).
 *   - Create / delete template mutations · `kixCreatePrize()` at
 *     line 5827-5839 (POST `/api/v1/prizes/create`) and
 *     `kixDeletePrize()` at line 5754-5768 (DELETE
 *     `/api/v1/prizes/<pid>?brand_id=…`). Read-only first cut.
 *
 * @see src/views/kix/Rewards.vue
 */
export const listRewardTemplates = (brandId?: string) =>
  http.get<RewardTemplatesResponse>(
    `/api/v1/prizes?brand_id=${encodeURIComponent(brandId ?? resolveBrandId())}`
  )
