<script setup lang="ts">
  /**
   * Overview · Audience breakdown donut.
   *
   * Fetches GET /api/v1/portal-admin/audience-breakdown → AudienceSegment[].
   * Renders an echarts doughnut (N segments) via the global ArtRingChart
   * (auto-imported), plus a simple legend. ArtDonutChartCard only supports
   * a 2-value split so we use ArtRingChart directly (identical internals,
   * accepts N PieDataItem rows).
   *
   * Self-hides on loading / error / empty via useNonCriticalCard.
   */
  import { computed, onMounted } from 'vue'
  import { fetchAudienceBreakdown } from '@/api/portal-admin/overview'
  import type { AudienceSegment } from '@/api/portal-admin/types'
  import { useNonCriticalCard } from '@/hooks/kix/useNonCriticalCard'

  const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']

  const { data, visible, reload } = useNonCriticalCard<AudienceSegment[]>(fetchAudienceBreakdown, {
    isReady: (d) => d.length > 0
  })

  onMounted(reload)

  /** Map segments to ArtRingChart PieDataItem shape. */
  const ringData = computed(() => {
    if (!data.value) return []
    return data.value.map((seg) => ({
      value: seg.count,
      name: seg.source
    }))
  })

  /** Per-segment colours (segment.color → fallback to palette). */
  const colors = computed<string[]>(() => {
    if (!data.value) return []
    return data.value.map((seg, i) => seg.color ?? PALETTE[i % PALETTE.length])
  })
</script>

<template>
  <div v-if="visible" data-testid="audience-donut" class="art-card p-5">
    <div class="pb-3">
      <p class="text-lg font-medium">Audience breakdown</p>
    </div>

    <!-- echarts doughnut via ArtRingChart (global auto-import) -->
    <ArtRingChart
      :data="ringData"
      :color="colors"
      :radius="['60%', '85%']"
      height="10rem"
      :showLabel="false"
      :borderRadius="0"
      :showTooltip="true"
    />

    <!-- Legend rows -->
    <div class="mt-3 space-y-1.5" data-testid="audience-legend">
      <div
        v-for="(seg, i) in data"
        :key="seg.source"
        class="flex items-center gap-2 text-xs text-g-600"
      >
        <span
          class="inline-block size-2.5 rounded-full shrink-0"
          :style="{ backgroundColor: colors[i] }"
        />
        <span class="flex-1">{{ seg.source }}</span>
        <span class="tabular-nums text-g-900">{{ seg.count }} ({{ seg.pct }}%)</span>
      </div>
    </div>
  </div>
</template>
