<script setup lang="ts">
  /**
   * Creatives view (asset library) — rebuilt onto art-design-pro
   * components (Week 8j).
   *
   * Source: portal.html #view-creatives (lines 1871-1907), fetcher
   * `kixLoadCreatives()` (~line 6907). Rebuilds the asset library as
   * polished `.art-card` cards (kind icon + filename + size + uploaded)
   * plus a card-list KPI strip and a kind filter + filename search. Logic
   * in `creatives/creativesModel.ts`.
   *
   * Endpoint: GET /api/v1/portal/settings/creatives/<brand_id> (settings
   * router, brand in the path; defaults to demo_brand). Real fields:
   * asset_id / filename / kind / bytes / uploaded_at.
   *
   * DEFERRED (not a restyle): "+ Upload asset" file input + POST, brand-kit
   * hero card (logo/colours/typography tiles — pure decoration), per-card
   * preview thumbnail, edit/delete, server pagination.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listCreatives } from '@/api/portal-admin/creatives'
  import type { CreativeAsset } from '@/api/portal-admin/types'
  import {
    normalizeCreatives,
    kindFor,
    sizeFor,
    uploadedAtFor,
    creativeKpis,
    filterCreatives,
    CREATIVE_FILTERS,
    type CreativeFilterKey
  } from './creatives/creativesModel'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const all = ref<CreativeAsset[]>([])
  const filter = ref<CreativeFilterKey>('all')
  const query = ref('')

  const filtered = computed(() =>
    filterCreatives(all.value, { filter: filter.value, query: query.value })
  )

  const kpis = computed(() => creativeKpis(all.value))
  const kpiCards = computed(() => [
    { icon: 'ri:image-2-line', label: 'Total assets', value: String(kpis.value.total) },
    { icon: 'ri:image-line', label: 'Images', value: String(kpis.value.images) },
    { icon: 'ri:video-line', label: 'Videos', value: String(kpis.value.videos) },
    { icon: 'ri:hard-drive-2-line', label: 'Total size', value: kpis.value.totalSize }
  ])

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listCreatives()
      all.value = normalizeCreatives(res.data)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function iconFor(asset: CreativeAsset): string {
    return kindFor(asset) === 'video' ? 'ri:film-line' : 'ri:image-line'
  }

  function rowKey(asset: CreativeAsset, idx: number): string {
    return asset.asset_id ?? asset.filename ?? `idx-${idx}`
  }

  onMounted(load)
</script>

<template>
  <div class="kix-creatives p-5 space-y-5">
    <header>
      <h1 class="text-2xl font-bold">{{ t('portal.creatives.title') }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ t('portal.creatives.subtitle') }}</p>
    </header>

    <div data-testid="creative-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-1 rounded-lg bg-g-100 p-1">
        <button
          v-for="f in CREATIVE_FILTERS"
          :key="f.key"
          :data-testid="`creative-${f.key}`"
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
        data-testid="creatives-search"
        placeholder="Search files…"
        clearable
        class="max-w-xs"
      />
    </div>

    <!-- States -->
    <div v-if="loading" class="text-gray-400 text-sm py-10 text-center">Loading creatives…</div>

    <div
      v-else-if="error"
      data-testid="creatives-error"
      class="text-red-600 text-sm py-10 text-center"
    >
      Failed to load creatives: {{ error }}
    </div>

    <div
      v-else-if="all.length === 0"
      data-testid="creatives-empty"
      class="art-card flex flex-col items-center justify-center text-center py-16 px-6"
    >
      <div class="size-16 rounded-2xl flex-cc bg-theme/10 mb-4">
        <ArtSvgIcon icon="ri:image-2-line" class="text-3xl text-theme" />
      </div>
      <h2 class="text-xl font-semibold">No uploads yet</h2>
      <p class="text-sm text-gray-500 mt-2 max-w-md">
        Upload logos, hero images, and video to auto-embed them into every game you ship.
      </p>
    </div>

    <!-- Asset card gallery -->
    <div
      v-else
      class="grid gap-4"
      style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr))"
      data-testid="creatives-grid"
    >
      <article
        v-for="(asset, idx) in filtered"
        :key="rowKey(asset, idx)"
        class="art-card p-4 flex flex-col gap-3"
        data-testid="creatives-card"
      >
        <div class="flex items-center justify-between">
          <div class="size-10 rounded-lg flex-cc bg-theme/10">
            <ArtSvgIcon :icon="iconFor(asset)" class="text-lg text-theme" />
          </div>
          <span class="text-xs uppercase tracking-wide text-gray-400">{{ kindFor(asset) }}</span>
        </div>
        <div class="font-semibold text-sm text-gray-900 break-all leading-tight">
          {{ asset.filename || '—' }}
        </div>
        <div class="text-xs text-gray-500 tabular-nums mt-auto">
          {{ sizeFor(asset) }} · {{ uploadedAtFor(asset) }}
        </div>
      </article>
    </div>
  </div>
</template>
