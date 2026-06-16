import { http } from './http'
import type { RulesListResponse } from './types'

/**
 * Portal admin · Rules (Automations) view API.
 *
 * Mirrors the legacy `kixLoadRules()` fetcher in
 * `kix-platform/landing/portal.html` (~line 7185), which calls
 *   `fetch('/api/v1/portal-admin/automations', {headers: kixAuthHeaders()})`
 * with no `?brand=` query param — brand identity is inferred from the JWT
 * (`get_current_brand` dependency on the FastAPI route), same pattern as
 * `listCustomers()` / `listAudiences()` / `listAbTests()`.
 *
 * Naming note (Wave4): the navigation label, route path, and legacy
 * view-id are all "rules" (see portal.html line 1933 `id="view-rules"`),
 * but the rendered page title is "Automations" and the wire endpoint
 * lives under `/automations`. We keep the v2 module named after the
 * route (`rules.ts` + `listRules()`) so the file layout matches the
 * router; the underlying URL stays the legacy `/automations` path so the
 * backend doesn't have to change.
 *
 * The backend returns a `{ items, source, updated_at, freshness,
 * empty_state_hint }` wrapper. Plan 4 T6 surfaces only the `items[]`
 * list in the view; the empty-state gating field (`empty_state_hint`)
 * is typed but DEFERRED — the v2 empty state ships a flat "No automation
 * rules yet" placeholder until the create flow lands.
 *
 * Plan 4 T6 deferred items (still served by the legacy view):
 *   - Per-row On / Off / Notify only toggle buttons calling
 *     PATCH `/api/v1/portal-admin/automations/<id>/state`
 *     (`kixToggleAutomation()` at portal.html line 7238)
 *   - "+ Create rule" CTA — legacy redirects to the Flows wizard
 *   - Audit log button (`kixOpenAuditLog()` modal)
 *   - Dry-run endpoint (`POST /api/v1/portal-admin/rules/dry-run` at
 *     portal.html line 10495) used by the inline rule builder preview
 *
 * @see src/views/kix/Rules.vue
 */
export const listRules = () => http.get<RulesListResponse>('/api/v1/portal-admin/automations')

/**
 * PATCH /automations/{id}/state — toggle a rule (deferred, now shipped;
 * kixToggleRule ~7388). state ∈ on|off|notify_only. (Backend has no
 * create/edit/delete for automations — toggle is the only mutation.)
 */
export const setRuleState = (
  ruleId: string,
  state: 'on' | 'off' | 'notify_only',
  notify?: boolean
) =>
  http.patch(`/api/v1/portal-admin/automations/${encodeURIComponent(ruleId)}/state`, {
    state,
    ...(notify === undefined ? {} : { notify })
  })
