import { http } from './http'
import type { CasesListResponse } from './types'

/**
 * Portal admin · Case Studio prospects API.
 *
 * Mirrors the legacy `kixLoadCases()` fetcher in
 * `kix-platform/landing/portal.html` (~line 8461), which calls
 *   `fetch(KIX_CASES_API + '/prospects')`
 * where `KIX_CASES_API = '/api/v1/portal-admin/case-studio'` (line 8460).
 * The prospects list therefore lives at
 *   `/api/v1/portal-admin/case-studio/prospects`
 * — it hangs off the case-studio router (FastAPI route declared at
 * `app/routers/case_studio.py` line 89-92, mounted with prefix
 * `/api/v1/portal-admin` in `app/main.py` line 1043).
 *
 * Unlike the merchant-facing endpoints (Campaigns / Audiences / Rules /
 * Templates / AbTests), Case Studio is a platform-internal sales tool
 * keyed by `prospect_id` rather than a merchant brand. There is no
 * `?brand=` param and no `get_current_brand` dependency on the backend —
 * the list is the union of seed JSONs under `app/data/prospects/` and
 * any drafts a sales rep has created via the legacy "+ New case" CTA.
 *
 * The legacy renderer expects a `{ prospects }` wrapper. The v2 caller
 * sends no query params (no pagination, no filtering) and relies on the
 * server's default ordering. Bare arrays / `{ items }` wrappers are
 * tolerated client-side for defensive parity with the rest of the
 * portal-admin surface.
 *
 * Plan 5 T2 deferred items (still served by the legacy view):
 *   - "+ New case" CTA → POST `/api/v1/portal-admin/case-studio/prospects`
 *     (`kixNewCase()` at portal.html line 8551, body
 *     `CreateProspectRequest` per `case_studio.py` line 96-110)
 *   - "📊 Open deck" CTA → HEAD `/landing/decks/<id>/index.html` then
 *     POST `/api/v1/portal-admin/case-studio/prospects/<id>/render-deck`
 *     (`kixOpenDeck()` at portal.html line 8505)
 *   - "↻ Regenerate" CTA → POST same `/render-deck` endpoint, always
 *     re-renders (`kixCasesRegenerate()` at portal.html line 8526)
 *   - Detail panel — there is no in-app detail surface yet; the per-
 *     prospect deep profile only exists as the rendered HTML deck.
 *   - Hero gradient feature card (lines 1739-1743) — pure copy, no data.
 *
 * @see src/views/kix/Cases.vue
 */
export const listCases = () =>
  http.get<CasesListResponse>('/api/v1/portal-admin/case-studio/prospects')
