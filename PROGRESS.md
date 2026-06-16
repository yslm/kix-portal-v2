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

## Week 7: Overview deepening — COMPLETE (2026-06-12)

**Status: DONE — all 9 Overview sections shipped, reviewed, pushed. User approved the art-design-pro card visual direction. See "Resume here next time" below.**

Plan file `kix-platform/docs/superpowers/plans/2026-06-11-portal-v2-week7-overview-deepening.md` NO LONGER EXISTS (the kix-platform plans dir is empty). Task specs were reconstructed from PROGRESS + the legacy `kix-platform/landing/portal.html` source. Don't rely on the plan file path above.

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
| T4   | c04c059 | feat(overview): metric cards — impressions / plays / verified-new / spent-CPA |
| T4   | 8a677f2 | test(overview): harden MetricCards spec + tighten delta_direction type        |
| dev  | 7740655 | chore(dev): portal-admin mock middleware + dev:mock for visual review         |
| T4.5 | a12a0e8 | style(overview): restyle metric cards + status strip to art-design-pro look   |
| T5   | da2a1da | feat(overview): active campaigns table (native ElTable + demo mock)           |
| T5   | 2692957 | test(overview): cover {items} normalization + assert view-all route           |
| T6-8 | 461e2cb | feat(overview): 14-day new-customers chart + audience donut + live activity   |
| T6-8 | (fix)   | fix(overview): AudienceDonut passes :colors (plural) to ArtRingChart          |

**Overview deepening COMPLETE** — all 9 sections shipped (live-cards, setup-guide, NBA, status-strip, metric-cards, campaign-table, 14-day chart, audience donut, live activity). Each self-hides fail-soft; demo-mode visual review via `pnpm dev:mock`. The per-view deepening template is now proven end-to-end. Tests 161/161.

² T0 = off-plan fix surfaced during T2 visual review. User reported "the portal looks nothing like art-design-pro — no left sidebar." Root cause: portal-v2 IS an art-design-pro fork (the perceived gap was wrong); the sidebar was empty because art-design-pro only fills `menuStore` inside its login-gated dynamic-route flow (`beforeEach` → `handleDynamicRoutes`, guarded by `userStore.isLogin`), and KiX authenticates via its own `tokenGuard` and never sets `isLogin`. So `menuList` stayed `[]` and `art-sidebar-menu` hid the whole tree (`v-show="menuList.length > 0"`). Fix: `ensurePortalMenu()` (idempotent, frontend-static) called from `App.vue onBeforeMount`, decoupled from `isLogin`.

A SECOND report ("stuck on /auth/login") was NOT a code bug — it was stale browser state at the :3007 fallback port. Fresh-context repro: 9/9 clean (3 entry URLs + 6 cold loads), 0 bounces. Settled via headless Playwright + a one-variable test, not guessing.

Hardened `e2e/p0-views.spec.ts` along the way: it used a fake `kix_token` (invalid → 401 → redirects to signin before the view renders) and only checked body-non-empty, so it passed even on a redirected auth page. Switched to the `?brand=demo` contract + added URL-reachability and sidebar-renders assertions. Also registered `unplugin-auto-import` + `__APP_VERSION__` in `vitest.config` so tests can import real app modules.

¹ T0 = off-plan hotfix. T1 SetupGuideCard was the first call into `/api/v1/portal-admin/*` from a demo-reachable view, exposing a Plan 1 latent asymmetry: `tokenGuard` honored `?brand=` bypass, but `kixHttp`'s 401 interceptor did NOT — so a 401 from any portal-admin endpoint kicked demo users back to signin before the calling component's try/catch could swallow it. Fixed before T2 because T2-T7 all hit portal-admin endpoints; without T0 every one would re-break demo mode.

### Final result (end of session 2026-06-12)

- Tests: **161/161 vitest** (was 122 mid-session); **e2e 7/7**.
- TS: `pnpm tsc --noEmit | grep -cE "error TS"` = 66 — all pre-existing `.vue` TS2307 module-resolution noise (one per spec file); **zero new production errors** from this stream.
- Push state: **fully pushed.** `feat/foundation` HEAD = `acca29c`. Nothing unpushed.
- Every section went through subagent cadence (implementer → spec review → quality review → fix). The quality reviews caught real issues: a false-positive test (T4), and a runtime bug (AudienceDonut `:color` vs `:colors` — donut was dropping brand colors silently, commit 32c9abf).

### ▶ RESUME HERE NEXT TIME (paused 2026-06-12)

**Where we are:** Overview is fully deepened and looks native to art-design-pro. The per-view deepening _template_ is proven end-to-end. Two big tracks remain toward the user's goal ("把原 portal 内容都搬过来" — migrate ALL original portal content):

- **(A) Breadth — deepen the other ~17 views.** Most are 1 thin section today; ~12 are still bare `Placeholder`. Apply the Overview template to the content-heavy main views first (Reports, Campaigns, Games, Builder, Customers). User leaned toward starting with **Reports**, but no view was committed — confirm with user before starting.
- **(B) Batched styling pass.** User explicitly said styling will be adjusted _together later_ ("后续一起来改样式"). When several views are deepened, do one pass unifying every migrated view (incl. the OLD hand-rolled tables like `Campaigns.vue`) onto the `.art-card` / `ArtTable` / `text-success·danger` / `bg-theme·text-theme` language.

**The reusable template (how each section was built — repeat this):**

