<script setup lang="ts">
  /**
   * Cases view (Case Studio prospects grid) — rebuilt onto art-design-pro
   * components (Week 8h).
   *
   * Source: portal.html #view-cases (lines 1730-1748), fetcher
   * `kixLoadCases()` (~line 8461). Rebuilds the prospects grid as polished
   * `.art-card` cards (company + status badge + url + tagline) plus a
   * card-list KPI strip and a status filter + search. Logic in
   * `cases/casesModel.ts`.
   *
   * Endpoint: GET /api/v1/portal-admin/case-studio/prospects (platform
   * sales tool, no ?brand=). Real fields: prospect_id / company_name /
   * primary_url / tagline / research_status.
   *
   * DEFERRED (not a restyle): "+ New case" create flow, "Open deck" /
   * "Regenerate" render-deck dance, per-prospect detail (only exists as
   * the rendered HTML deck under /landing/decks/<id>/).
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listCases, renderDeck } from '@/api/portal-admin/cases'
  import type { CaseStudy } from '@/api/portal-admin/types'
  import StatusBadge from '@/components/StatusBadge.vue'
  import {
    normalizeCases,
    displayName,
    statusBadge,
    caseKpis,
    filterCases,
    CASE_FILTERS,
    type CaseFilterKey
  } from './cases/casesModel'
  import NewCaseDialog from './cases/NewCaseDialog.vue'

  const { t } = useI18n()

  const newOpen = ref(false)
  const deckHtml = ref<string | null>(null)
  const deckLoadingId = ref<string | null>(null)

  const loading = ref(true)
  const error = ref<string | null>(null)
  const all = ref<CaseStudy[]>([])
  const filter = ref<CaseFilterKey>('all')
  const query = ref('')

  const filtered = computed(() =>
    filterCases(all.value, { filter: filter.value, query: query.value })
  )

  const kpis = computed(() => caseKpis(all.value))
  const kpiCards = computed(() => [
    { icon: 'ri:briefcase-line', label: 'Total prospects', value: kpis.value.total },
    { icon: 'ri:checkbox-circle-line', label: 'Complete', value: kpis.value.complete },
    { icon: 'ri:loader-4-line', label: 'In progress', value: kpis.value.inProgress },
    { icon: 'ri:draft-line', label: 'Draft', value: kpis.value.draft }
  ])

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listCases()
      all.value = normalizeCases(res.data)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function rowKey(c: CaseStudy, idx: number): string {
    return c.prospect_id ?? `idx-${idx}`
  }

  async function openDeck(c: CaseStudy) {
    if (!c.prospect_id) return
    deckLoadingId.value = c.prospect_id
    try {
      const res = await renderDeck(c.prospect_id)
      deckHtml.value = res.data?.html ?? '<p style="padding:2rem">Deck not available.</p>'
    } catch (e: unknown) {
      deckHtml.value = `<p style="padding:2rem;color:#b91c1c">Failed to render deck: ${
        e instanceof Error ? e.message : String(e)
      }</p>`
    } finally {
      deckLoadingId.value = null
    }
  }

  onMounted(load)
</script>

<template>
  <div class="kix-cases p-5 space-y-5">
    <header class="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold">{{ t('portal.cases.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('portal.cases.subtitle') }}</p>
      </div>
      <ElButton type="primary" data-testid="cases-new" @click="newOpen = true">+ New case</ElButton>
    </header>

    <!-- KPI strip — canonical art-design-pro card-list anatomy -->
    <div data-testid="case-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          v-for="f in CASE_FILTERS"
          :key="f.key"
          :data-testid="`case-${f.key}`"
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
        data-testid="cases-search"
        placeholder="Search prospects…"
        clearable
        class="max-w-xs"
      />
    </div>

    <!-- States -->
    <div v-if="loading" class="text-gray-400 text-sm py-10 text-center">Loading prospects…</div>

    <div v-else-if="error" data-testid="cases-error" class="text-red-600 text-sm py-10 text-center">
      Failed to load prospects: {{ error }}
    </div>

    <div
      v-else-if="all.length === 0"
      data-testid="cases-empty"
      class="art-card flex flex-col items-center justify-center text-center py-16 px-6"
    >
      <div class="size-16 rounded-2xl flex-cc bg-theme/10 mb-4">
        <ArtSvgIcon icon="ri:briefcase-line" class="text-3xl text-theme" />
      </div>
      <h2 class="text-xl font-semibold">No prospects yet</h2>
      <p class="text-sm text-gray-500 mt-2 max-w-md">
        Add a prospect to generate a three-source verified pitch deck.
      </p>
    </div>

    <!-- Prospect card grid -->
    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      data-testid="cases-grid"
    >
      <article
        v-for="(c, idx) in filtered"
        :key="rowKey(c, idx)"
        class="art-card p-5 flex flex-col gap-2"
        data-testid="case-card"
      >
        <div class="flex items-start justify-between gap-2">
          <h3 class="font-semibold text-gray-900 leading-tight">{{ displayName(c) }}</h3>
          <StatusBadge v-if="statusBadge(c)" :status="statusBadge(c)" />
        </div>
        <p v-if="c.primary_url" class="text-xs text-gray-400 font-mono break-all">
          {{ c.primary_url }}
        </p>
        <p v-if="c.tagline" class="text-sm text-gray-600 leading-relaxed">{{ c.tagline }}</p>
        <div class="mt-auto pt-2">
          <ElButton
            size="small"
            :loading="deckLoadingId === c.prospect_id"
            :data-testid="`case-deck-${rowKey(c, idx)}`"
            @click="openDeck(c)"
          >
            📊 Open deck
          </ElButton>
        </div>
      </article>
    </div>

    <NewCaseDialog v-model="newOpen" @created="load" />

    <!-- Rendered deck overlay -->
    <Teleport to="body">
      <div
        v-if="deckHtml !== null"
        data-testid="deck-modal"
        class="fixed inset-0 z-[3000] flex-cc bg-black/70 p-4"
        @click.self="deckHtml = null"
      >
        <div
          class="bg-white rounded-xl overflow-hidden flex flex-col"
          style="width: 92vw; height: 92vh"
        >
          <header class="flex items-center justify-between px-4 h-12 border-b shrink-0">
            <span class="font-semibold text-sm">Pitch deck</span>
            <button
              class="text-gray-400 hover:text-gray-700 text-xl"
              data-testid="deck-close"
              @click="deckHtml = null"
            >
              ×
            </button>
          </header>
          <iframe
            :srcdoc="deckHtml"
            class="flex-1 w-full border-0"
            title="Pitch deck"
            data-testid="deck-frame"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>
