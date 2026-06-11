import { http } from './http'
import type { AbTestsListResponse } from './types'

/**
 * Portal admin · A/B tests view API.
 *
 * Mirrors the legacy `kixLoadAbTests()` fetcher in
 * `kix-platform/landing/portal.html` (~line 6965), which calls
 *   `fetch('/api/v1/portal-admin/ab-tests', {headers: kixAuthHeaders()})`
 * with no `?brand=` query param — brand identity is inferred from the
 * JWT (`get_current_brand` dependency, see
 * `app/routers/portal_admin.py:2651`), same pattern as `listCustomers()`
 * + `listAudiences()`.
 *
 * The backend returns a `{ items, source, updated_at, freshness,
 * campaign_count, can_create, empty_state_hint }` wrapper. Plan 4 T5
 * surfaces only the `items[]` list in the view; the empty-state
 * gating fields (`can_create`, `empty_state_hint`, `campaign_count`)
 * are typed but DEFERRED to the create-form sub-task — the v2 empty
 * state ships a flat "No A/B tests yet" placeholder until then.
 *
 * Plan 4 T5 deferred items (still served by the legacy view):
 *   - New-test create modal (`#abtest-modal` at portal.html line 7036)
 *     and the submit fetcher `kixSubmitAbTest()` POSTing
 *     `/api/v1/portal-admin/ab-tests`
 *   - Per-test results dashboard (`kixAbTestView()` at line 7080
 *     hitting `/api/v1/portal-admin/ab-tests/<id>/results`)
 *   - Ship-winner CTA (`kixAbTestShip()` at line 7142 POSTing
 *     `/api/v1/portal-admin/ab-tests/<id>/ship`)
 *   - Fail-closed dual empty state — "+ New test" when `can_create`
 *     is true, otherwise "Go to Campaigns →"
 *
 * @see src/views/kix/AbTests.vue
 */
export const listAbTests = () => http.get<AbTestsListResponse>('/api/v1/portal-admin/ab-tests')
