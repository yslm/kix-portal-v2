<script setup lang="ts">
  /**
   * Overview · 14-day new-customers line chart.
   *
   * Fetches GET /api/v1/portal-admin/reports/cohort → CohortRow[].
   * Reuses the global ArtLineChartCard component (auto-imported).
   * Self-hides on loading / error / empty via useNonCriticalCard.
   */
  import { computed, onMounted } from 'vue'
  import { fetchCohort } from '@/api/portal-admin/overview'
  import type { CohortRow } from '@/api/portal-admin/types'
  import { useNonCriticalCard } from '@/hooks/kix/useNonCriticalCard'

  const { data, visible, reload } = useNonCriticalCard<CohortRow[]>(fetchCohort, {
    isReady: (d) => d.length > 0
  })

  onMounted(reload)

  /** Last 14 rows of daily new-customer counts. */
  const chartData = computed<number[]>(() => {
    if (!data.value) return []
    const rows = data.value.slice(-14)
    return rows.map((r) => r.new_customers)
  })

  /** Sum of new customers over the 14-day window. */
  const totalValue = computed<number>(() => chartData.value.reduce((acc, n) => acc + n, 0))
</script>

<template>
  <div v-if="visible" data-testid="new-customers-chart">
    <ArtLineChartCard
      :value="totalValue"
      label="New customers · 14 days"
      :percentage="0"
      :chartData="chartData"
      :showAreaColor="true"
      :height="11"
    />
  </div>
</template>
