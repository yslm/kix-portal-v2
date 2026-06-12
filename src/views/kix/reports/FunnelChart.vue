<script setup lang="ts">
  /**
   * Reports · Engagement · conversion funnel.
   *
   * Ports the legacy `#engagement-funnel` (portal.html lines 2022-2039,
   * renderer `kixRenderFunnelSvg()` ~line 5030) onto a clean horizontal
   * bar funnel inside an `.art-card`. Each step is a labelled bar whose
   * width is proportional to its count relative to the widest step
   * (Impressions, the top of the funnel) — same visual intent as the
   * legacy SVG funnel, without the echarts/SVG dependency.
   *
   * Wire endpoint: GET /api/v1/portal-admin/reports/funnel?source=true
   * (see src/api/portal-admin/reports.ts · `fetchFunnel`). Brand is
   * inferred server-side from the JWT — no `?brand=` query param.
   *
   * State machine (non-critical card): loading / error / empty / all-zero
   * → render nothing (same fail-soft as every other card). The all-zero
   * guard mirrors the backend's `empty_state_hint` ("Funnel is empty
   * until a campaign goes live") — we'd rather hide than render a flat
   * row of zeros.
   *
   * The first step (Impressions) has no `conversion_pct`; each subsequent
   * step shows its step-over-step conversion rate.
   */
  import { computed, onMounted } from 'vue'
  import { fetchFunnel } from '@/api/portal-admin/reports'
  import type { FunnelResponse, FunnelStep } from '@/api/portal-admin/types'
  import { useNonCriticalCard } from '@/hooks/kix/useNonCriticalCard'

  /** Normalize the `{ items }` envelope (source=true) or a bare array. */
  function normalize(raw: FunnelResponse | FunnelStep[]): FunnelStep[] {
    if (Array.isArray(raw)) return raw
    if (raw && typeof raw === 'object') return raw.items ?? []
    return []
  }

  const { data, visible, reload } = useNonCriticalCard<FunnelResponse | FunnelStep[]>(
    () => fetchFunnel(),
    /** Show only when there's a real funnel — at least one step with a
     *  non-zero count (matches the backend's own empty-state semantics). */
    { isReady: (d) => normalize(d).some((s) => s.count > 0) }
  )

  onMounted(reload)

  const steps = computed<FunnelStep[]>(() => (data.value ? normalize(data.value) : []))

  /** Widest step = funnel top. Guard against an all-zero / empty list
   *  (the card is hidden in that case, but keep the math safe). */
  const maxCount = computed<number>(() => Math.max(1, ...steps.value.map((s) => s.count)))

  function barWidth(count: number): string {
    return `${Math.round((count / maxCount.value) * 100)}%`
  }

  function fmtCount(n: number): string {
    return n.toLocaleString('en-US')
  }
</script>

<template>
  <div v-if="visible" class="art-card px-5 py-5" data-testid="funnel-card">
    <h2 class="text-base font-semibold mb-1">Conversion funnel</h2>
    <p class="text-xs text-gray-400 mb-4">Game → Reward → Register → Redeem → Return</p>

    <div class="space-y-3">
      <div v-for="(s, i) in steps" :key="i" :data-testid="`funnel-step-${i}`">
        <!-- Label row: step name (left) · count + conversion (right) -->
        <div class="flex items-baseline justify-between mb-1">
          <span class="text-sm text-gray-700">{{ s.step }}</span>
          <span class="text-sm tabular-nums">
            <span class="font-semibold">{{ fmtCount(s.count) }}</span>
            <span v-if="s.conversion_pct != null" class="text-xs text-gray-400 ml-2">
              {{ s.conversion_pct }}%
            </span>
          </span>
        </div>
        <!-- Bar track + theme-colored fill -->
        <div class="h-2.5 rounded-full bg-theme/10 overflow-hidden">
          <div
            class="h-full rounded-full bg-theme transition-all"
            :style="{ width: barWidth(s.count) }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