1. add `fetchX` to `src/api/portal-admin/<view>.ts` + type to `types.ts`
2. component under `src/views/kix/<view>/` using `useNonCriticalCard(fetchX, { isReady })` from `src/hooks/kix/useNonCriticalCard.ts` (self-hides on loading/error/empty)
3. reuse art-design-pro components: `ArtLineChartCard` / `ArtRingChart` (N-seg donut, pass `:colors` PLURAL) / `ArtDataListCard` / `ElTable` / `.art-card` + `bg-theme/10 text-theme` icon squares (canonical stat-card ref: `src/views/dashboard/console/modules/card-list.vue`)
4. add a demo payload to `src/mock/portalAdminMock.ts` so visual review works
5. compose into the view; add a TDD spec; run the subagent cadence (implementer → spec review → quality review → fix). The quality review pass is EARNING ITS KEEP — keep it.

**Visual review workflow (KEY — cards self-hide without data):**

```bash
cd /Users/yangshenlin/work/gimifacation-paltorm/kix-portal-v2
pnpm dev:mock        # VITE_PORTAL_MOCK=1 — serves demo payloads for /api/v1/portal-admin/*
# open (incognito to avoid stale state): http://localhost:3006/portal/?brand=demo#/overview
```

The portal-admin endpoints are JWT-gated → 401 in demo → cards fail-soft hide. `dev:mock` (commit 7740655, `src/mock/portalAdminMock.ts`) returns demo data so you can SEE them. Plain `pnpm dev` and production build are unaffected.

**Verify commands:** `pnpm vitest run` (expect 161+), `pnpm tsc --noEmit 2>&1 | grep -cE "error TS"` (baseline ~66, all `.vue` spec noise — zero new production errors is the bar), `pnpm e2e` (7/7).

**Open visual nits (fold into the styling pass):**

- Metric card "Spent · CPA" — its long value (`S$1,800 · S$8.41`) crowds the right-side icon square on narrow 4-col widths. User said "good enough" for now; fix in styling pass (truncate / hide icon when value long / drop to 3 cols).
- `Campaigns.vue` (and other early views) still use hand-rolled `<table>` + `bg-white border` — upgrade to the native look in the styling pass. NOTE: its `spendCell` prefers `spend_sgd` while the new Overview `CampaignTable` prefers `spend_str` (per-spec) — reconcile then.

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

## Week 8: Reports deepening (2026-06-13)

**Status: IN PROGRESS — 3 of the legacy Reports sub-sections shipped, reviewed (headless), committed. First application of the Overview per-view deepening template to a second view; it transfers cleanly.**

Picked Reports as the next view (highest reuse of the Overview chart/table/card components; no known field wrinkles). The legacy `<section id="view-reports">` (portal.html lines 1960-2082) had an already-shipped Owner-summary card + 3 advanced tabs. This session ported the sub-sections that have a REAL backend source — verified against `kix-platform/app/routers/portal_admin.py` before writing any fetcher.

### Commit

- c85109d feat(reports): deepen Reports — top-campaigns / funnel / live-monitor

### Shipped sub-sections (all under `src/views/kix/reports/`, self-hiding via `useNonCriticalCard`)

| Section | Component | Endpoint (real) | Notes |
| --- | --- | --- | --- |
| Performance · Top campaigns by ROAS | `TopCampaignsTable.vue` | `GET /reports/top-campaigns` | native ElTable in `.art-card`; Campaign·Spend·Conv·ROAS. Real-brand nulls → em-dash (attribution-not-ready is honest) |
| Engagement · funnel | `FunnelChart.vue` | `GET /reports/funnel?source=true` | 6-step horizontal bar funnel + per-step conversion %. Hides until a non-zero funnel exists |
| Live monitoring · "Live now" | `LiveMonitor.vue` | composed `fetchLiveMonitor()` = `/monitoring/live` + `/ops/today` | partial-tolerant fan-out (`.catch→null` per leg). 4 tiles: Plays/min · Plays today · Redemptions today · New customers today |

### NO-FAKE-DATA decisions (verified against backend before building)

- **KPI grid** (Total spend / Conversions / Avg CPA / ROAS): legacy HARDCODED these; `GET /reports/sources` returns only data-provenance metadata, NOT values. No dedicated endpoint → **NOT shipped**. Reuse Overview's `/metrics` if wanted later.
- **Heat-by-hour heatmap**: legacy was a pure client-side `Math.sin` decoration, no backend → **DROPPED**.
- **Live-monitoring p95-latency / error-rate tiles**: legacy hardcoded; `/monitoring/live` only returns `{plays_today, plays_per_min}` → **DROPPED**, kept the 2 real metrics + folded in `/ops/today`.

### Result

- Tests **180/180** (was 161 at session start; +19: 5 TopCampaigns + 6 Funnel + 4 LiveMonitor.vue + 4 fetchLiveMonitor api).
- tsc: zero new production errors (+3 vs baseline 66 = three new `.vue` spec module-resolution noise, per the documented pattern).
- Headless Playwright visual review (`?brand=demo#/reports`) confirmed all 4 sections render (owner card + 3 new); screenshot looked native to art-design-pro.
- Demo payloads added to `portalAdminMock.ts` for every new endpoint + the two previously-missing owner-card legs (`/redemptions/today`, `/customers/rfm-summary`) so the owner card now shows 63/24/40 under `dev:mock`.

### Reports — still deferred (carry forward)

- **Tabs vs stacked**: legacy Reports used 3 tabs (Performance/Engagement/Live monitoring) + a simple/advanced mode toggle. v2 currently STACKS all sections vertically (matching Overview). If the page feels long once fully populated, wrap in `ElTabs` in the styling pass — but stacked + self-hiding works fine today.
- **Export CSV** button (advanced-mode only; `GET /reports/export.csv` exists) — not ported.
- **Attribution report** (`GET /reports/attribution`) — separate legacy feature, not in the original Reports section scope.
- **Owner-report "reading" plain-language line** (`#own-reading`) — still deferred from the original Reports T2.

