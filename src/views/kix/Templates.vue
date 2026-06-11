<script setup lang="ts">
  /**
   * Templates view — Plan 5 Task 1.
   *
   * Source: `kix-platform/landing/portal.html`, `<section id="view-templates">`
   * (lines 1753-1777) + legacy fetcher `kixLoadTemplates()` (~line 8235)
   * + renderer `_kixRenderTemplates()` (~line 8177). The legacy section
   * bundles in one place:
   *
   *   - Page header + subtitle ("Pick a game your shop can generate right
   *     now…") at line 1754-1755
   *   - Two filter chips: "Ready to generate" / "Browse full catalog"
   *     (line 1757-1758, `kixSetTemplateFilter()` toggling `_kixTplReskinOnly`)
   *   - Sort dropdown with four sort orders (line 1766-1771,
   *     `kixApplyTemplateSort()`)
   *   - Catalog grid (`#tpl-grid` at line 1774) of `.tpl-card` elements
   *     rendered by `_kixRenderTemplates()` (line 8177)
   *   - Per-card overlays: rank badge (#1 / #2 / #3 / 🔥 Trending),
   *     "Coming soon" badge for catalog-only games, star rating row,
   *     peer-count + ROI signal lines, SVG cover fallback + Nano-Banana
   *     hydration
   *   - Card click → `kixOpenGameDetail()` slide-over (line 8275)
   *     with a "Try demo" CTA → `kixOpenDemo()` iframe modal (line 8344)
   *   - "Load more" pagination button (line 8224) + offset accumulator
   *
   * Plan 5 T1 ports ONLY the page header + single-page catalog grid of
   * cards rendering `name · slug` (plus a "Ready" pill when the server
   * marks the template reskinable). Everything else is DEFERRED:
   *   - Filter chips + `reskin_only` query toggle
   *   - Sort dropdown + four sort orders
   *   - Rank / Trending / "Coming soon" badges
   *   - Star ratings + peer-count + ROI signals
   *   - Detail panel + Try-demo iframe modal
   *   - "Load more" pagination + offset accumulator
   *   - SVG cover fallback + Nano-Banana cover hydration
   *
   * Same template as Plan 3/4: port a thin honest slice of a real
   * endpoint, defer the rest behind a clear comment. Visually closer to
   * the Games gallery (card grid) than to the Rules/AbTests tables.
   *
   * State machine: loading → (data | empty | error). Empty-state copy
   * mirrors the legacy `kixT('portal.templates.library_loading', …)`
   * fallback at portal.html line 8181 — when the brand catalog is
   * actually empty (not "still loading"), we show a flat
   * "No templates available" placeholder.
   *
   * Endpoint: GET /api/v1/portal-admin/games/templates. `KIX_STUDIO_API`
   * is `/api/v1/portal-admin/games` (portal.html line 3833); the
   * templates list hangs off that router. Brand inferred from the JWT
   * (no explicit `?brand=` param) — same as Rules / AbTests / Audiences.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listTemplates } from '@/api/portal-admin/templates'
  import type { Template } from '@/api/portal-admin/types'
  import StatusBadge from '@/components/StatusBadge.vue'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const templates = ref<Template[]>([])

  const pageTitle = computed(() => t('portal.templates.title'))
  const pageSubtitle = computed(() => t('portal.templates.subtitle'))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listTemplates()
      const data = res.data
      if (Array.isArray(data)) {
        templates.value = data
      } else if (data && typeof data === 'object') {
        const d = data as { games?: Template[]; items?: Template[] }
        templates.value = d.games ?? d.items ?? []
      } else {
        templates.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Mirrors the legacy renderer's name fallback chain (portal.html line
   * 8193): name → slug → 'Template'. The card subtitle re-displays the
   * raw slug below the title — matches the legacy `.tpl-card .sb` row.
   */
  function displayName(t: Template): string {
    return t.name || t.slug || 'Template'
  }

  /**
   * Row key — `slug` is the canonical identifier on this endpoint (the
   * legacy `data-slug` attribute on every `.tpl-card`). The array-index
   * fallback is defensive against schema drift, matching the convention
   * in Rules / Audiences / AbTests.
   */
  function rowKey(t: Template, idx: number): string {
    return t.slug ?? `idx-${idx}`
  }

  /**
   * "Ready" pill — maps the server's `reskinable` flag onto the shared
   * `<StatusBadge>` colour map. `true → 'active'` (green pill, same as
   * the legacy "Ready to generate" filter chip's positive intent);
   * everything else falls through to `undefined`, which renders as the
   * em-dash placeholder via the badge's `v-if="!status"` branch — we
   * suppress the badge entirely in the template via `v-if` so the card
   * stays clean when no signal is present. The deferred "Coming soon"
   * badge (`portal.games.catalog_only_badge`) is NOT rendered here;
   * that gating belongs with the filter chip work in a later task.
   */
  function readyBadgeStatus(t: Template): string | undefined {
    return t.reskinable ? 'active' : undefined
  }

  onMounted(load)
</script>

<template>
  <div class="kix-templates p-8 space-y-6">
    <!-- Page header (mirrors the legacy `.page-title` + `#tpl-subtitle` at portal.html line 1754-1755) -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- Template catalog grid · 4-state -->
    <section
      v-if="loading"
      class="text-gray-400 text-sm py-6 text-center"
      data-testid="templates-loading"
    >
      Loading templates…
    </section>

    <section
      v-else-if="error"
      class="text-red-600 text-sm py-6 text-center"
      data-testid="templates-error"
    >
      Failed to load: {{ error }}
    </section>

    <!--
      Empty-state — the legacy view never ships an explicit "no templates"
      copy (the catalog has 1000+ entries seeded in mocks). We surface a
      flat placeholder so the four-state pattern stays honest; the
      DEFERRED filter chips will own their own empty-filter copy later.
    -->
    <section
      v-else-if="templates.length === 0"
      class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
      data-testid="templates-empty"
    >
      No templates available.
    </section>

    <section
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      data-testid="templates-grid"
    >
      <article
        v-for="(tpl, idx) in templates"
        :key="rowKey(tpl, idx)"
        class="bg-white border border-gray-200 rounded-lg p-4 space-y-2"
        data-testid="template-card"
      >
        <!--
          Cover · `cover_url` is rendered raw when present. The legacy
          SVG fallback (`kixCoverFallback(slug, name)`) and Nano-Banana
          hydration (`kixHydrateCovers`) are DEFERRED — empty cover
          shows nothing rather than a fake.
        -->
        <img
          v-if="tpl.cover_url"
          :src="tpl.cover_url"
          :alt="displayName(tpl)"
          class="w-full aspect-video object-cover rounded bg-gray-100"
          loading="lazy"
        />
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-semibold text-gray-900">{{ displayName(tpl) }}</h3>
          <StatusBadge v-if="readyBadgeStatus(tpl)" :status="readyBadgeStatus(tpl)" />
        </div>
        <p v-if="tpl.slug" class="text-xs text-gray-400 font-mono">{{ tpl.slug }}</p>
      </article>
    </section>
  </div>
</template>
