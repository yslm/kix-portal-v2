<script setup lang="ts">
  /**
   * Builder view — fifth and final P0 view migrated from
   * `kix-platform/landing/portal.html` (#view-builder, lines 846–1190).
   *
   * Plan 3 Task 5 ports ONLY the entry-level UI:
   *  - Page header (title + sub-title)
   *  - Opportunity-score card (`#kix-opp-score`) — the only DATA-driven
   *    element in this cut. Posts an empty baseline config to
   *    /api/v1/portal/builder/opportunity-score and renders the returned
   *    score + hints.
   *  - Module gallery — the 6 expandable module cards (game / voucher /
   *    rule / schedule / safety / tournament). In Plan 3 these are inert
   *    buttons that surface a "coming soon" alert; each sub-form is its
   *    own future task.
   *
   * STRICTLY OUT OF SCOPE for Plan 3 (deferred to future tasks):
   *  - #mod-game-form (template / difficulty / session / brand assets)
   *  - #mod-voucher-form (vertical / template / inventory / daily budget)
   *  - #mod-rule-form (pass rate / per-user cap / geofence / approval +
   *    dry-run + anti-fraud strip)
   *  - #mod-schedule-form (weekday picker / time window / holiday / repeat)
   *  - #mod-safety-form
   *  - #mod-tournament-form
   *  - Seasonal-pack badges (`#seasonal-packs`), AI audience summary
   *    (`#mod-audience-summary`)
   *  - Save-draft / Publish flow (`kixBuilderSaveDraft`, `kixBuilderPublish`)
   *  - Live build-progress overlay + result panels
   *
   * State machine: loading → (loaded | error). Module gallery is static
   * UI — always rendered once the page mounts. Same template as
   * Games / Campaigns / Settings / Overview.
   *
   * Endpoint: POST /api/v1/portal/builder/opportunity-score. Note the
   * namespace is `/portal/builder/`, NOT `/portal-admin/`.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { defaultEmptyConfig, fetchOpportunityScore } from '@/api/portal-admin/builder'
  import type { OpportunityScore } from '@/api/portal-admin/types'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const opp = ref<OpportunityScore | null>(null)

  const pageTitle = computed(() => t('portal.builder.title'))
  const pageSubtitle = computed(() => t('portal.builder.sub'))

  /**
   * Static module gallery — 6 cards mirroring the legacy `data-mod="…"`
   * sections (lines 879, 932, 980, 1030, 1092, 1129 in portal.html).
   * Order matches the legacy DOM order (①…⑥).
   */
  const modules = [
    { id: 'game', i18nKey: 'portal.builder.mod.game.label' },
    { id: 'voucher', i18nKey: 'portal.builder.mod.voucher.label' },
    { id: 'rule', i18nKey: 'portal.builder.mod.rule.label' },
    { id: 'schedule', i18nKey: 'portal.builder.mod.schedule.label' },
    { id: 'safety', i18nKey: 'portal.builder.mod.safety.label' },
    { id: 'tournament', i18nKey: 'portal.builder.mod.tournament.label' }
  ] as const

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchOpportunityScore(defaultEmptyConfig)
      opp.value = res.data
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Stub for Plan 3 — each sub-form gets its own future task. Until
   * then, clicking a module surface a "coming soon" alert and a console
   * log so QA can see the click registered.
   */
  function openModule(id: string) {
    console.log('[builder] open module:', id)
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`Coming soon: ${id} form`)
    }
  }

  onMounted(load)
</script>

<template>
  <div class="kix-builder p-8 space-y-6">
    <!-- Page header -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- Opportunity-score card -->
    <section
      v-if="loading"
      class="text-gray-400 text-sm py-6 text-center"
      data-testid="opp-score-loading"
    >
      Loading opportunity score…
    </section>

    <section
      v-else-if="error"
      class="text-red-600 text-sm py-6 text-center"
      data-testid="opp-score-error"
    >
      Failed to load opportunity score: {{ error }}
    </section>

    <section
      v-else-if="opp"
      class="flex items-center gap-4 bg-gradient-to-r from-green-50 to-white border border-green-200 rounded-xl px-5 py-4"
      data-testid="opp-score-card"
    >
      <div class="shrink-0">
        <div class="text-[11px] font-extrabold tracking-wider uppercase text-green-800 mb-0.5">
          {{ t('portal.builder.opp.label') }}
        </div>
        <div class="text-3xl font-extrabold text-green-700 leading-none">
          <span data-testid="opp-score-val">{{ opp.score }}</span>
          <span class="text-sm font-semibold text-gray-400">/100</span>
        </div>
      </div>
      <ul
        v-if="opp.hints && opp.hints.length > 0"
        class="flex-1 list-none p-0 m-0 text-[12.5px] text-gray-600 leading-snug space-y-1"
        data-testid="opp-score-hints"
      >
        <li v-for="(h, i) in opp.hints" :key="i">
          <strong class="text-green-700">+{{ h.points }}</strong> · {{ h.label }}
        </li>
      </ul>
      <div
        v-else
        class="flex-1 text-[12.5px] text-green-800 font-semibold"
        data-testid="opp-score-good"
      >
        {{ t('portal.builder.opp.good') }}
      </div>
    </section>

    <!-- Module gallery -->
    <section>
      <h2 class="text-lg font-semibold mb-3">Build blocks</h2>
      <div
        class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
        data-testid="module-gallery"
      >
        <button
          v-for="m in modules"
          :key="m.id"
          type="button"
          class="flex flex-col items-center gap-2 px-3 py-4 bg-white border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-sm transition text-center"
          :data-testid="`module-${m.id}`"
          @click="openModule(m.id)"
        >
          <span class="text-sm font-medium text-gray-900">{{ t(m.i18nKey) }}</span>
        </button>
      </div>
    </section>
  </div>
</template>
