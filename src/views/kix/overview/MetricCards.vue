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
   */
  import { onMounted } from 'vue'
  import { fetchMetrics } from '@/api/portal-admin/overview'
  import type { MetricCard } from '@/api/portal-admin/types'
  import { useNonCriticalCard } from '@/hooks/kix/useNonCriticalCard'

  /**
   * Fixed card labels in legacy-canonical order (portal.html lines 1350-1356).
   * Paired with the response array by index — LABELS[i] is the label for
   * data[i]. English-only; no new i18n keys.
   */
  const LABELS = [
    'Impressions (game views)',
    'Plays · clicks',
    'Verified new customers',
    'Spent · CPA'
  ] as const

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
   * up   → green  (matches legacy `.pos` + StatusStrip green-700 / NbaCard green-800)
   * down → red    (matches legacy `.warn`)
   * else → muted gray
   */
  function deltaClass(direction: string): string {
    if (direction === 'up') return 'text-green-700'
    if (direction === 'down') return 'text-red-600'
    return 'text-gray-400'
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
      class="bg-white border border-gray-200 rounded-xl px-6 py-4 flex flex-col gap-1"
    >
      <!-- Label -->
      <span
        data-testid="metric-label"
        class="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400"
      >
        {{ LABELS[i] }}
      </span>

      <!-- Value — pre-formatted by server; render as-is -->
      <span
        data-testid="metric-value"
        class="text-xl font-bold text-gray-900 tabular-nums leading-tight"
      >
        {{ card.value }}
      </span>

      <!-- Delta: arrow + abs(pct) + sub_label -->
      <span
        data-testid="metric-delta"
        class="text-xs font-semibold tabular-nums"
        :class="deltaClass(card.delta_direction)"
      >
        {{ arrow(card.delta_direction) }}{{ Math.abs(card.delta_pct) }}% · {{ card.sub_label }}
      </span>

      <!-- Sub: benchmark_note ?? sub_label -->
      <span data-testid="metric-sub" class="text-[11px] text-gray-400 leading-snug">
        {{ card.benchmark_note ?? card.sub_label }}
      </span>
    </article>
  </div>
</template>
