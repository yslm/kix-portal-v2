<script setup lang="ts">
  /**
   * CustomerList view — rebuilt onto art-design-pro components (Week 8).
   *
   * Source: `kix-platform/landing/portal.html` (#view-customer-list, lines
   * 2126-2157; fetcher `kixLoadCustomers()` ~line 7303).
   *
   * Rebuilds the verified-customers table onto the native `ArtTable`
   * (column-config + formatters) inside an `ElCard`, with a KPI summary
   * strip (card-list anatomy) and a segment + search toolbar. The owner-
   * language segment badge (⭐ Regular / 🔁 Came back / ✨ New) is derived
   * client-side from the SAME real plays/redeems the row shows — ported
   * verbatim from the legacy `_seg()` (never invented).
   *
   * Endpoint: GET /api/v1/portal-admin/customers (brand from JWT). Real
   * row fields (portal_admin.py · _real_customer_rows): handle / channel /
   * first_seen / plays / redeems / last_active. Logic + KPIs + segment in
   * `customers/customersModel.ts`.
   *
   * Segment filter + name/handle search are client-side over the loaded
   * list. DEFERRED: the paginated `/customers/page` server variant +
   * Export CSV (legacy `/customers.csv`).
   */
  import { computed, h, onMounted, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listCustomers } from '@/api/portal-admin/customers'
  import type { Customer } from '@/api/portal-admin/types'
  import type { ColumnOption } from '@/types/component'
  import {
    normalizeCustomers,
    customerKpis,
    filterCustomers,
    displayName,
    segment,
    SEGMENT_FILTERS,
    type SegmentFilterKey,
    type SegmentKey
  } from './customers/customersModel'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const all = ref<Customer[]>([])

  const segmentFilter = ref<SegmentFilterKey>('all')
  const query = ref('')
  const pagination = ref({ current: 1, size: 10, total: 0 })

  const filtered = computed(() =>
    filterCustomers(all.value, { segment: segmentFilter.value, query: query.value })
  )

  const paged = computed(() => {
    const start = (pagination.value.current - 1) * pagination.value.size
    return filtered.value.slice(start, start + pagination.value.size)
  })

  watch(
    filtered,
    (rows) => {
      pagination.value.total = rows.length
      pagination.value.current = 1
    },
    { immediate: true }
  )

  const kpis = computed(() => customerKpis(all.value))
  const kpiCards = computed(() => [
    { icon: 'ri:group-line', label: 'Total customers', value: kpis.value.total },
    { icon: 'ri:vip-crown-line', label: 'Regulars', value: kpis.value.regulars },
    { icon: 'ri:gamepad-line', label: 'Total plays', value: kpis.value.totalPlays },
    { icon: 'ri:gift-line', label: 'Total redeems', value: kpis.value.totalRedeems }
  ])

  /** Tailwind badge classes per segment key. */
  const SEG_CLASS: Record<SegmentKey, string> = {
    regular: 'bg-green-50 text-green-700',
    returning: 'bg-blue-50 text-blue-700',
    new: 'bg-gray-100 text-gray-500'
  }

  const columns = computed<ColumnOption<Customer>[]>(() => [
    {
      prop: 'handle',
      label: 'Customer',
      minWidth: 200,
      formatter: (row: Customer) => {
        const seg = segment(row)
        return h('div', { class: 'flex items-center gap-2' }, [
          h('span', { class: 'font-medium text-gray-900' }, displayName(row)),
          h(
            'span',
            { class: `text-xs px-2 py-0.5 rounded-full ${SEG_CLASS[seg.key]}` },
            `${seg.emoji} ${seg.label}`
          )
        ])
      }
    },
    {
      prop: 'channel',
      label: 'Channel',
      width: 120,
      formatter: (row: Customer) =>
        row.channel && row.channel !== '—'
          ? h(
              'span',
              { class: 'text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-600' },
              row.channel
            )
          : h('span', { class: 'text-gray-400' }, '—')
    },
    {
      prop: 'first_seen',
      label: 'First seen',
      width: 130,
      formatter: (r: Customer) => r.first_seen ?? '—'
    },
    {
      prop: 'plays',
      label: 'Plays',
      width: 90,
      align: 'right',
      formatter: (r: Customer) => h('span', { class: 'tabular-nums' }, String(r.plays ?? 0))
    },
    {
      prop: 'redeems',
      label: 'Redeems',
      width: 100,
      align: 'right',
      formatter: (r: Customer) => h('span', { class: 'tabular-nums' }, String(r.redeems ?? 0))
    },
    {
      prop: 'last_active',
      label: 'Last activity',
      width: 130,
      formatter: (r: Customer) => r.last_active ?? '—'
    }
  ])

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listCustomers()
      all.value = normalizeCustomers(res.data)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function handleCurrentChange(current: number) {
    pagination.value.current = current
  }
  function handleSizeChange(size: number) {
    pagination.value.size = size
    pagination.value.current = 1
  }

  onMounted(load)
</script>

<template>
  <div class="kix-customer-list p-5 space-y-5">
    <header>
      <h1 class="text-2xl font-bold">{{ t('portal.customers.title') }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ t('portal.customers.subtitle') }}</p>
    </header>

    <!-- KPI summary strip — canonical art-design-pro card-list anatomy -->
    <div data-testid="customer-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
      <!-- Segment + search toolbar -->
      <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div class="flex items-center gap-1 rounded-lg bg-g-100 p-1">
          <button
            v-for="f in SEGMENT_FILTERS"
            :key="f.key"
            :data-testid="`seg-${f.key}`"
            class="px-3 py-1 text-sm rounded-md transition-colors"
            :class="
              segmentFilter === f.key
                ? 'bg-white text-theme font-medium shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            "
            @click="segmentFilter = f.key"
          >
            {{ f.label }}
          </button>
        </div>
        <ElInput
          v-model="query"
          data-testid="customers-search"
          placeholder="Search name or handle…"
          clearable
          class="max-w-xs"
        />
      </div>

      <!-- States -->
      <div
        v-if="error"
        data-testid="customers-error"
        class="text-red-600 text-sm py-10 text-center"
      >
        Failed to load customers: {{ error }}
      </div>
      <div
        v-else-if="!loading && all.length === 0"
        data-testid="customers-empty"
        class="text-gray-400 text-sm py-12 text-center"
      >
        No customers yet — once games go live, verified customers appear here.
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
