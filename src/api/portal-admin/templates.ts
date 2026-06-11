import { http } from './http'
import type { TemplatesListResponse } from './types'

/**
 * Portal admin · Templates (game catalog) view API.
 *
 * Mirrors the legacy `kixLoadTemplates()` fetcher in
 * `kix-platform/landing/portal.html` (~line 8235), which calls
 *   `fetch(KIX_STUDIO_API + '/templates?limit=…&offset=…&reskin_only=…')`
 * where `KIX_STUDIO_API = '/api/v1/portal-admin/games'` (line 3833). The
 * templates list therefore lives at `/api/v1/portal-admin/games/templates`
 * — it hangs off the games router rather than getting its own
 * `/portal-admin/templates` namespace. Brand identity is inferred from
 * the JWT (no explicit `?brand=` param), same pattern as
 * `listCustomers()` / `listAudiences()` / `listAbTests()` / `listRules()`.
 *
 * The legacy code paginates with `limit + offset + reskin_only`. Plan 5
 * T1 ships a single-page first cut (no pagination, no filter chips), so
 * the v2 caller sends no query params and relies on the server's default
 * page size. The richer pagination + filtering surface is DEFERRED.
 *
 * Plan 5 T1 deferred items (still served by the legacy view):
 *   - Filter chips: "Ready to generate" / "Browse full catalog"
 *     (`kixSetTemplateFilter()` at portal.html line 1757-1758)
 *   - Sort dropdown: popular_vertical / highest_roi / best_for_new /
 *     trending (`kixApplyTemplateSort()` at portal.html line 1766)
 *   - Per-card rank badge + community ranking signals + peer counts
 *     + star ratings (`_kixSeedSignals()`)
 *   - Detail panel + "Try demo" iframe modal (`kixOpenGameDetail()`,
 *     `kixOpenDemo()` at portal.html lines 8275, 8344)
 *   - "Load more" pagination button + offset accumulator
 *   - Nano-Banana cover hydration (`kixHydrateCovers()`) — SVG covers
 *     stay client-side fallbacks; the v2 view renders `cover_url` raw
 *
 * @see src/views/kix/Templates.vue
 */
export const listTemplates = () =>
  http.get<TemplatesListResponse>('/api/v1/portal-admin/games/templates')
