<script setup lang="ts">
  /**
   * Cases view (Case Studio prospects grid) — Plan 5 Task 2.
   *
   * Source: `kix-platform/landing/portal.html`, `<section id="view-cases">`
   * (lines 1730-1748) + the legacy fetcher `kixLoadCases()` (~line 8461)
   * + the inlined renderer at ~line 8475-8488. The legacy section bundles
   * in one place:
   *
   *   - Page header + subtitle ("Per-prospect research + branded 12-slide
   *     pitch deck. Three-source verified · all claims traceable to
   *     file:line.") at line 1733-1734
   *   - "+ New case" primary CTA in the top-right (line 1736,
   *     `kixNewCase()` prompts for name/url/vertical, POSTs to create a
   *     draft seed)
   *   - Hero gradient feature card (line 1739-1743) — a pure-copy
   *     explainer block, no data
   *   - Prospects grid (`#cases-grid` at line 1745) — auto-fill cards
   *     rendered by the inlined loop in `kixLoadCases()`
   *   - Per-card content: company_name + status pill, primary_url, tagline,
   *     and two CTAs ("📊 Open deck" → `kixOpenDeck()`; "↻ Regenerate" →
   *     `kixCasesRegenerate()`, both POST to `.../render-deck`)
   *
   * Plan 5 T2 ports ONLY the page header + a single-page prospects grid
   * of cards (title · primary_url subtitle · tagline · research_status
   * badge). Everything else is DEFERRED:
   *   - "+ New case" CTA + the `POST /case-studio/prospects` endpoint
   *   - Hero gradient feature card (pure copy — no data, skipped to keep
   *     the four-state pattern clean)
   *   - "📊 Open deck" CTA + the HEAD/POST `/render-deck` dance
   *   - "↻ Regenerate" CTA + the `/render-deck` POST
   *   - Detail panel — the per-prospect deep profile only exists as the
   *     rendered HTML deck under `/landing/decks/<id>/`; the portal has
   *     no in-app detail surface yet, so there's nothing to defer to here
   *
   * Same template as Plan 3/4/5 T1: port a thin honest slice of a real
   * endpoint, defer the rest behind a clear comment. Visually closer to
   * the Templates catalog (card grid) than to the Rules/AbTests tables.
   *
   * State machine: loading → (data | empty | error). Empty-state copy
   * mirrors the legacy fallback at portal.html line 8470 — "No prospects
   * yet. Add a seed JSON under `app/data/prospects/`."; we surface the
   * same message in the v2 view as a flat placeholder. The legacy hero
   * card's spinner glyph is replaced by flat text to match the
   * Templates / Rules / AbTests convention.
   *
   * Endpoint: GET /api/v1/portal-admin/case-studio/prospects.
   * `KIX_CASES_API` is `/api/v1/portal-admin/case-studio` (portal.html
   * line 8460); the prospects list hangs off that router. Unlike the
   * brand-scoped endpoints (Templates / Audiences / Rules / AbTests),
   * Case Studio is a platform-internal sales tool keyed by `prospect_id`
   * — no `?brand=` param, no `get_current_brand` dependency.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listCases } from '@/api/portal-admin/cases'
  import type { CaseStudy } from '@/api/portal-admin/types'
  import StatusBadge from '@/components/StatusBadge.vue'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const cases = ref<CaseStudy[]>([])

  const pageTitle = computed(() => t('portal.cases.title'))
  const pageSubtitle = computed(() => t('portal.cases.subtitle'))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listCases()
      const data = res.data
      if (Array.isArray(data)) {
        cases.value = data
      } else if (data && typeof data === 'object') {
        const d = data as { prospects?: CaseStudy[]; items?: CaseStudy[] }
        cases.value = d.prospects ?? d.items ?? []
      } else {
        cases.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Mirrors the legacy renderer's display chain (portal.html line 8479):
   * the legacy code reads `p.company_name` raw and trusts the seed JSON
   * schema. We add defensive fallbacks (prospect_id → "Prospect") so a
   * malformed seed doesn't render an empty card title.
   */
  function displayName(c: CaseStudy): string {
    return c.company_name || c.prospect_id || 'Prospect'
  }

  /**
   * Row key — `prospect_id` is the canonical identifier (the legacy
   * renderer uses it as the click target in `kixOpenDeck(...)` and
   * `kixCasesRegenerate(...)`). Array-index fallback is defensive
   * against schema drift, matching the convention in Templates / Rules /
   * Audiences / AbTests.
   */
  function rowKey(c: CaseStudy, idx: number): string {
    return c.prospect_id ?? `idx-${idx}`
  }

  /**
   * Research-status pill — maps the server's `research_status` onto the
   * shared `<StatusBadge>` colour map. The legacy renderer hard-codes a
   * binary green-vs-amber split: `'complete'` → green, anything else →
   * amber (portal.html line 8476-8477). We mirror that intent through
   * the StatusBadge palette:
   *   - 'complete'    → 'active'  (green pill)
   *   - 'draft'       → 'draft'   (gray pill — the explicit draft state
   *                                from `create_draft_prospect()`)
   *   - anything else → 'pending' (amber pill — matches the legacy
   *                                "in-progress" colour)
   *   - undefined     → undefined → suppressed via `v-if` so the card
   *                                stays clean when no signal is present
   *
   * The deferred two-state "Open deck" / "Regenerate" gating (which the
   * legacy view also gates on research_status via the publish-gate in
   * `render_deck`) belongs with the CTA work in a later task.
   */
  function statusBadge(c: CaseStudy): string | undefined {
    const s = c.research_status
    if (!s) return undefined
    if (s === 'complete') return 'active'
    if (s === 'draft') return 'draft'
    return 'pending'
  }

  onMounted(load)
</script>

<template>
  <div class="kix-cases p-8 space-y-6">
    <!-- Page header (mirrors the legacy `.page-title` + subtitle at portal.html line 1733-1734) -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- Prospects grid · 4-state -->
    <section
      v-if="loading"
      class="text-gray-400 text-sm py-6 text-center"
      data-testid="cases-loading"
    >
      Loading prospects…
    </section>

    <section
      v-else-if="error"
      class="text-red-600 text-sm py-6 text-center"
      data-testid="cases-error"
    >
      Failed to load: {{ error }}
    </section>

    <!--
      Empty-state — mirrors the legacy "No prospects yet. Add a seed JSON
      under app/data/prospects/." copy at portal.html line 8470. The
      deferred "+ New case" CTA will own its own success-state copy later.
    -->
    <section
      v-else-if="cases.length === 0"
      class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
      data-testid="cases-empty"
    >
      No prospects yet.
    </section>

    <section
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      data-testid="cases-grid"
    >
      <article
        v-for="(c, idx) in cases"
        :key="rowKey(c, idx)"
        class="bg-white border border-gray-200 rounded-lg p-4 flex flex-col gap-2"
        data-testid="case-card"
      >
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold text-gray-900">{{ displayName(c) }}</h3>
          <StatusBadge v-if="statusBadge(c)" :status="statusBadge(c)" />
        </div>
        <p v-if="c.primary_url" class="text-xs text-gray-400 font-mono break-all">
          {{ c.primary_url }}
        </p>
        <p v-if="c.tagline" class="text-sm text-gray-600 leading-relaxed">
          {{ c.tagline }}
        </p>
      </article>
    </section>
  </div>
</template>
