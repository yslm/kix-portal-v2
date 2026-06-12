<script setup lang="ts">
  /**
   * Overview · KPI metric cards — TikTok-Ads-Manager-style 4-metric row.
   *
   * Ports the legacy `kixLoadMetrics()` renderer at
   * kix-platform/landing/portal.html ~line 3551 (markup at lines 1350-1356)
   * onto a responsive Tailwind grid sitting directly below the StatusStrip
   * and above the SetupGuide/NBA pair.
   *
   * Wire endpoint: GET /api/v1/portal-admin/metrics (see
   * src/api/portal-admin/overview.ts · `fetchMetrics`). Brand is inferred
   * server-side from the JWT — no `?brand=` query param.
   *
   * State machine (non-critical card — identical to StatusStrip / NbaCard):
   *   - loading     → render nothing (avoid layout flicker)
   *   - error       → render nothing (e.g. demo-mode 401 → fail-soft)
   *   - empty array → render nothing (isReady predicate gate)
   *   - data        → render the 4-card grid
   *
   * Card pairing: response items are paired BY INDEX with the fixed LABELS
   * constant. If the backend returns fewer than 4 items, only the present
   * items are rendered — no placeholder cards, no crash.
   *
   * Deferred from this first cut (legacy still owns these surfaces):
   *   - Date-range filter / period selector (separate legacy feature)
   *   - Per-card drill-down / sparkline (separate legacy feature)
   *   - i18n keys — English-only first cut, same approach as StatusStrip /
   *     SetupGuideCard / NbaCard
   *
   * Note: if the backend returns more than 4 items, the extra cards render
   * with an empty label — LABELS covers indices 0–3 only; no overflow
   * handling is needed (scoped out, same as the legacy renderer).
   */
  import { onMounted } from 'vue'
  import { fetchMetrics } from '@/api/portal-admin/overview'
  import type { MetricCard } from '@/api/portal-admin/types'
  import { useNonCriticalCard } from '@/hooks/kix/useNonCriticalCard'
  import { LABELS, ICONS } from './metricLabels'

  const { data, visible, reload } = useNonCriticalCard<MetricCard[]>(
    () => fetchMetrics(),
    /** isReady: at least one card present — same empty-guard pattern as NbaCard. */
    { isReady: (d) => d.length > 0 }
  )

  onMounted(reload)

  /** Arrow glyph for the delta line. Mirrors legacy `.pos`/`.warn`/neutral
   *  tri-way used at portal.html lines 1350-1356. */
  function arrow(direction: string): string {
    if (direction === 'up') return '↑ '
    if (direction === 'down') return '↓ '
    return '· '
  }

  /**
   * Tailwind colour class for the delta span.
   * up   → text-success (theme-aware green, matches art-design-pro card-list)
   * down → text-danger  (theme-aware red)
   * else → muted gray
   */
  function deltaClass(direction: string): string {
    if (direction === 'up') return 'text-success'
    if (direction === 'down') return 'text-danger'
    return 'text-g-500'
  }
</script>

<template>
  <div
    v-if="visible"
    data-testid="metric-cards"
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
  >
    <article
      v-for="(card, i) in data!"
      :key="i"
      :data-testid="`metric-card-${i}`"
      class="art-card relative flex flex-col justify-center h-35 px-5"
    >
      <!-- Label -->
      <span data-testid="metric-label" class="text-g-700 text-sm">
        {{ LABELS[i] }}
      </span>

      <!-- Value — pre-formatted by server; render as-is (not ArtCountTo — values
           are strings like "S$1,800 · S$8.41" that can't be animated numerically) -->
      <span
        data-testid="metric-value"
        class="text-[26px] font-medium mt-2 tabular-nums leading-tight"
      >
        {{ card.value }}
      </span>

      <!-- Delta row: muted prefix (sub_label) + colored signed delta -->
      <div class="flex-c mt-1">
        <span
          data-testid="metric-delta"
          class="text-xs font-semibold tabular-nums"
          :class="deltaClass(card.delta_direction)"
        >
          {{ arrow(card.delta_direction) }}{{ Math.abs(card.delta_pct) }}% · {{ card.sub_label }}
        </span>
      </div>

      <!-- Sub: benchmark_note ?? sub_label — small context line -->
      <span data-testid="metric-sub" class="text-xs text-g-500 mt-0.5 leading-snug">
        {{ card.benchmark_note ?? card.sub_label }}
      </span>

      <!-- Icon square — absolute right, theme-colored, mirrors card-list.vue anatomy -->
      <div class="absolute top-0 bottom-0 right-5 m-auto size-12.5 rounded-xl flex-cc bg-theme/10">
        <ArtSvgIcon :icon="ICONS[i] ?? 'ri:bar-chart-line'" class="text-xl text-theme" />
      </div>
    </article>
  </div>
</template>
