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

## Week 2 (2026-06-11): HTTP envelope fix + Overview

**Status: PASS**

### Commits

- 4810cc6 feat(http): dedicated kixHttp instance — no BaseResponse envelope
- 8948b14 feat(views): migrate overview (first real P0 view)

### Result

- envelope mismatch (Plan 1 Known Issue #1) fully resolved
- Overview view renders live-cards from real backend (HTTP 200 verified)
- 15/15 tests pass

## Week 3: P0 helpers + 4 remaining P0 views (Settings/Campaigns/Games/Builder)

**Status: PASS**

### Commits

- 1db34fc feat(utils): extract fmtSgd + resolveBrandId
- e99e7bf feat(views): migrate settings — brand profile
- d7734af feat(views): migrate campaigns — list
- b3daf7c feat(views): migrate games — my-games grid
- 1153ff1 feat(views): migrate builder — entry view only

### Result

- All 5 P0 views shipped
- 40/40 tests pass
- Deferred: each view's secondary sub-sections (documented per-commit)

## Week 4: StatusBadge + 6 P1 views

**Status: PASS**

### Commits

- dd4c899 feat(components): extract StatusBadge
- 982357c feat(views): migrate flows
- f20f517 feat(views): migrate reports
- e4bdb1b feat(views): migrate customer-list
- be11e62 feat(views): migrate audiences
- e6b5020 feat(views): migrate ab-tests
- 6b8fef5 feat(views): migrate rules

### Result

- 6 P1 views shipped; 11/29 routes real
- 71/71 tests pass

## Week 5: P2 audit + curated 7 views + Rewards consolidation

**Status: PASS**

### Audit decision (2026-06-11)

Original spec had 19 P2 views; audit recommended subtraction:

- KEEP: templates, cases, vip-tiers, storefront, billing (+invoices), geofences, creatives
- CONSOLIDATE: vouchers + coupons-qr + game-rewards + prizes → single /rewards
- DROP/DEFER: primitives, cohort, attribution, pixel, operations, messages Final sidebar: 19 entries (down from 29).

### Commits

- 1aaebb3 chore: P2 audit cleanup — rename ab-tests, prune sidebar
- 433c9a4 feat(views): migrate templates
- 151e2d1 feat(views): migrate cases
- d25eb73 feat(views): migrate vip-tiers
- edee607 feat(views): migrate storefront
- 37a440e feat(views): migrate billing (+ invoices)
- bd199c4 feat(views): migrate geofences
- b7249ad feat(views): migrate creatives
- 090f342 feat(views): migrate rewards — consolidated 4-tab view

### Result

- 18 real views (P0:5 + P1:6 + P2:7) of 30 total routes
- 110/110 tests pass

## Week 6: E2E + cutover preparation

**Status: PASS**

### Commits

- 1c92528 docs(PROGRESS): Plan 2-5 retrospective + Plan 7 hold
- f519e42 chore(e2e): install + configure Playwright
- b7e6782 feat(e2e): smoke tests for token guard + P0 views
- 78894f0 docs: README quickstart + DEPLOY.md SOP

### Result

- 110/110 vitest pass + 6/6 playwright e2e pass
- README quickstart + DEPLOY.md cutover SOP shipped
- Plan 7 cutover documented; held pending user approval

## Week 7: Overview deepening (in progress)

**Status: ACTIVE — T0/T1/T2 of 7 done; T2 pending user visual review when session resumes**

Plan file: `kix-platform/docs/superpowers/plans/2026-06-11-portal-v2-week7-overview-deepening.md`

Plan 7 was originally "Production cutover (HELD)" (now moved to § Future below). After Plan 6 user visual review, the cadence was redefined: each view needs MULTIPLE sub-sections, not just 1 thin slice. Overview goes first as the pacing template — if 1-week works for 9 sections of Overview, the same per-view deepening applies to the other 17 views in Plan 8+.

Each task = one sub-component under `src/views/kix/overview/`, composed into `Overview.vue`. User does visual review after each task; subagent-driven-development cadence (implementer → spec reviewer → code-quality reviewer → fix loop → visual review).

### Commits (this stream)

| Task | Commit  | Subject                                                                       |
| ---- | ------- | ----------------------------------------------------------------------------- |
| T1   | 2f9a1d4 | feat(overview): setup guide card                                              |
| T0¹  | 3f76d0e | fix(http): kixHttp 401 honors ?brand= demo bypass (symmetric with tokenGuard) |
| T0¹  | bd718ae | refactor(http): tighten kixHttp 401 demo-bypass JSDoc + harden test isolation |
| T2   | 520cce2 | feat(overview): NBA suggested next move card                                  |
| T2   | 50c4606 | fix(overview): NBA card uses S$ for SGD (was ¥ from legacy)                   |
| T0²  | 613bacc | fix(layout): populate sidebar menu for KiX portal — decouple from isLogin     |
| T3   | 6fc11a4 | feat(overview): status strip — wallet / new-7d / live campaigns / runway      |
| T3   | 15a565e | test(overview): drop inert el-card stub from StatusStrip spec                 |
| T3.5 | c2e1660 | refactor(overview): extract useNonCriticalCard — dedupe 3-card load pattern   |

² T0 = off-plan fix surfaced during T2 visual review. User reported "the portal looks nothing like art-design-pro — no left sidebar." Root cause: portal-v2 IS an art-design-pro fork (the perceived gap was wrong); the sidebar was empty because art-design-pro only fills `menuStore` inside its login-gated dynamic-route flow (`beforeEach` → `handleDynamicRoutes`, guarded by `userStore.isLogin`), and KiX authenticates via its own `tokenGuard` and never sets `isLogin`. So `menuList` stayed `[]` and `art-sidebar-menu` hid the whole tree (`v-show="menuList.length > 0"`). Fix: `ensurePortalMenu()` (idempotent, frontend-static) called from `App.vue onBeforeMount`, decoupled from `isLogin`.

A SECOND report ("stuck on /auth/login") was NOT a code bug — it was stale browser state at the :3007 fallback port. Fresh-context repro: 9/9 clean (3 entry URLs + 6 cold loads), 0 bounces. Settled via headless Playwright + a one-variable test, not guessing.

Hardened `e2e/p0-views.spec.ts` along the way: it used a fake `kix_token` (invalid → 401 → redirects to signin before the view renders) and only checked body-non-empty, so it passed even on a redirected auth page. Switched to the `?brand=demo` contract + added URL-reachability and sidebar-renders assertions. Also registered `unplugin-auto-import` + `__APP_VERSION__` in `vitest.config` so tests can import real app modules.

¹ T0 = off-plan hotfix. T1 SetupGuideCard was the first call into `/api/v1/portal-admin/*` from a demo-reachable view, exposing a Plan 1 latent asymmetry: `tokenGuard` honored `?brand=` bypass, but `kixHttp`'s 401 interceptor did NOT — so a 401 from any portal-admin endpoint kicked demo users back to signin before the calling component's try/catch could swallow it. Fixed before T2 because T2-T7 all hit portal-admin endpoints; without T0 every one would re-break demo mode.

### Result so far

- Tests: 122/122 vitest (was 110 after Week 6; +1 tokenGuard hotfix d66f92e, +3 kixHttp demo branch, +5 SetupGuideCard from T1, +5 NbaCard from T2 — also passes `--sequence.shuffle` for kixHttp.spec).
- TS: zero new errors from this stream (pre-existing 59 vue-tsc SFC module errors unchanged; +1 trivial structural error for the new `.vue` file, same shape as every existing v2 .vue).
- Demo mode (`?brand=` BEFORE the hash) verified end-to-end at the kixHttp layer via unit tests: tokenGuard pass → cards mount → 401 → kixHttp rejects without redirect → card try/catch swallows → silent hide. Setup guide and NBA cards both fail-soft.
- Push state: **last pushed = 2f9a1d4 (T1).** Four commits unpushed locally: 3f76d0e, bd718ae, 520cce2, 50c4606. Push when convenient.

### Next: visual review T2 + dispatch T3

When session resumes:

1. **First — visual review T2** (Task #4 in the TodoWrite stream): `cd /Users/yangshenlin/work/gimifacation-paltorm/kix-portal-v2 && pnpm dev` → open `http://localhost:3006/portal/?brand=demo` (note: `?brand=demo` MUST sit BEFORE the hash — see § Demo-mode contract). With no token, both Setup guide and NBA cards should silently hide (401 fail-soft). To eyeball the NBA card's actual rendering, either (a) sign into a real KiX env to get a token, (b) ask the controller to write a vite mock middleware for the two endpoints, or (c) skim `src/views/kix/overview/__tests__/NbaCard.spec.ts` line 48-95 for the rendered text snapshots.
2. **Then — T3 Status strip** (Plan 7 line 27/204): `src/views/kix/overview/StatusStrip.vue` + `/api/v1/portal-admin/overview` (Reports leg). Wallet balance + 7-day new customers + active campaigns + budget used. Layout target: TOP row of Overview (above the SetupGuide/NBA middle row). Same per-task template as T1/T2.

### Demo-mode contract (carry forward — important for T3-T7)

`?brand=demo` MUST sit BEFORE the hash: `host/portal/?brand=demo#/overview`. The form `host/portal/#/overview?brand=demo` survives `tokenGuard` (which can also read vue-router's parsed `to.query.brand`) but NOT `kixHttp`'s 401 path (which only has `location.search`). This asymmetry is documented in the JSDoc above `kixHttp`'s response interceptor (commit bd718ae). Don't try to "fix" by reading the hash inside the interceptor — legacy portal.html's contract is exactly this, and the test at `src/utils/http/__tests__/kixHttp.spec.ts` pins both halves.

### Deferred follow-ups (NOT blocking T3, but reduce future surprises)

1. **Currency normalization audit** — T2 reviewer found `¥` in legacy `KIX_NBA_COPY.upgrade_break_even.body`, fixed locally in v2. Before T3-T7 implementation, sweep `kix-platform/landing/portal.html` for other `¥` / hardcoded-currency strings so they don't quietly propagate into v2 sub-components. Cheapest moment is during each section's audit step.
2. **Extract `getKixToken()` helper** — `localStorage.getItem('kix_token') || localStorage.getItem('kix_portal_token')` is now in 3 places (`kixHttp` request, `kixHttp` response, `tokenGuard`). Rule-of-three triggered. 2-line helper, low risk, do anytime.
3. **Card `handleCta` fallback divergence** — `SetupGuideCard` returns early when `routeFor(view)` is null; `NbaCard` falls back to `/overview`. Align before T4 (probably toward NbaCard's fallback since the CTA is always rendered, never conditionally).
4. **`Object.prototype.hasOwnProperty.call(NBA_COPY, a.id)` → `a.id in NBA_COPY`** — janitorial. Defensive form is unnecessary for static literal keys; legacy `KIX_NBA_COPY[a.id]` truthy check is closer to the reference.
5. **NbaCard test #1 splits + add `view: undefined` coverage** — janitorial.

6. **Extract `useNonCriticalCard(fetcher)` composable** — DONE (T3.5 · c2e1660). `src/hooks/kix/useNonCriticalCard.ts` returns `{ loading, error, data, visible, reload }` with the error-swallow baked in; each card supplies its extra visibility predicate via `options.isReady`. SetupGuide/NBA/StatusStrip migrated. Behavior-preserving: the 3 card spec files are byte-identical and still green; +8 composable tests; full suite 135. Reviewer walked SetupGuideCard's full truth table — no diverging input. T4+ cards use it.
7. **art-design-pro `axiosInstance` (`src/utils/http/index.ts`) has the same 401 asymmetry as kixHttp had before T0** — portal-admin doesn't route through it today, so non-blocking. Harden symmetrically if a future code path under demo mode ever uses it.
8. **`?brand=` in hash branch in kixHttp** — UNSUPPORTED on purpose (no Route context in interceptor). If a UX need surfaces ("merchant pasted a hash-internal demo link and got kicked"), revisit by passing `to.query` through to a request-config flag, NOT by parsing the hash inside the interceptor.

### Quick command reference

```bash
cd /Users/yangshenlin/work/gimifacation-paltorm/kix-portal-v2

pnpm dev                                    # Vite dev server on :3006
pnpm vitest run                             # full suite (expect 122/122)
pnpm vitest run --sequence.shuffle          # confirm no test-order coupling
pnpm tsc --noEmit                           # expect ~60 pre-existing errors, ZERO new
pnpm build                                  # production bundle to dist/

git log --oneline -10                       # see commit stream
git push                                    # push the 4 unpushed local commits
```

---

## Future: Production cutover (HELD — deferred until view deepening complete)

Originally Plan 7. Now deferred to after all view-deepening passes finish (Week 7 Overview + Plan 8+ for the remaining 17 views) AND user signs off on visual parity per view.

Requires user approval. See `DEPLOY.md` for full SOP. Summary:

1. Build + deploy portal-v2 dist to `/portal/` on production nginx
2. Modify `kix-platform/landing/signin.html` to redirect to portal-v2 by default
3. Monitor 401/5xx for 1-2 weeks
4. Archive `kix-platform/landing/portal.html` → `_archive/`

Rollback: revert signin.html redirect; portal-v2 keeps serving.
