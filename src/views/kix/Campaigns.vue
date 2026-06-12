<script setup lang="ts">
  /**
   * Campaigns view — rebuilt onto art-design-pro components (Week 8).
   *
   * Source: `kix-platform/landing/portal.html` (#view-campaigns, lines
   * 1785-1817; fetcher `kixLoadCampaignsList()` ~line 5321).
   *
   * Replaces the original hand-rolled `<table>` with the native
   * art-design-pro `ArtTable` (column-config + formatters) inside an
   * `ElCard`, plus a KPI summary strip (the canonical card-list anatomy:
   * `.art-card` + `bg-theme/10 text-theme` icon square — same as Overview
   * MetricCards / dashboard `card-list.vue`) and a filter toolbar.
   *
   * Endpoint: GET /api/v1/portal-admin/campaigns (bare array; brand from
   * the JWT). Field reconciliation against the REAL backend Campaign model
   * lives in `campaigns/campaignsModel.ts` — every numeric prefers the
   * real field (`spend_sgd` / `new_customers` / `cpa_sgd`) and falls back
   * to the legacy alias, never fabricating a missing value. The legacy
   * "Budget" column is DROPPED (backend has no budget field — it was
   * always an em-dash).
   *
   * Status filter + name search are client-side over the loaded list (the
   * legacy filter/search bars were pure decoration; the backend DOES
   * support `?status=` but the list is small, so we filter in-memory and
   * keep one round-trip). "Create campaign" routes to the Builder.
   */
  import { computed, h, onMounted, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { listCampaigns } from '@/api/portal-admin/campaigns'
  import type { Campaign } from '@/api/portal-admin/types'
  import type { ColumnOption } from '@/types/component'
  import StatusBadge from '@/components/StatusBadge.vue'
  import { fmtSgd } from '@/utils/format/currency'
  import {
    normalizeCampaigns,
    campaignKpis,
    filterCampaigns,
    spendLabel,
    cpaLabel,
    conversionsOf,
    ctrLabel,
    STATUS_FILTERS,
    type StatusFilterKey
  } from './campaigns/campaignsModel'

  const { t } = useI18n()
  const router = useRouter()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const all = ref<Campaign[]>([])

  const statusFilter = ref<StatusFilterKey>('all')
  const query = ref('')

  const pagination = ref({ current: 1, size: 10, total: 0 })

  const filtered = computed(() =>
    filterCampaigns(all.value, { status: statusFilter.value, query: query.value })
  )

  /** Client-side page slice. Lists are small; keeps the art-design-pro
   *  pager footer without a server round-trip per page. */
  const paged = computed(() => {
    const start = (pagination.value.current - 1) * pagination.value.size
    return filtered.value.slice(start, start + pagination.value.size)
  })

  // Reset to page 1 and re-sync total whenever the filter result changes.
  watch(
    filtered,
    (rows) => {
      pagination.value.total = rows.length
      pagination.value.current = 1
    },
    { immediate: true }
  )

  const kpis = computed(() => campaignKpis(all.value))
  const kpiCards = computed(() => [
    { icon: 'ri:megaphone-line', label: 'Total campaigns', value: String(kpis.value.total) },
    { icon: 'ri:play-circle-line', label: 'Active now', value: String(kpis.value.active) },
    { icon: 'ri:wallet-3-line', label: 'Total spend', value: fmtSgd(kpis.value.totalSpendSgd) },
    {
      icon: 'ri:user-add-line',
      label: 'New customers',
      value: kpis.value.totalNewCustomers.toLocaleString('en-US')
    }
  ])

  /** ArtTable column config. Formatters return VNodes — real fields
   *  preferred, em-dash on absence (see campaignsModel accessors). */
  const columns = computed<ColumnOption<Campaign>[]>(() => [
    {
      prop: 'status',
      label: 'Status',
      width: 110,
      formatter: (row: Campaign) => h(StatusBadge, { status: row.status })
    },
    {
      prop: 'name',
      label: 'Campaign',
      minWidth: 160,
      formatter: (row: Campaign) =>
        h('div', [
          h('div', { class: 'font-medium text-gray-900 leading-tight' }, row.name),
          row.objective || row.game_type
            ? h(
                'div',
                { class: 'text-xs text-gray-400 mt-0.5' },
                [row.objective, row.game_type].filter(Boolean).join(' · ')
              )
            : null
        ])
    },
    {
      prop: 'spend_sgd',
      label: 'Spend',
      width: 100,
      align: 'right',
      formatter: (row: Campaign) => h('span', { class: 'tabular-nums' }, spendLabel(row))
    },
    {
      prop: 'impressions',
      label: 'Impressions',
      width: 110,
      align: 'right',
      formatter: (row: Campaign) =>
        h('span', { class: 'tabular-nums' }, row.impressions?.toLocaleString('en-US') ?? '—')
    },
    {
      prop: 'plays',
      label: 'Plays',
      width: 90,
      align: 'right',
      formatter: (row: Campaign) =>
        h('span', { class: 'tabular-nums' }, row.plays?.toLocaleString('en-US') ?? '—')
    },
    {
      prop: 'new_customers',
      label: 'New customers',
      width: 120,
      align: 'right',
      formatter: (row: Campaign) => {
        const v = conversionsOf(row)
        return h('span', { class: 'tabular-nums' }, v == null ? '—' : v.toLocaleString('en-US'))
      }
    },
    {
      prop: 'cpa_sgd',
      label: 'CPA',
      width: 90,
      align: 'right',
      formatter: (row: Campaign) => h('span', { class: 'tabular-nums' }, cpaLabel(row))
    },
    {
      prop: 'ctr_pct',
      label: 'CTR',
      width: 80,
      align: 'right',
      formatter: (row: Campaign) => h('span', { class: 'tabular-nums' }, ctrLabel(row))
    }
  ])

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listCampaigns()
      all.value = normalizeCampaigns(res.data)
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

  function createCampaign() {
    router.push('/builder')
  }

  onMounted(load)
</script>

<template>
  <div class="kix-campaigns p-5 space-y-5">
    <!-- Page header + primary CTA -->
    <header class="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold">{{ t('portal.campaigns.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('portal.campaigns.subtitle') }}</p>
      </div>
      <ElButton type="primary" data-testid="create-campaign" @click="createCampaign">
        + Create campaign
      </ElButton>
    </header>

    <!-- KPI summary strip — canonical art-design-pro card-list anatomy -->
    <div data-testid="campaign-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

    <!-- Table card -->
    <ElCard class="art-table-card" shadow="never">
      <!-- Filter toolbar: status segmented + name search -->
      <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div class="flex items-center gap-1 rounded-lg bg-g-100 p-1">
          <button
            v-for="f in STATUS_FILTERS"
            :key="f.key"
            :data-testid="`filter-${f.key}`"
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
          data-testid="campaigns-search"
          placeholder="Search campaigns…"
          clearable
          class="max-w-xs"
        />
      </div>

      <!-- States -->
      <div
        v-if="error"
        data-testid="campaigns-error"
        class="text-red-600 text-sm py-10 text-center"
      >
        Failed to load campaigns: {{ error }}
      </div>
      <div
        v-else-if="!loading && all.length === 0"
        data-testid="campaigns-empty"
        class="text-gray-400 text-sm py-12 text-center"
      >
        No campaigns yet — head to Games to launch one.
      </div>

      <!-- ArtTable -->
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