### ▶ RESUME HERE (Reports track)

Reports has 3 solid new sections + the owner card. Next candidates by the same template + remaining-data audit:

- **Next view to deepen**: Campaigns / Games / Builder / Customers are still 1-thin-section. Apply the same template. (Reconcile `Campaigns.vue`'s `spend_sgd`-first vs the new tables' `spend_str`-first during the eventual styling pass — noted in Week 7.)
- **(B) Batched styling pass** still pending (user: "后续一起来改样式") — now has Overview + Reports deepened to unify together.

---

## Week 8b: Campaigns rebuild — first ArtTable + art-design-pro restyle (2026-06-13)

**Status: DONE — Campaigns view rebuilt onto native art-design-pro components, headless-reviewed, committed.**

This is the FIRST view to use the real `ArtTable` (column-config + formatters) instead of a hand-rolled `<table>` or raw ElTable — the answer to the user directive "和 art design pro 组件模板做对比,按他们的组件样式美化". It establishes the restyle pattern for the batched styling pass (Week 7 track B).

### Commit

- fa70d37 feat(campaigns): rebuild onto ArtTable + KPI strip + filter toolbar

### What shipped

- **KPI summary strip** — canonical card-list anatomy (`.art-card relative flex flex-col justify-center` + `bg-theme/10 text-theme` `size-12.5` icon square, same as Overview MetricCards / `dashboard/console/modules/card-list.vue`): Total campaigns / Active now / Total spend / New customers, all honest aggregates of real fields.
- **Filter toolbar** — status segmented control (All/Active/Paused/Pending/Ended) + name search (`ElInput`) + "+ Create campaign" `ElButton` → `/builder`. Client-side filter over the loaded list (legacy bars were decoration; backend supports `?status=` but list is small → one round-trip).
- **ArtTable** — globally auto-registered (`ArtTable`/`ArtTableHeader`/`ArtStatsCard` in `src/types/import/components.d.ts`). columns via `ColumnOption[]` + `formatter` returning VNodes; native pagination footer (client-side slice). Columns: Status badge · Campaign (name + objective·game_type) · Spend · Impressions · Plays · New customers · CPA · CTR.

### NO-FAKE-DATA reconciliation (verified vs backend `class Campaign` ~portal_admin.py:168)

Real model: `spend_sgd / impressions / plays / new_customers / cpa_sgd / ctr_pct / game_type / reward / schedule / audience_name`. The legacy frontend used aliases (`spend_str / conversions / cpa_str`) that the demo mock + Overview CampaignTable still read.

- Pure helpers in `src/views/kix/campaigns/campaignsModel.ts` (unit-tested, 14 cases) prefer the REAL field, fall back to the alias, em-dash when neither — so both shapes render and nothing is fabricated.
- **Dropped the legacy "Budget" column** — backend has NO budget field (was always an em-dash).
- Surfaced real fields the old table ignored: `plays`, `game_type`.
- `Campaign` type extended additively (optional real fields) — Overview CampaignTable untouched. Demo `/campaigns` mock now carries BOTH real fields + aliases so both views render.

### Result

- Tests **197/197** (+17 vs Reports session: 14 model + 3 net on Campaigns spec rewrite). tsc zero new production errors.
- Headless Playwright (`?brand=demo#/campaigns`): KPIs 4 / 2 / S$1,815 / 830; 4 rows; "Active" filter → 2 rows; all 8 columns fit (trimmed widths after first screenshot clipped CTR). Looks fully native to art-design-pro.

### Reusable restyle pattern (for the rest of the views)

1. Extract pure logic (normalize / KPIs / filter / field-accessors) to a `<view>/<view>Model.ts` — unit-test it (no mount).
2. KPI strip = card-list anatomy. Main list = `ArtTable` + `ColumnOption[]` + `formatter` VNodes (auto-registered, no import). Toolbar = segmented filter + `ElInput` search + `ElButton` CTA.
3. Reconcile fields against the REAL backend model BEFORE building; drop columns with no real source; prefer real field + alias fallback + em-dash.
4. Component test stubs `ArtTable`/`ArtSvgIcon`/`ElInput`/`ElButton`; assert wiring (data→table, filter, CTA, states). Heavy logic covered by the model spec.
5. Enrich the demo mock with real fields; headless-screenshot at 1280px to catch column clipping.

### ▶ RESUME HERE (breadth track)

Campaigns is the proven ArtTable restyle template. Remaining single-thin views to give the same treatment: **Games / Builder / Customers / Flows / Audiences / AbTests / Rules**, plus the P2 set. Reconcile the OLD `CampaignTable.vue` (Overview) + `TopCampaignsTable.vue` (Reports) — they read the alias fields; now that the mock + type carry the real fields, they could move to real-field-first too (low priority; they render fine).

---

## Week 8c: Games rebuild — art-design-pro card gallery (2026-06-13)

**Status: DONE — gallery + KPIs + actions shipped, headless-reviewed, committed. Smart-Recommend creation wizard explicitly DEFERRED.**

Second view through the restyle template (after Campaigns). Games is a card-gallery (not a table), so the art-design-pro centerpiece is polished `.art-card` game cards rather than ArtTable.

### Commit

- 8a3f6ca feat(games): rebuild gallery onto art-design-pro cards + KPI strip

### What shipped

