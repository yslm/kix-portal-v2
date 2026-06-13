<script setup lang="ts">
  /**
   * Audiences view — rebuilt onto art-design-pro components (Week 8).
   *
   * Source: portal.html #view-audiences (lines 1822-1866). Rebuilds the
   * audiences table onto the native `ArtTable` (column-config) inside an
   * `ElCard`, with a KPI strip (card-list anatomy) and a type + search
   * toolbar. Logic in `audiences/audiencesModel.ts`.
   *
   * Endpoint: GET /api/v1/portal-admin/audiences (brand from JWT). Real
   * fields: id / name / type / size_estimate / geofence_m / created_at /
   * last_used_at. DEFERRED: the new-audience form, per-row rename, server
   * pagination.
   */
  import { computed, h, onMounted, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listAudiences } from '@/api/portal-admin/audiences'
  import type { Audience } from '@/api/portal-admin/types'
  import type { ColumnOption } from '@/types/component'
  import {
    normalizeAudiences,
    audienceKpis,
    filterAudiences,
    sizeLabel,
    AUDIENCE_FILTERS,
    type AudienceFilterKey
  } from './audiences/audiencesModel'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const all = ref<Audience[]>([])
  const typeFilter = ref<AudienceFilterKey>('all')
  const query = ref('')
  const pagination = ref({ current: 1, size: 10, total: 0 })

  const filtered = computed(() =>
    filterAudiences(all.value, { type: typeFilter.value, query: query.value })
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

  const kpis = computed(() => audienceKpis(all.value))
  const kpiCards = computed(() => [
    {
      icon: 'ri:group-2-line',
      label: 'Total audiences',
      value: kpis.value.total.toLocaleString('en-US')
    },
    {
      icon: 'ri:radar-line',
      label: 'Total reach',
      value: kpis.value.totalReach.toLocaleString('en-US')
    },
    {
      icon: 'ri:map-pin-line',
      label: 'Geofenced',
      value: kpis.value.geofenced.toLocaleString('en-US')
    },
    { icon: 'ri:price-tag-3-line', label: 'Types', value: kpis.value.types.toLocaleString('en-US') }
  ])

  const columns = computed<ColumnOption<Audience>[]>(() => [
    {
      prop: 'name',
      label: 'Audience',
      minWidth: 200,
      formatter: (r: Audience) => h('span', { class: 'font-medium text-gray-900' }, r.name)
    },
    {
      prop: 'type',
      label: 'Type',
      width: 140,
      formatter: (r: Audience) =>
        r.type
          ? h('span', { class: 'text-xs px-2 py-0.5 rounded-full bg-theme/10 text-theme' }, r.type)
          : h('span', { class: 'text-gray-400' }, '—')
    },
    {
      prop: 'size_estimate',
      label: 'Size',
      width: 120,
      align: 'right',
      formatter: (r: Audience) => h('span', { class: 'tabular-nums' }, sizeLabel(r))
    },
    {
      prop: 'geofence_m',
      label: 'Geofence',
      width: 110,
      align: 'right',
      formatter: (r: Audience) =>
        h('span', { class: 'tabular-nums' }, r.geofence_m != null ? `${r.geofence_m} m` : '—')
    },
    {
      prop: 'created_at',
      label: 'Created',
      width: 130,
      formatter: (r: Audience) => r.created_at ?? '—'
    },
    {
      prop: 'last_used_at',
      label: 'Last used',
      width: 130,
      formatter: (r: Audience) => r.last_used_at ?? '—'
    }
  ])

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listAudiences()
      all.value = normalizeAudiences(res.data)
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
  <div class="kix-audiences p-5 space-y-5">
    <header>
      <h1 class="text-2xl font-bold">{{ t('portal.audiences.title') }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ t('portal.audiences.subtitleFull') }}</p>
    </header>

    <div data-testid="audience-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            v-for="f in AUDIENCE_FILTERS"
            :key="f.key"
            :data-testid="`aud-${f.key}`"
            class="px-3 py-1 text-sm rounded-md transition-colors"
            :class="
              typeFilter === f.key
                ? 'bg-white text-theme font-medium shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            "
            @click="typeFilter = f.key"
          >
            {{ f.label }}
          </button>
        </div>
        <ElInput
          v-model="query"
          data-testid="audiences-search"
          placeholder="Search audiences…"
          clearable
          class="max-w-xs"
        />
      </div>

      <div
        v-if="error"
        data-testid="audiences-error"
        class="text-red-600 text-sm py-10 text-center"
      >
        Failed to load audiences: {{ error }}
      </div>
      <div
        v-else-if="!loading && all.length === 0"
        data-testid="audiences-empty"
        class="text-gray-400 text-sm py-12 text-center"
      >
        No audiences yet. Create one to start targeting.
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
