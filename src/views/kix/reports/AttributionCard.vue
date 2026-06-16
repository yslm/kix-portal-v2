<script setup lang="ts">
  /**
   * Reports · Attribution by channel.
   *
   * Ports the legacy attribution report (portal.html ~5018 → GET
   * /reports/attribution?window=<w>). Multi-touch credit per channel
   * across four models (last-click / first-touch / linear / time-decay),
   * with a window selector. Non-critical card — self-hides on loading /
   * error / empty, same fail-soft as the other Reports sections.
   */
  import { ref, computed, onMounted, watch } from 'vue'
  import { fetchAttribution } from '@/api/portal-admin/reports'
  import type { AttributionResponse, AttributionRow } from '@/api/portal-admin/types'
  import { useNonCriticalCard } from '@/hooks/kix/useNonCriticalCard'

  const WINDOWS = [
    { value: '1d_click', label: '1-day click' },
    { value: '7d_click', label: '7-day click' },
    { value: '28d_click', label: '28-day click' },
    { value: '1d_view', label: '1-day view' }
  ]
  const windowSel = ref('7d_click')

  function rows(raw: AttributionResponse | null): AttributionRow[] {
    return raw?.items ?? []
  }

  const { data, visible, reload } = useNonCriticalCard<AttributionResponse>(
    () => fetchAttribution(windowSel.value),
    { isReady: (d) => rows(d).length > 0 }
  )

  const items = computed(() => rows(data.value))

  watch(windowSel, () => reload())
  onMounted(reload)

  function fmt(n?: number): string {
    return typeof n === 'number' ? n.toLocaleString('en-US') : '—'
  }
</script>

<template>
  <div v-if="visible" class="art-card" data-testid="attribution-card">
    <div class="flex items-center justify-between px-5 pt-5 pb-3">
      <h2 class="text-base font-semibold">Attribution by channel</h2>
      <ElSelect v-model="windowSel" size="small" style="width: 150px" data-testid="attr-window">
        <ElOption v-for="w in WINDOWS" :key="w.value" :label="w.label" :value="w.value" />
      </ElSelect>
    </div>

    <ElTable
      :data="items"
      :border="false"
      :stripe="false"
      :header-cell-style="{ background: 'transparent', fontWeight: '600', fontSize: '12px' }"
      style="width: 100%"
      data-testid="attribution-el-table"
    >
      <ElTableColumn label="Channel" min-width="200">
        <template #default="{ row }">
          <span class="font-medium text-gray-900">{{ row.channel }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="Last click" width="120" align="right">
        <template #default="{ row }"
          ><span class="tabular-nums">{{ fmt(row.last_click) }}</span></template
        >
      </ElTableColumn>
      <ElTableColumn label="First touch" width="120" align="right">
        <template #default="{ row }"
          ><span class="tabular-nums">{{ fmt(row.first_touch) }}</span></template
        >
      </ElTableColumn>
      <ElTableColumn label="Linear" width="110" align="right">
        <template #default="{ row }"
          ><span class="tabular-nums">{{ fmt(row.linear) }}</span></template
        >
      </ElTableColumn>
      <ElTableColumn label="Time decay" width="120" align="right">
        <template #default="{ row }"
          ><span class="tabular-nums">{{ fmt(row.time_decay) }}</span></template
        >
      </ElTableColumn>
    </ElTable>
  </div>
</template>
