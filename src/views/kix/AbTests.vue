<script setup lang="ts">
  /**
   * AbTests view — rebuilt onto art-design-pro components (Week 8).
   *
   * Source: portal.html #view-abtests (lines 1911-1928). Native `ArtTable`
   * + KPI strip + status filter + search. Logic in
   * `abtests/abTestsModel.ts`. Endpoint: GET /api/v1/portal-admin/ab-tests
   * (brand from JWT). Real fields: id / name / campaign_a_name /
   * campaign_b_name / metric / status / lift_pct / p_value / winner.
   * Lift is colour-coded by sign. DEFERRED: create modal, results
   * dashboard, ship-winner CTA.
   */
  import { computed, h, onMounted, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listAbTests } from '@/api/portal-admin/ab-tests'
  import type { AbTest } from '@/api/portal-admin/types'
  import type { ColumnOption } from '@/types/component'
  import StatusBadge from '@/components/StatusBadge.vue'
  import {
    normalizeAbTests,
    abTestKpis,
    filterAbTests,
    liftLabel,
    pValueLabel,
    ABTEST_FILTERS,
    type AbTestFilterKey
  } from './abtests/abTestsModel'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const all = ref<AbTest[]>([])
  const statusFilter = ref<AbTestFilterKey>('all')
  const query = ref('')
  const pagination = ref({ current: 1, size: 10, total: 0 })

  const filtered = computed(() =>
    filterAbTests(all.value, { status: statusFilter.value, query: query.value })
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

  const kpis = computed(() => abTestKpis(all.value))
  const kpiCards = computed(() => [
    { icon: 'ri:flask-line', label: 'Total tests', value: kpis.value.total },
    { icon: 'ri:loader-4-line', label: 'Running', value: kpis.value.running },
    { icon: 'ri:check-double-line', label: 'Significant', value: kpis.value.significant },
    { icon: 'ri:rocket-2-line', label: 'Shipped', value: kpis.value.shipped }
  ])

  const columns = computed<ColumnOption<AbTest>[]>(() => [
    {
      prop: 'name',
      label: 'Test',
      minWidth: 180,
      formatter: (r: AbTest) => h('span', { class: 'font-medium text-gray-900' }, r.name ?? '—')
    },
    {
      prop: 'variants',
      label: 'A vs B',
      minWidth: 200,
      formatter: (r: AbTest) =>
        h(
          'span',
          { class: 'text-sm text-gray-600' },
          `${r.campaign_a_name ?? 'A'} vs ${r.campaign_b_name ?? 'B'}`
        )
    },
    {
      prop: 'metric',
      label: 'Metric',
      width: 110,
      formatter: (r: AbTest) => r.metric ?? '—'
    },
    {
      prop: 'lift_pct',
      label: 'Lift',
      width: 90,
      align: 'right',
      formatter: (r: AbTest) =>
        h(
          'span',
          {
            class: `tabular-nums font-semibold ${
              r.lift_pct == null ? '' : r.lift_pct >= 0 ? 'text-success' : 'text-danger'
            }`
          },
          liftLabel(r)
        )
    },
    {
      prop: 'p_value',
      label: 'p-value',
      width: 90,
      align: 'right',
      formatter: (r: AbTest) => h('span', { class: 'tabular-nums' }, pValueLabel(r))
    },
    {
      prop: 'status',
      label: 'Status',
      width: 120,
      formatter: (r: AbTest) => h(StatusBadge, { status: r.status })
    }
  ])

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listAbTests()
      all.value = normalizeAbTests(res.data)
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
  <div class="kix-abtests p-5 space-y-5">
    <header>
      <h1 class="text-2xl font-bold">{{ t('portal.abtests.title') }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ t('portal.abtests.subtitle') }}</p>
    </header>

    <div data-testid="abtest-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            v-for="f in ABTEST_FILTERS"
            :key="f.key"
            :data-testid="`abt-${f.key}`"
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
          data-testid="abtests-search"
          placeholder="Search tests…"
          clearable
          class="max-w-xs"
        />
      </div>

      <div v-if="error" data-testid="abtests-error" class="text-red-600 text-sm py-10 text-center">
        Failed to load A/B tests: {{ error }}
      </div>
      <div
        v-else-if="!loading && all.length === 0"
        data-testid="abtests-empty"
        class="text-gray-400 text-sm py-12 text-center"
      >
        No A/B tests yet — compare two campaigns to start one.
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
