<script setup lang="ts">
  /**
   * Flows view — rebuilt onto art-design-pro components (Week 8f).
   *
   * Source: portal.html #view-flows (lines 1526-1730), fetcher
   * `kixLoadFlows()` (~line 8750). Rebuilds the "My flows" gallery onto
   * the native `ArtTable` (column-config) inside an `ElCard`, with a KPI
   * strip (card-list anatomy) and a status + search toolbar. Logic in
   * `flows/flowsModel.ts`.
   *
   * Endpoint: GET /api/v1/portal-admin/flows?brand=<brand_id> — brand
   * resolved via `resolveBrandId()` (mirrors legacy `KIX_BRAND_ID`).
   * Real fields: flow_id / name / status / start_date / end_date /
   * steps_count / template_id.
   *
   * Wave4 W4-C · B36: merchant-facing label is "Campaign"; wire field
   * names stay "flow" (portal.html:1532-1536). DEFERRED (large stateful
   * feature, not a restyle): the 4-step wizard (pick template → customize
   * → simulate funnel → publish), the templates grid, the simulator panel
   * and per-step preview/edit modals. "+ Create flow" routes to /builder.
   */
  import { computed, h, onMounted, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { listFlows } from '@/api/portal-admin/flows'
  import type { AutomationFlow } from '@/api/portal-admin/types'
  import type { ColumnOption } from '@/types/component'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'
  import StatusBadge from '@/components/StatusBadge.vue'
  import {
    normalizeFlows,
    flowKpis,
    filterFlows,
    templateLabel,
    dateWindow,
    FLOW_FILTERS,
    type FlowFilterKey
  } from './flows/flowsModel'

  const { t } = useI18n()
  const router = useRouter()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const all = ref<AutomationFlow[]>([])
  const statusFilter = ref<FlowFilterKey>('all')
  const query = ref('')
  const pagination = ref({ current: 1, size: 10, total: 0 })

  const filtered = computed(() =>
    filterFlows(all.value, { status: statusFilter.value, query: query.value })
  )
  const paged = computed(() => {
    const s = (pagination.value.current - 1) * pagination.value.size
    return filtered.value.slice(s, s + pagination.value.size)
  })
  watch(
    filtered,
    (rows) => {
      pagination.value.total = rows.length
      pagination.value.current = 1
    },
    { immediate: true }
  )

  const kpis = computed(() => flowKpis(all.value))
  const kpiCards = computed(() => [
    {
      icon: 'ri:flow-chart',
      label: 'Total flows',
      value: kpis.value.total.toLocaleString('en-US')
    },
    {
      icon: 'ri:play-circle-line',
      label: 'Active',
      value: kpis.value.active.toLocaleString('en-US')
    },
    {
      icon: 'ri:pause-circle-line',
      label: 'Paused',
      value: kpis.value.paused.toLocaleString('en-US')
    },
    {
      icon: 'ri:footprint-line',
      label: 'Total steps',
      value: kpis.value.totalSteps.toLocaleString('en-US')
    }
  ])

  const columns = computed<ColumnOption<AutomationFlow>[]>(() => [
    {
      prop: 'status',
      label: 'Status',
      width: 110,
      formatter: (r: AutomationFlow) => h(StatusBadge, { status: r.status })
    },
    {
      prop: 'name',
      label: 'Flow',
      minWidth: 220,
      formatter: (r: AutomationFlow) =>
        h('div', { class: 'flex flex-col' }, [
          h('span', { class: 'font-medium text-gray-900' }, r.name ?? '—'),
          h('span', { class: 'text-xs text-gray-400 font-mono' }, templateLabel(r))
        ])
    },
    {
      prop: 'steps_count',
      label: 'Steps',
      width: 90,
      align: 'right',
      formatter: (r: AutomationFlow) =>
        h('span', { class: 'tabular-nums' }, String(r.steps_count ?? 0))
    },
    {
      prop: 'window',
      label: 'Window',
      minWidth: 200,
      formatter: (r: AutomationFlow) => h('span', { class: 'text-gray-600 text-sm' }, dateWindow(r))
    }
  ])

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listFlows(resolveBrandId())
      all.value = normalizeFlows(res.data)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function handleCurrentChange(c: number) {
    pagination.value.current = c
  }
  function handleSizeChange(s: number) {
    pagination.value.size = s
    pagination.value.current = 1
  }

  onMounted(load)
</script>

<template>
  <div class="kix-flows p-5 space-y-5">
    <header class="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold">{{ t('portal.flows.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('portal.flows.subtitle') }}</p>
      </div>
      <ElButton type="primary" data-testid="flows-create" @click="router.push('/builder')">
        + Create flow
      </ElButton>
    </header>

    <div data-testid="flow-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <article
        v-for="(card, i) in kpiCards"
        :key="i"
        class="art-card relative flex flex-col justify-center h-28 px-5"
      >
        <span class="text-g-700 text-sm">{{ card.label }}</span>
        <span class="text-[26px] font-medium mt-2 tabular-nums leading-tight">{{
          card.value
        }}</span>
        <div
          class="absolute top-0 bottom-0 right-5 m-auto size-12.5 rounded-xl flex-cc bg-theme/10"
        >
          <ArtSvgIcon :icon="card.icon" class="text-xl text-theme" />
        </div>
      </article>
    </div>

    <ElCard class="art-table-card" shadow="never">
      <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div class="flex items-center gap-1 rounded-lg bg-g-100 p-1">
          <button
            v-for="f in FLOW_FILTERS"
            :key="f.key"
            :data-testid="`flow-${f.key}`"
            class="px-3 py-1 text-sm rounded-md transition-colors"
            :class="
              statusFilter === f.key
                ? 'bg-white text-theme font-medium shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            "
            @click="statusFilter = f.key"
          >
            {{ f.label }}
          </button>
        </div>
        <ElInput
          v-model="query"
          data-testid="flows-search"
          placeholder="Search flows…"
          clearable
          class="max-w-xs"
        />
      </div>

      <div v-if="error" data-testid="flows-error" class="text-red-600 text-sm py-10 text-center">
        Failed to load flows: {{ error }}
      </div>
      <div
        v-else-if="!loading && all.length === 0"
        data-testid="flows-empty"
        class="text-gray-400 text-sm py-12 text-center"
      >
        No flows yet. Build your first campaign flow to get started.
      </div>

      <ArtTable
        v-else
        :loading="loading"
        :data="paged"
        :columns="columns"
        :pagination="pagination"
        :show-table-header="false"
        @pagination:current-change="handleCurrentChange"
        @pagination:size-change="handleSizeChange"
      />
    </ElCard>
  </div>
</template>
