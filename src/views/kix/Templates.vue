<script setup lang="ts">
  /**
   * Templates view — rebuilt onto art-design-pro components (Week 8g).
   *
   * Source: portal.html #view-templates (lines 1753-1777), fetcher
   * `kixLoadTemplates()` (~line 8235), renderer `_kixRenderTemplates()`
   * (~line 8177). Rebuilds the catalog as polished `.art-card` template
   * cards (cover image with a deterministic gradient+emoji fallback keyed
   * by slug, name, slug, "Ready" badge) plus a card-list KPI strip and a
   * Ready/Catalog filter + name search. Logic in `templates/templatesModel.ts`.
   *
   * Endpoint: GET /api/v1/portal-admin/games/templates (brand from JWT).
   * Real fields: slug / name / cover_url / reskinable.
   *
   * DEFERRED (large surfaces, not a restyle): sort dropdown (4 orders),
   * rank/Trending/"Coming soon" badges, star ratings + peer-count + ROI
   * signals, detail slide-over + Try-demo iframe modal, server pagination /
   * "Load more", Nano-Banana cover hydration. "Use template" → /builder.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { listTemplates } from '@/api/portal-admin/templates'
  import type { Template } from '@/api/portal-admin/types'
  import StatusBadge from '@/components/StatusBadge.vue'
  import {
    normalizeTemplates,
    displayName,
    templateKpis,
    filterTemplates,
    coverFallback,
    TEMPLATE_FILTERS,
    type TemplateFilterKey
  } from './templates/templatesModel'

  const { t } = useI18n()
  const router = useRouter()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const all = ref<Template[]>([])
  const filter = ref<TemplateFilterKey>('all')
  const query = ref('')

  const filtered = computed(() =>
    filterTemplates(all.value, { filter: filter.value, query: query.value })
  )

  const kpis = computed(() => templateKpis(all.value))
  const kpiCards = computed(() => [
    { icon: 'ri:layout-grid-line', label: 'Total templates', value: kpis.value.total },
    { icon: 'ri:magic-line', label: 'Ready to generate', value: kpis.value.ready },
    { icon: 'ri:archive-line', label: 'Catalog only', value: kpis.value.catalog },
    { icon: 'ri:price-tag-3-line', label: 'Game types', value: kpis.value.types }
  ])

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listTemplates()
      all.value = normalizeTemplates(res.data)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function useTemplate() {
    // Detail panel / Try-demo modal deferred — route to the build surface.
    router.push('/builder')
  }

  onMounted(load)
</script>

<template>
  <div class="kix-templates p-5 space-y-5">
    <header class="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold">{{ t('portal.templates.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('portal.templates.subtitle') }}</p>
      </div>
    </header>

    <!-- KPI strip — canonical art-design-pro card-list anatomy -->
    <div data-testid="template-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          v-for="f in TEMPLATE_FILTERS"
          :key="f.key"
          :data-testid="`tpl-${f.key}`"
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
        data-testid="templates-search"
        placeholder="Search templates…"
        clearable
        class="max-w-xs"
      />
    </div>

    <!-- States -->
    <div v-if="loading" class="text-gray-400 text-sm py-10 text-center">Loading templates…</div>

    <div
      v-else-if="error"
      data-testid="templates-error"
      class="text-red-600 text-sm py-10 text-center"
    >
      Failed to load templates: {{ error }}
    </div>

    <div
      v-else-if="all.length === 0"
      data-testid="templates-empty"
      class="art-card flex flex-col items-center justify-center text-center py-16 px-6"
    >
      <div class="size-16 rounded-2xl flex-cc bg-theme/10 mb-4">
        <ArtSvgIcon icon="ri:layout-grid-line" class="text-3xl text-theme" />
      </div>
      <h2 class="text-xl font-semibold">No templates available</h2>
      <p class="text-sm text-gray-500 mt-2 max-w-md">
        The game template catalog is empty for this brand. Check back soon.
      </p>
    </div>

    <!-- Card gallery -->
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      data-testid="templates-grid"
    >
      <article
        v-for="(tpl, idx) in filtered"
        :key="tpl.slug ?? `idx-${idx}`"
        class="art-card overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5 cursor-pointer"
        data-testid="template-card"
        @click="useTemplate"
      >
        <!-- Cover: real image, else deterministic gradient + emoji -->
        <div class="relative h-32 flex-cc">
          <img
            v-if="tpl.cover_url"
            :src="tpl.cover_url"
            :alt="displayName(tpl)"
            class="absolute inset-0 size-full object-cover"
          />
          <div
            v-else
            class="absolute inset-0 flex-cc text-4xl"
            :style="{ background: coverFallback(tpl).gradient }"
          >
            {{ coverFallback(tpl).emoji }}
          </div>
          <StatusBadge v-if="tpl.reskinable" status="active" class="absolute top-2 right-2" />
        </div>

        <!-- Body -->
        <div class="p-4 flex flex-col gap-1 flex-1">
          <h3 class="font-semibold text-gray-900 leading-tight">{{ displayName(tpl) }}</h3>
          <p v-if="tpl.slug" class="text-xs text-gray-400 font-mono">{{ tpl.slug }}</p>
        </div>
      </article>
    </div>
  </div>
</template>
