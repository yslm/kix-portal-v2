<script setup lang="ts">
  /**
   * Builder view — rebuilt onto art-design-pro components (Week 8o).
   *
   * Source: portal.html #view-builder (lines 846-1190), endpoint POST
   * /api/v1/portal/builder/opportunity-score. Rebuilds the entry surface:
   * the opportunity-score as a hero `.art-card` (big score + progress bar +
   * improvement hints) and the 6 build blocks as polished `.art-card`s with
   * icon squares. Logic in `builder/builderModel.ts`.
   *
   * DEFERRED (large stateful feature, not a restyle): the 6 module sub-forms
   * (game/voucher/rule/schedule/safety/tournament), seasonal packs, AI
   * audience summary, save-draft / publish flow + live build overlay. Each
   * block surfaces a "coming soon" hint on click (unchanged intent).
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { defaultEmptyConfig, fetchOpportunityScore } from '@/api/portal-admin/builder'
  import type { OpportunityScore } from '@/api/portal-admin/types'
  import { BUILD_MODULES, scoreTone, potentialGain, scorePct } from './builder/builderModel'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const opp = ref<OpportunityScore | null>(null)

  const score = computed(() => opp.value?.score ?? 0)
  const pct = computed(() => scorePct(score.value))
  const tone = computed(() => scoreTone(score.value))
  const gain = computed(() => potentialGain(opp.value))

  // Tone → art-design-pro semantic colour for the score + bar.
  const toneClass = computed(() =>
    tone.value === 'high' ? 'text-success' : tone.value === 'mid' ? 'text-theme' : 'text-danger'
  )
  const barClass = computed(() =>
    tone.value === 'high' ? 'bg-success' : tone.value === 'mid' ? 'bg-theme' : 'bg-danger'
  )

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

  function openModule(id: string) {
    // Module sub-forms deferred — surface the click intent.
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(`Coming soon: ${id} form`)
    }
  }

  onMounted(load)
</script>

<template>
  <div class="kix-builder p-5 space-y-5">
    <header>
      <h1 class="text-2xl font-bold">{{ t('portal.builder.title') }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ t('portal.builder.sub') }}</p>
    </header>

    <!-- Opportunity-score hero card -->
    <div
      v-if="loading"
      data-testid="opp-score-loading"
      class="text-gray-400 text-sm py-10 text-center"
    >
      Loading opportunity score…
    </div>
    <div
      v-else-if="error"
      data-testid="opp-score-error"
      class="text-red-600 text-sm py-10 text-center"
    >
      Failed to load opportunity score: {{ error }}
    </div>

    <ElCard v-else-if="opp" shadow="never" data-testid="opp-score-card">
      <div class="flex flex-col md:flex-row md:items-center gap-6">
        <!-- Score block -->
        <div class="shrink-0 md:w-64">
          <div class="text-xs font-bold tracking-wider uppercase text-gray-500 mb-1">
            {{ t('portal.builder.opp.label') }}
          </div>
          <div class="flex items-end gap-1 leading-none">
            <span
              class="text-5xl font-extrabold tabular-nums"
              :class="toneClass"
              data-testid="opp-score-val"
              >{{ score }}</span
            >
            <span class="text-base font-semibold text-gray-400 mb-1">/100</span>
          </div>
          <div class="mt-3 h-2 w-full bg-g-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="barClass"
              :style="{ width: pct + '%' }"
            />
          </div>
          <div v-if="gain > 0" class="text-xs text-gray-400 mt-2">
            <span class="text-success font-semibold">+{{ gain }}</span> potential from the tips →
          </div>
        </div>

        <!-- Hints -->
        <ul
          v-if="opp.hints && opp.hints.length > 0"
          class="flex-1 list-none p-0 m-0 space-y-2"
          data-testid="opp-score-hints"
        >
          <li
            v-for="(h, i) in opp.hints"
            :key="i"
            class="flex items-start gap-2 text-sm text-gray-600"
          >
            <span
              class="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded bg-success/10 text-success tabular-nums"
              >+{{ h.points }}</span
            >
            <span>{{ h.label }}</span>
          </li>
        </ul>
        <div
          v-else
          class="flex-1 text-sm text-success font-semibold flex items-center"
          data-testid="opp-score-good"
        >
          {{ t('portal.builder.opp.good') }}
        </div>
      </div>
    </ElCard>

    <!-- Build blocks -->
    <ElCard shadow="never">
      <template #header>
        <span class="font-semibold text-gray-900">Build blocks</span>
      </template>
      <div
        class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
        data-testid="module-gallery"
      >
        <button
          v-for="m in BUILD_MODULES"
          :key="m.id"
          type="button"
          class="art-card flex flex-col items-center gap-3 px-3 py-5 transition-transform duration-200 hover:-translate-y-0.5"
          :data-testid="`module-${m.id}`"
          @click="openModule(m.id)"
        >
          <div class="size-12 rounded-xl flex-cc bg-theme/10">
            <ArtSvgIcon :icon="m.icon" class="text-xl text-theme" />
          </div>
          <span class="text-sm font-medium text-gray-900 text-center">{{ t(m.i18nKey) }}</span>
        </button>
      </div>
    </ElCard>
  </div>
</template>