- **KPI strip** (card-list anatomy): Total games / Active / Playable / Customizable — honest aggregates of real fields.
- **Game cards**: cover image when `cover_url` exists, else a deterministic **gradient+emoji fallback keyed by game type** (ports legacy `_KIX_COVER_PALETTE`: scratch🎟️/spin🎰/quiz❓/match🧩/puzzle🔍/arcade🎮/board♟️/card🃏/other🎲). Name (legacy fallback chain) + slug + status badge + Play/Customize.
- **Play** gated on a real play target (`play_url > game_file > unpacked_url`) → `window.open(_, '_blank')`. **Customize** gated on a real `order_id`.
- Empty-state hero + "+ Create game" CTA.

### Scope decision (deferred)

The **4-step Smart-Recommend creation wizard** (describe → real `/games/recommend` AI ranker → `/games/build` async build → poll `/games/orders/{id}` → launch checklist) and the embedded gamification **IDE Customize modal** are a large stateful/async feature, NOT "beautify an existing surface". Deferred as the next increment; "+ Create game" and Customize route to `/builder` for now. (Endpoints are real + production-ready per the explore — when picked up, it's a multi-component flow with polling + a 503 fallback for when sample_brander is down.)

### Result

- Pure logic in `games/gamesModel.ts` (11 unit cases); `Games.spec` rewritten (7). Tests **211/211** (+14). tsc zero new production errors.
- Headless (`?brand=demo#/games`): KPIs 5/2/4/2; 5 cards; 4 Play + 2 Customize buttons; gradient palette varies by slug. Looks fully native to art-design-pro.
- `BrandGame` type already carried every field — no type change needed. Demo `brand-games` mock added (no `cover_url` → exercises the gradient fallback).

### ▶ RESUME HERE (breadth track)

Done so far on the ArtTable/card restyle: **Campaigns** (ArtTable), **Games** (card gallery). Remaining single-thin views: **Builder / Customers / Flows / Audiences / AbTests / Rules** + P2 set. Customers is the next strongest ArtTable candidate. Plus two deferred features now logged: the Games Smart-Recommend wizard, and reconciling Overview `CampaignTable.vue` / Reports `TopCampaignsTable.vue` to real-field-first (low priority).

---

## Week 8d: Customers rebuild — ArtTable + segment filter (2026-06-13)

**Status: DONE — committed, headless-reviewed.** Third view through the restyle template (Campaigns → Games → Customers).

### Commit

- e104838 feat(customers): rebuild onto ArtTable + KPI strip + segment filter

### What shipped

- KPI strip (card-list anatomy): Total customers / Regulars / Total plays / Total redeems.
- Segment toolbar (All / ⭐ Regular / 🔁 Came back / ✨ New) + name/handle search, client-side.
- ArtTable: Customer (name/handle + colour-coded segment badge) · Channel · First seen · Plays · Redeems · Last activity + pagination footer.
- Segment ported VERBATIM from legacy `_seg()` (portal.html ~5118): `redeems>0 && plays>=5 → Regular; plays>=2 → Came back; else New` — derived only from real plays/redeems. Real row fields verified vs `_real_customer_rows` (handle/channel/first_seen/plays/redeems/last_active) → no type change needed.

### Result

- `customers/customersModel.ts` (12 unit cases) + `CustomerList.spec` rewritten (6). Tests **225/225**; tsc zero new production errors.
- Headless (`?brand=demo#/customer-list` — note the route is `/customer-list`, NOT `/customers`): KPIs 6/2/23/4; 6 rows; segment badges colour-coded; Regular filter → 2 rows. Native art-design-pro.

### ▶ RESUME HERE (breadth track)

ArtTable/card restyle done: **Campaigns · Games · Customers**. Remaining single-thin views: **Builder / Flows / Audiences / AbTests / Rules** + P2 set (Templates/Cases/VipTiers/Storefront/Billing/Geofences/Creatives/Rewards). Flows or Audiences are the next ArtTable candidates. Deferred features still logged: Games Smart-Recommend wizard; reconcile Overview/Reports campaign tables to real-field-first.

---

## Week 8e: Audiences / AbTests / Rules rebuilt onto ArtTable (2026-06-13)

**Status: DONE — committed, headless-reviewed. Session paused here; resume at Flows next week.**

Three more P1 list views through the restyle template (now 6 done: Campaigns · Games · Customers · Audiences · AbTests · Rules).

### Commit

- 7cbc17e feat(views): rebuild Audiences / AbTests / Rules onto ArtTable

### Per view

- **Audiences**: KPIs Total/Reach/Geofenced/Types; type filter; cols Audience·Type·Size·Geofence·Created·Last used.
- **AbTests**: KPIs Total/Running/Significant/Shipped; status filter; cols Test·A vs B·Metric·Lift(colour-coded ±)·p-value·Status.
- **Rules**: KPIs Total/On/Off/Notify; state filter; cols State·Rule·Condition·Action·Scope·Last triggered.

Each: pure `*Model.ts` (unit-tested) + rewritten view spec + demo mock. Wire shapes normalised per real wrappers (audiences|items / ab_tests|abtests|items / rules|automations|items). Tests **250/250**; tsc zero new production errors. Headless confirmed all three render with data + filters work (`#/audiences` 5 rows, `#/abtests` 4, `#/rules` 4).

### Known nit (carry forward)

- `portal.abtests.title` / `portal.rules.title` render the **raw i18n key** (locale translation missing — PRE-EXISTING, the old thin views used the same keys). Add the keys + `pnpm sync:locales` in a future i18n pass. Other views (campaigns/customers/games/audiences) resolve fine.
- A **flows** demo mock was staged this session (for next week); the still-old Flows view will now show demo cards under `dev:mock`.

### ▶ RESUME HERE NEXT WEEK (breadth track)

**Start at Flows** — `flowsModel.ts` + ArtTable(Flow·Status·Steps·Start·End) + KPI + status filter; mock already in place (`/flows` → `{flows:[…]}`, 4 rows). Task scaffold already created. Then the P2 set: Templates · Cases · VipTiers · Storefront · Billing · Geofences · Creatives · Rewards. Deferred features still logged: Games Smart-Recommend wizard; reconcile Overview `CampaignTable.vue` / Reports `TopCampaignsTable.vue` to real-field-first; abtests/rules i18n keys.

The reusable restyle recipe is in §Week 8b. Verify: `pnpm vitest run` (expect 250+), `pnpm tsc --noEmit 2>&1 | grep -E "error TS" | grep -v "\.vue'"` (expect none), `pnpm dev:mock` + `?brand=demo#/<route>` (routes: /campaigns /games /customer-list /audiences /abtests /rules — note customer-list + abtests have non-obvious paths).

---

## Week 8f: Flows rebuilt onto ArtTable (2026-06-15)

**Status: DONE — committed, headless-reviewed.** Seventh view through the restyle template (Campaigns · Games · Customers · Audiences · AbTests · Rules · Flows). Replaces the last hand-rolled `<table>` among the P1 list views.

### Commit

- e43c99c feat(flows): rebuild Flows onto ArtTable + KPI strip + status filter

### What shipped

- KPI strip (card-list anatomy): Total flows / Active / Paused / Total steps — honest aggregates of real fields.
- Status segmented filter (All/Active/Paused/Draft/Ended, case-insensitive vs the free-form legacy status-pill values) + name search, client-side.
- ArtTable cols: Status badge · Flow (name + `template_id`, "custom" fallback per legacy portal.html:8779) · Steps · Window (`start → end`, em-dash when absent per portal.html:8777).
- "+ Create flow" → `/builder`. The 4-step wizard (pick template → customize → simulate funnel → publish) + templates grid + simulator panel stay **DEFERRED** (large stateful feature, not a restyle) — same call as the Games Smart-Recommend wizard.
- Real fields verified vs `AutomationFlow` (types.ts:278): flow_id/name/status/start_date/end_date/steps_count/template_id — no type change needed.
- Flows i18n keys (`portal.flows.title` = "Campaign Flows" / `portal.flows.subtitle`) resolve fine — NO raw-key nit like abtests/rules.

### Result

- `flows/flowsModel.ts` (11 unit cases) + `Flows.spec` rewritten (6). Tests **263/263** (+13). tsc zero new production errors.
- Headless (`?brand=demo#/flows`): KPIs 4/2/1/14; 4 rows; Paused filter → 1 row; em-dash window on the no-date rows. Native art-design-pro.

### ▶ RESUME HERE NEXT (breadth track)

ArtTable/card restyle now done for ALL 7 P1 list views: **Campaigns · Games · Customers · Audiences · AbTests · Rules · Flows**. Remaining single-thin views are the **P2 set**: Templates · Cases · VipTiers · Storefront · Billing (+invoices) · Geofences · Creatives · Rewards. Apply the §Week 8b recipe to each (most are simple lists/cards). Also still in scope: **Builder** entry view (currently thin).

Deferred features still logged: Games Smart-Recommend wizard; **Flows 4-step wizard**; reconcile Overview `CampaignTable.vue` / Reports `TopCampaignsTable.vue` to real-field-first; abtests/rules i18n keys (`portal.abtests.title` / `portal.rules.title` render raw — add keys + `pnpm sync:locales`).

Verify: `pnpm vitest run` (expect 263+), `pnpm tsc --noEmit 2>&1 | grep -E "error TS" | grep -v "\.vue'"` (expect none), `pnpm dev:mock` + `?brand=demo#/<route>` (note non-obvious paths: customer-list, abtests).

---

## Week 8g–8j: P2 list/card views rebuilt — Templates · Cases · Geofences · Creatives (2026-06-15)

**Status: DONE — 4 P2 views committed, each headless-reviewed.** Continues the restyle breadth track through the P2 set's clean list/card candidates. Plus a real i18n override fix (no longer deferred).

### Commits

- 0e77e98 feat(templates): rebuild Templates onto art-design-pro card gallery
- 1412d8d feat(cases): rebuild Case Studio prospects onto art-design-pro cards
- ce0228a feat(geofences): rebuild stores onto ArtTable + KPI strip + geocoded filter
- 33ec83a feat(creatives): rebuild asset library onto art-design-pro cards + fix i18n

### Per view (all: pure `*Model.ts` unit-tested + rewritten view spec + demo mock)

| View | Shape | KPIs | Filter | Notes |
| --- | --- | --- | --- | --- |
| **Templates** | card gallery | Total / Ready / Catalog / Game types | Ready/Catalog + search | gradient+emoji cover keyed by slug (shared palette w/ Games; dedup deferred); card→/builder |
| **Cases** | card grid | Total / Complete / In progress / Draft | status + search | status badge keeps legacy binary colour intent |
| **Geofences** | ArtTable | Total / Active / Geocoded / Avg radius | Geocoded/Pending + search | filter is a REAL dimension (place_id or lat+lng), not fake — legacy hard-coded "Active" |
| **Creatives** | card gallery | Total / Images / Videos / Total size | kind + search | settings-router path; size KB→MB; legacy timestamp wrapper |

### i18n override fix (commit 33ec83a — the sanctioned mechanism, NOT deferred)

`portal.creatives.title/subtitle` were MISSING from the kix-platform SSOT in **every** wired locale (would render a raw H1); `portal.cases.subtitle` / `portal.geofences.subtitle` were missing from the wired en-US/zh-Hans (present only in the un-wired en-SG/zh-CN). Added all four as **portal-layer overrides** in `locales/portal/{en,zh}.json` — `src/locales/index.ts` deep-merges portal OVER synced, and `pnpm sync:locales` only rsyncs `locales/synced/`, so the overrides survive. Verified on-screen (素材库 H1 + resolved subtitles). This clears the cases/geofences raw-key nits flagged in their own commits, and is the pattern to use for the still-open abtests/rules raw-key nit.

### Result

- Tests **306/306** (250 → 263 Flows → 274 Templates → 284 Cases → 295 Geofences → 306 Creatives). tsc zero new production errors throughout.
- Headless `?brand=demo#/<route>` confirmed every view renders native to art-design-pro with working KPIs + filters.

### ▶ RESUME HERE NEXT (breadth track)

The restyle template is now applied to **all 7 P1 list views + 4 clean P2 list/card views** (Templates · Cases · Geofences · Creatives). **Remaining P2 are structurally different — NOT simple list/card, so the rote template does not fit cleanly; each needs per-view judgment:**

- **VipTiers** (262 lines) — tier ladder; likely a card row per tier (could reuse card-list anatomy).
- **Storefront** (335 lines) — brand-profile EDITOR (form: contact / socials / custom sections). A form, not a list — restyle = ElForm + art-card sections, not ArtTable.
- **Billing** (324 lines) — wallet balance + spend dashboard. Closer to Overview's metric cards + a spend table than to a list.
- **Rewards** (297 lines) — consolidated 4-TAB view (vouchers + coupons-qr + game-rewards + prizes). Already multi-section; restyle = ElTabs + per-tab ArtTable/cards.

Recommend confirming direction with the user before forcing the list/card template onto these four. Also still open: **Builder** entry view (thin).

Deferred features still logged: Games Smart-Recommend wizard; Flows 4-step wizard; Templates sort/rank/detail/Try-demo; reconcile Overview `CampaignTable.vue` / Reports `TopCampaignsTable.vue` to real-field-first; **abtests/rules i18n raw-key** (now fixable via the portal-override mechanism proven in 33ec83a).

Verify: `pnpm vitest run` (expect 306+), `pnpm tsc --noEmit 2>&1 | grep -E "error TS" | grep -v "\.vue'"` (none), `pnpm dev:mock` + `?brand=demo#/<route>` (routes added this batch: /templates /cases /geofences /creatives).

---

## Week 8k–8n: heavy P2 views rebuilt — VipTiers · Billing · Rewards · Storefront (2026-06-15)

**Status: DONE — the 4 structurally-different P2 views committed, each headless-reviewed.** User confirmed "继续，按各自形态重建" — these are NOT simple list/card, so each got a per-view treatment (not the rote ArtTable/gallery template). **This completes the entire breadth track: all 7 P1 list views + all 8 P2 views rebuilt onto art-design-pro.**

### Commits

- d558c15 feat(vip-tiers): ArtTable ladder + KPI strip + distribution bars
- b0a533a feat(billing): wallet KPI strip + per-brand + invoices ArtTables
- 9c97b4d feat(rewards): ElTabs + KPI strip + Templates card gallery
- bac78cc feat(storefront): analytics KPI strip + preview + share cards

### Per view (all: pure `*Model.ts` unit-tested + rewritten view spec + demo mock)

| View | Shape chosen | Surfaced NEW real data | Notes |
| --- | --- | --- | --- |
| **VipTiers** | KPI + ArtTable ladder + bar card | member counts JOINED into ladder by name | distribution 503 → members em-dash, ladder still renders; stacked (2-col clipped the 4-col table) |
| **Billing** | wallet KPI strip + 2 ArtTables | **per_brand spend** (legacy ignored it) | money prefers raw SGD via fmtSgd → pre-formatted str → em-dash |
| **Rewards** | KPI + ElTabs + card gallery | catalog value / limited-stock KPIs | type filter (fixed enum); 3 stub tabs restyled |
| **Storefront** | analytics KPI strip + 2 cards | **follower/rating/featured** (legacy typed but never rendered) | origin injected into model for testable URL/embed builders |

### Pattern note (when the rote template doesn't fit)

The list/card recipe is for list/gallery views. For these four: **VipTiers/Billing** → ArtTable(s) but with a JOIN / multi-table; **Rewards** → native ElTabs wrapping the gallery; **Storefront** → preview + share cards (no table at all). The constant across all of them is the **card-list KPI strip** (canonical `.art-card` + `bg-theme/10` icon square) and **NO-FAKE-DATA** (every KPI/column from a verified real field; several views now SURFACE real fields the legacy ignored — per_brand, storefront analytics, tier member counts).

### i18n overrides (continued from 33ec83a)

billing / rewards / storefront title+subtitle were all MISSING in both wired locales — added as portal-layer overrides in `locales/portal/{en,zh}.json` (survives `sync:locales`). All H1s now resolve (账单 / 奖励 / 店面). The override block now covers: cases.subtitle, geofences.subtitle, creatives.title/subtitle, billing._, rewards._, storefront.\*.

### Result

- Tests **330/330** (306 → 313 VipTiers → 319 Billing → 325 Rewards → 330 Storefront). tsc zero new production errors throughout.
- Headless confirmed every view renders native to art-design-pro with working KPIs + filters/tabs.

### ▶ RESUME HERE NEXT (breadth track ~complete)

**Every P1 + P2 view is rebuilt.** What remains:

- **Builder** entry view (still thin, ~170 lines) — the one non-rebuilt main view. It's a creation surface (entry into the game-build flow), not a list; treat like Storefront (per-view).
- **Deferred FEATURES** (the big stateful surfaces intentionally not built — each is a mini-project, confirm priority with user): Games Smart-Recommend wizard; Flows 4-step wizard; Rewards 3 stub tabs (Game links / Issuance / Redemption) + Templates editor; VipTiers tier editor; Storefront customization editor; Billing recharge/payment-methods; Templates sort/rank/detail/Try-demo; Geofences add-store + map; Creatives upload; Cases new-case + deck.
- **Polish nits**: reconcile Overview `CampaignTable.vue` / Reports `TopCampaignsTable.vue` to real-field-first; abtests/rules raw-key i18n (now trivially fixable via the proven portal-override mechanism — add the 4 keys to `locales/portal/{en,zh}.json`).
- **Production cutover** (below) is now much closer — all merchant-facing views are on the art-design-pro language.

Verify: `pnpm vitest run` (expect 330+), `pnpm tsc --noEmit 2>&1 | grep -E "error TS" | grep -v "\.vue'"` (none), `pnpm dev:mock` + `?brand=demo#/<route>` (routes added this batch: /vip-tiers /billing /rewards /storefront).

---

## Week 8o: Builder rebuilt + abtests/rules i18n nit cleared — BREADTH TRACK COMPLETE (2026-06-15)

**Status: DONE.** The last non-rebuilt main view (Builder) is on art-design-pro, and the long-standing abtests/rules raw-key nit is fixed. **Every merchant-facing view in the portal is now rebuilt onto the art-design-pro language.**

### Commits

- 4bdd308 fix(i18n): add missing abtests / rules / builder portal keys
- 0f1fde4 feat(builder): rebuild entry view onto opportunity-score hero + block grid

### Builder

- `builder/builderModel.ts`: pure logic (BUILD_MODULES+icons / scoreTone / potentialGain / scorePct), unit-tested (4 cases).
- Opportunity score → hero `.art-card`: tone-coloured score /100 (low→danger / mid→theme / high→success) + progress bar + "+N potential" + hints with +points badges. 6 build blocks → `.art-card` buttons with `bg-theme/10` icon squares.
- DEFERRED (large stateful feature): the 6 module sub-forms + save-draft/publish + live build overlay (each block keeps its "coming soon" click).
- POST `/portal/builder/opportunity-score` demo mock added (the mock matcher ignores method/body).

### i18n nit cleared

`portal.abtests.title/subtitle` + `portal.rules.title/subtitle` (+ `portal.builder.opp.good`) were MISSING from the SSOT in both wired locales → added as portal-layer overrides. Verified on-screen: abtests H1 = A/B 测试, rules H1 = 规则. The override block in `locales/portal/{en,zh}.json` now covers every view whose SSOT keys were absent.

### Result

- Tests **334/334**. tsc zero new production errors.
- Headless `?brand=demo#/builder`: score 62/100 + 3 hints + 6 blocks; native.

### ▶ STATE OF THE PORTAL (all views rebuilt)

Overview (deepened, Week 7) · Reports (deepened) · **all 5 P0** · **all 7 P1 list views** · **all 8 P2 views** · **Builder** — every route is real and on the art-design-pro language. Only **deferred FEATURES** remain (each a mini-project, confirm priority before building):

- Creation/editor flows: Games Smart-Recommend wizard · Flows 4-step wizard · Builder 6 module sub-forms + publish · VipTiers tier editor · Storefront customization editor · Templates new-template + sort/rank/detail/Try-demo · Geofences add-store + map · Creatives upload · Cases new-case + deck render · Rewards 3 stub tabs (Game links / Issuance / Redemption) + Templates editor · Billing recharge / payment-methods.
- Polish: reconcile Overview `CampaignTable.vue` / Reports `TopCampaignsTable.vue` to real-field-first.
- **Production cutover** (below) — all merchant-facing views are visually done; this is the natural next milestone once the user signs off on parity.

Verify: `pnpm vitest run` (expect 334+), `pnpm tsc --noEmit 2>&1 | grep -E "error TS" | grep -v "\.vue'"` (none), `pnpm dev:mock` + `?brand=demo#/builder`.

---

## Week 9: Deferred FEATURES — all creation/editor flows shipped (2026-06-15)

**Status: DONE — every deferred stateful feature is built, each headless-reviewed, committed.** User went auto-mode ("做完一个继续下一个直到全部完成"). The breadth track (every view on art-design-pro) was already complete; this session built the remaining FEATURES the rebuilds intentionally stubbed.

### Commits

| Commit  | Feature                                                                             |
| ------- | ----------------------------------------------------------------------------------- |
| 6078848 | feat(games): Smart-Recommend creation wizard + IDE customize modal                  |
| 5a9e03a | feat(builder): 6 module sub-forms + live re-score + publish flow                    |
| 12de540 | feat(flows): 4-step wizard (template → customize → simulate → publish)              |
| ab9bb26 | feat(rewards): live Game-links / Issuance / Redemption tabs + template editor       |
| 421a985 | feat(editors): VipTiers ladder editor + Geofences add-store + Cases new+deck        |
| 164b60b | feat(editors): Billing top-up + payment method, Storefront editor, Creatives upload |
| bde40c1 | refactor(overview,reports): campaign tables real-field-first (reconcile)            |

### What shipped (each backed by a verified real endpoint)

- **Games wizard** (`games/CreateGameWizard.vue` + `CustomizeModal.vue`) — describe → POST /games/recommend → pick → POST /games/build → poll /games/orders/{id} → launch checklist. Fail-soft: 503 → starter trio; R7 sync path skips polling; 5-min timeout → Retry. Customize opens the gamification IDE iframe (postMessage-driven refresh).
- **Builder sub-forms** (`builder/ModuleEditor.vue` + `builderForms.ts`) — 6 module editors (game/voucher/rule/schedule/safety/tournament) with real fields; live re-score on save; Save-draft (localStorage) + Publish (rule/schedule configure → /builder/publish, KYC 403 gate, navigate to Campaigns).
- **Flows wizard** (`flows/CreateFlowWizard.vue`) — templates grid → create → customize (name/dates + step preview) → simulate (backend funnel + cost cards) → publish.
- **Rewards tabs** (`rewards/GameLinksTab|IssuanceTab|RedemptionTab.vue` + `NewTemplateDialog.vue`) — coupon binding PUT, issuance summary, voucher lookup+redeem, template create (POST /coupon-templates) + delete.
- **Small editors** — VipTiers ladder PUT, Geofences store register, Cases prospect create + deck render overlay, Billing wallet top-up + add-card, Storefront configure, Creatives multipart upload.

### Pattern (held across all 7)

Pure model (`*Model.ts` / `*Forms.ts`) for body-assembly + validation + normalisation (unit-tested, no mount) → dialog/wizard component (wiring spec, ElDialog-stubbed) → API fn + wire types → demo payloads in `portalAdminMock.ts` → view CTA opens it, reloads on success. NO-FAKE-DATA throughout: every field maps to a verified backend contract (explored against `kix-platform` portal.html + routers before building).

### Result

- Tests **432/432** (was 334 at session start; +98). tsc zero new production errors throughout.
- Headless `?brand=demo` review for each: Games 4 steps, Builder editor+publish, Flows funnel+publish, Rewards 4 tabs, all 6 editor dialogs mount native to art-design-pro.
- Notes: the demo guide-tooltip (raw `topBar.guide.*` i18n keys, pre-existing) floats top-right and overlaps header CTAs in screenshots — cosmetic demo artifact, not a regression.

### ▶ STATE OF THE PORTAL

Every merchant-facing view is rebuilt AND every deferred creation/editor flow is built. **Production cutover (below) is the natural next milestone** once the user signs off on parity. Remaining nice-to-haves (not blocking): Templates Try-demo (no backend contract found), Geofences map pin + address autocomplete (Mapbox token-gated), per-row Edit/Delete on stores, Rewards QR rotation.

---

## Week 10: Remaining list-view create/edit flows (2026-06-16)

**Status: DONE — the create/edit/secondary surfaces the list rebuilds left out, all backed by verified endpoints, headless-reviewed, committed.** After the Week 9 deferred-FEATURE sweep, a contract audit (Explore vs portal.html + routers) found a few list views still missing their mutation surfaces. Built the ones with REAL backends; skipped the ones with none.

### Commits

| Commit  | Feature                                                                     |
| ------- | --------------------------------------------------------------------------- |
| 1d05c11 | feat(abtests,rules): A/B test create dialog + Rules inline state toggle     |
| 36c1ba9 | feat(audiences,reports): audience create + Reports Export CSV & Attribution |

### Shipped (verified contract before building)

- **AbTests** — `CreateAbTestDialog` (name + 2 campaign pickers loaded live + metric → POST /ab-tests).
- **Rules** — State column is now an inline `ElSwitch` → PATCH /automations/{id}/state (optimistic + revert). 3-state aware (notify_only keeps a badge).
- **Audiences** — `NewAudienceDialog` (name + source + description → POST /portal/settings/audiences/{brand} — the SETTINGS namespace, not the read-only admin list).
- **Reports** — Export CSV header button (GET /reports/export.csv as Blob → client download) + `AttributionCard` (window selector + 4-model credit table, GET /reports/attribution; self-hides when empty).

### NO-BACKEND decisions (verified absent — NOT built)

- **Rules create/edit/delete** — automations have only a state-toggle endpoint; rules are authored via the Builder rule module. No POST/PATCH/DELETE.
- **Customers detail** — legacy has no per-customer detail route or endpoint (list-only).

### Result

- Tests **440/440** (was 436 at session start; +8: AbTests/Rules 4 + Audiences/Reports 4). tsc zero new production errors.
- Headless `?brand=demo` confirmed: A/B create dialog (campaign pickers + metric), 3 live rule switches, attribution card + Export button on Reports, audience dialog — all native to art-design-pro.

### ▶ STATE OF THE PORTAL

Every view rebuilt + every deferred creation/editor flow built + every list view with a real mutation contract now has its create/edit/toggle surface. **Production cutover (below) is the next milestone** — needs user sign-off on parity. Genuinely-no-backend leftovers stay out (Customers detail, Rules CRUD, Templates Try-demo, Geofences Mapbox map).

---

## Future: Production cutover (HELD — deferred until view deepening complete)

Originally Plan 7. Now deferred to after all view-deepening passes finish (Week 7 Overview + Plan 8+ for the remaining 17 views) AND user signs off on visual parity per view.

Requires user approval. See `DEPLOY.md` for full SOP. Summary:

1. Build + deploy portal-v2 dist to `/portal/` on production nginx
2. Modify `kix-platform/landing/signin.html` to redirect to portal-v2 by default
3. Monitor 401/5xx for 1-2 weeks
4. Archive `kix-platform/landing/portal.html` → `_archive/`

Rollback: revert signin.html redirect; portal-v2 keeps serving.
