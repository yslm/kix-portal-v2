<script setup lang="ts">
  /**
   * Geofences view (stores / locations) — rebuilt onto art-design-pro
   * components (Week 8i).
   *
   * Source: portal.html #view-geofences (lines 2161-2205), fetcher
   * `kixLoadGeofences()` (~line 4722). Rebuilds the stores table onto the
   * native `ArtTable` (column-config) inside an `ElCard`, with a KPI strip
   * and a geocoded filter + search. Logic in `geofences/geofencesModel.ts`.
   *
   * Endpoint: GET /api/v1/portal-admin/locations (brand from JWT). Real
   * fields: id / name / address / radius_m / status / place_id / lat / lng.
   *
   * DEFERRED (not a restyle): "+ Add store" slide-in form, Mapbox /
   * Nominatim address autocomplete, draggable map pin + radius slider,
   * geocoded-state capture, per-row Edit / Delete.
   */
  import { computed, h, onMounted, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listGeofences } from '@/api/portal-admin/geofences'
  import type { Location } from '@/api/portal-admin/types'
  import type { ColumnOption } from '@/types/component'
  import StatusBadge from '@/components/StatusBadge.vue'
  import {
    normalizeGeofences,
    radiusDisplay,
    statusFor,
    geofenceKpis,
    filterGeofences,
    GEOFENCE_FILTERS,
    type GeofenceFilterKey
  } from './geofences/geofencesModel'
  import AddStoreDialog from './geofences/AddStoreDialog.vue'

  const { t } = useI18n()

  const addOpen = ref(false)

  const loading = ref(true)
  const error = ref<string | null>(null)
  const all = ref<Location[]>([])
  const filter = ref<GeofenceFilterKey>('all')
  const query = ref('')
  const pagination = ref({ current: 1, size: 10, total: 0 })

  const filtered = computed(() =>
    filterGeofences(all.value, { filter: filter.value, query: query.value })
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

  const kpis = computed(() => geofenceKpis(all.value))
  const kpiCards = computed(() => [
    { icon: 'ri:store-2-line', label: 'Total stores', value: String(kpis.value.total) },
    { icon: 'ri:checkbox-circle-line', label: 'Active', value: String(kpis.value.active) },
    { icon: 'ri:map-pin-2-line', label: 'Geocoded', value: String(kpis.value.geocoded) },
    { icon: 'ri:focus-3-line', label: 'Avg radius', value: `${kpis.value.avgRadius} m` }
  ])

  const columns = computed<ColumnOption<Location>[]>(() => [
    {
      prop: 'id',
      label: 'ID',
      width: 150,
      formatter: (r: Location) =>
        h('code', { class: 'text-xs font-mono text-gray-500 break-all' }, r.id)
    },
    {
      prop: 'name',
      label: 'Store',
      minWidth: 160,
      formatter: (r: Location) => h('span', { class: 'font-medium text-gray-900' }, r.name || '—')
    },
    {
      prop: 'address',
      label: 'Address',
      minWidth: 220,
      formatter: (r: Location) => h('span', { class: 'text-gray-600' }, r.address || '—')
    },
    {
      prop: 'radius_m',
      label: 'Radius',
      width: 100,
      align: 'right',
      formatter: (r: Location) => h('span', { class: 'tabular-nums' }, radiusDisplay(r))
    },
    {
      prop: 'status',
      label: 'Status',
      width: 110,
      formatter: (r: Location) => h(StatusBadge, { status: statusFor(r) })
    }
  ])

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listGeofences()
      all.value = normalizeGeofences(res.data)
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
  <div class="kix-geofences p-5 space-y-5">
    <header class="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold">{{ t('portal.geofences.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('portal.geofences.subtitle') }}</p>
      </div>
      <ElButton type="primary" data-testid="geofence-add" @click="addOpen = true"
        >+ Add store</ElButton
      >
    </header>

    <div data-testid="geofence-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
            v-for="f in GEOFENCE_FILTERS"
            :key="f.key"
            :data-testid="`geo-${f.key}`"
            class="px-3 py-1 text-sm rounded-md transition-colors"
            :class="
              filter === f.key
                ? 'bg-white text-theme font-medium shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            "
            @click="filter = f.key"
          >
            {{ f.label }}
          </button>
        </div>
        <ElInput
          v-model="query"
          data-testid="geofences-search"
          placeholder="Search stores…"
          clearable
          class="max-w-xs"
        />
      </div>

      <div
        v-if="error"
        data-testid="geofences-error"
        class="text-red-600 text-sm py-10 text-center"
      >
        Failed to load stores: {{ error }}
      </div>
      <div
        v-else-if="!loading && all.length === 0"
        data-testid="geofences-empty"
        class="text-gray-400 text-sm py-12 text-center"
      >
        No stores yet. Add a store to create your first geofence.
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

    <AddStoreDialog v-model="addOpen" @saved="load" />
  </div>
</template>
