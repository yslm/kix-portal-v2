# kix-portal-v2 — Progress Log

> Sibling to `kix-platform`. Plan + Spec live in:
>
> - `kix-platform/docs/superpowers/specs/2026-06-11-portal-vue-migration-design.md`
> - `kix-platform/docs/superpowers/plans/2026-06-11-portal-v2-week1-foundation.md`
>
> Trinity decision logs: `~/.claude/trinity-logs/2026-06-11.md` (Entry 1 + Entry 2)

---

## Week 1 (2026-06-11): Foundation — STATUS

**Overall: PASS** (9/9 acceptance criteria pass; one PARTIAL caveat captured in §Known issues — see #1)

### Acceptance checklist results

| # | Criterion | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Dev server boots | PASS | `Local:` count = 1, served at `http://localhost:3006/portal/`, Vite 7.1.7 ready in 668 ms |
| 2 | Token guard redirects | PASS | `tokenGuard.spec.ts` 4/4 pass (vitest 4.1.8, 479 ms) |
| 3 | Admin shell + 29 nav | PASS | `kixMenu.ts` — 36 `path:` entries + 36 `meta:` entries (7 groups + 29 leaves = 36) |
| 4 | Placeholder per route | PASS | `portal-routes.ts` — `component: Placeholder` count = 29 |
| 5 | i18n switcher | PASS | `i18n-smoke.spec.ts` 4/4 pass (vitest 4.1.8, 497 ms) |
| 6 | RTL on `?lang=ar` | PASS | `index.html` — 1 RTL langs list (`ar/he/fa/ur`) + 2 `documentElement.setAttribute` calls |
| 7 | `/games` API smoke | PASS | Files present (`games.ts`, `http.ts`, `types.ts`); proxy probe `GET /api/v1/portal-admin/brand-games?brand=demo` → HTTP 422 with KiX FastAPI validation body (`{"detail":[{"type":"int_parsing","loc":["query","brand"]...}]}`). Vite proxy ↔ KiX backend chain reaches the upstream — but successful response handling for raw JSON is NOT verified (see Known issue #1) |
| 8 | `pnpm build` → `/portal/` | PASS | Build OK in 12.54 s; `dist/index.html` has 3 `/portal/` refs |
| 9 | `pnpm sync:locales` | PASS | `✓ Synced 398 locale files`; 19 locale dirs present (ar-EG, ar-SA, de-DE, en-MY, en-SG, en-US, es-ES, fr-FR, he-IL, id-ID, ja-JP, ko-KR, ms-MY, pt-BR, th-TH, vi-VN, zh-Hans, zh-Hans-CN, zh-Hans-SG) |

### Commit chain (10 commits on `feat/foundation`)

| Task | Commit  | Subject                                                              |
| ---- | ------- | -------------------------------------------------------------------- |
| T1   | 8976526 | chore: rename package to kix-portal-v2 + add VENDOR.md               |
| T2   | 775a760 | feat: point env vars at KiX backend                                  |
| T3   | 1b0016a | feat(i18n): cross-repo sync script + portal-layer overrides          |
| T4   | 38399c1 | feat(router): port portal.html token guard to vue-router             |
| T5   | 64e7d9b | feat: port RTL pre-flight from portal.html                           |
| T6   | 9ca4aba | feat(http): wire axios to KiX token + 401 redirect                   |
| T7   | 8a5e55a | feat(router): wire 29 KiX view routes (placeholder-backed)           |
| T8   | 7573a0c | feat(menu): KiX sidebar — 7 groups, 29 leaf items                    |
| T9   | 9f0638b | feat(api): first KiX API endpoint wired end-to-end                   |
| T10  | cf42cc5 | chore: gitignore build artifacts and fix tsconfig for @locales alias |

### Known issues / deviations (carry into Plan 2)

1. **art-design-pro http envelope mismatch (CRITICAL for Plan 2 T1)**
   - art-design-pro's response interceptor expects `BaseResponse<T> = { code, msg, data }`, unwraps `res.data.data` after checking `code === ApiStatus.success`
   - KiX backend returns raw JSON, no `code` envelope
   - Real `listBrandGames` (and any subsequent endpoint) will fail at the interceptor
   - Task 9 smoke (HTTP 422 from FastAPI) proves the proxy chain reaches the backend, but does NOT prove successful response unwrapping
   - Resolution options (decide in Plan 2 T1):
     - (a) Patch `src/utils/http/index.ts` to bypass the envelope check for `/api/v1/portal-admin/*` paths
     - (b) Strip the envelope entirely (cleanest, but may need to adapt art-design-pro's own demo endpoints too — though most have been gutted in Task 8)
     - (c) Wrap KiX API calls in a separate axios instance that doesn't run that interceptor
   - art-design-pro's http API surface: `get(config)` (single arg) returning unwrapped `Promise<T>`, NOT raw axios — Plan 2 first endpoint will need to adapt

2. **Menu config path drift** — Plan 1 originally assumed `src/config/menu.ts`; actual location was `src/store/modules/menu.ts` + `src/router/core/MenuProcessor.ts`. Subsequent plans should treat documented paths as approximate; always grep first.

3. **SSOT locales structure** — per-locale dir × per-namespace JSON (NOT flat `en.json` / `zh.json`). Adapted via `import.meta.glob`. Plan 3 (P1 view migrations) should be aware when wiring view-specific i18n.

4. **Demo views still on disk** — `src/views/dashboard/`, `src/views/template/`, etc. unreachable but uncleaned (Task 8 only hard-deleted route modules). Schedule cleanup in Plan 4 (P2 views) when removing every art-design-pro idiom.

5. **Build size** — dist 9.5 MB, largest chunk 1.72 MB (gzip 571 KB), echarts chunk 748 KB (gzip 244 KB). Acceptable for Plan 1; optimization target for Plan 5 (manual chunks for echarts / element-plus / xlsx / monaco).

6. **lint-staged auto-reformatting** — every commit is reformatted by prettier + ESLint. Authors should commit raw drafts and let hooks adjust.

7. **Vite port falls over to 3007** — when 3006 is occupied. Non-blocking; tests/scripts should grep `Local:` from the dev log to pick the actual port. (Acceptance 1 + 7 used 3006 cleanly.)

### Calibration for Plan 2 (week 2-3: P0 view migrations)

- **Estimated wall-clock for T1 (http contract align):** 1-2 hours. Critical path; do this BEFORE any real view.
- **Per-view migration template:** read old portal.html section → extract API calls + UI structure → write `src/views/kix/<view>.vue` → wire to existing route in `portal-routes.ts` → add view-specific i18n keys to `locales/portal/` if needed → smoke test against backend.
- **P0 views:** overview, games, builder, campaigns, settings — pick the lightest one first (probably `settings` or `overview`) to validate the per-view template.
- **Watch for:** art-design-pro idioms that conflict (their store patterns, their auto-import quirks, ElMessageBox vs custom dialogs). Document each so we don't relearn.

---

## Future weeks

(Plan 2-5 progress will append below as work completes.)
