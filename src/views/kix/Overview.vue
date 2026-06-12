<script setup lang="ts">
  /**
   * Overview view — first real P0 view migrated from
   * `kix-platform/landing/portal.html` (lines 1305–1492).
   *
   * Plan 2 Task 2 ports ONE section (live campaigns grid) plus the page header
   * to establish the canonical per-view migration template. Remaining overview
   * sections — NBA card, setup-guide card, status-strip, metric cards, campaign
   * table, 14-day chart, audience donut, live-activity feed, create-campaign
   * CTA — are deferred to follow-up tasks (Plan 3).
   *
   * Section ported: `#kix-live-cards` grid · powered by GET
   * `/api/v1/portal/builder/live-cards?brand_id=<bid>` (see
   * `src/api/portal-admin/overview.ts`).
   *
   * State machine: loading → (data | empty | error). Each branch renders an
   * honest, non-fake placeholder — matching the trinity-fix notes in the
   * legacy file that explicitly removed hardcoded demo cards.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { fetchLiveCards } from '@/api/portal-admin/overview'
  import type { LiveCampaignCard } from '@/api/portal-admin/types'
  import { fmtSgd } from '@/utils/format/currency'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'
  import AudienceDonut from './overview/AudienceDonut.vue'
  import CampaignTable from './overview/CampaignTable.vue'
  import LiveActivity from './overview/LiveActivity.vue'
  import MetricCards from './overview/MetricCards.vue'
  import NbaCard from './overview/NbaCard.vue'
  import NewCustomersChart from './overview/NewCustomersChart.vue'
  import SetupGuideCard from './overview/SetupGuideCard.vue'
  import StatusStrip from './overview/StatusStrip.vue'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const cards = ref<LiveCampaignCard[]>([])

  const pageTitle = computed(() => t('portal.overview.title'))
  const pageSubtitle = computed(() => t('portal.overview.subtitle'))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchLiveCards(resolveBrandId())
      cards.value = res.data?.cards ?? []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<template>
  <div class="kix-overview p-8 space-y-6">
    <!-- Page header -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- Top row: 4-metric status strip (wallet / new-7d / live campaigns /
         runway). Self-hides on loading or error — non-critical card, same
         pattern as NbaCard. Sits ABOVE the SetupGuide/NBA pair. -->
    <StatusStrip />

    <!-- KPI metric card band: Impressions / Plays · clicks / Verified new
         customers / Spent · CPA. Sits directly below StatusStrip, above the
         SetupGuide/NBA pair — mirrors legacy portal.html layout (lines
         1350-1356). Self-hides on loading / error / empty array. -->
    <MetricCards />

    <!-- Middle row 1: onboarding pair · Setup guide + Suggested next move.
         Both cards self-hide on empty / error, so the grid collapses
         cleanly when neither has anything to say. Two-column on md+
         widths; single-column stacks on mobile. -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SetupGuideCard />
      <NbaCard />
    </div>

    <!-- Active campaigns table — self-hides on empty/error/loading.
         Placed here between the SetupGuide/NBA pair and the live-cards
         grid, matching the legacy portal.html order (table above cards). -->
    <CampaignTable />

    <!-- Analytics row: 14-day new-customers chart (wide) + audience donut
         + live activity feed (stacked). Each card self-hides independently.
         On mobile: single column stack. On lg+: chart spans 2 cols, the
         donut and feed sit in the 3rd col stacked. -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Chart spans 2 of 3 columns on large screens -->
      <div class="lg:col-span-2">
        <NewCustomersChart />
      </div>
      <!-- Donut + feed stacked in the 3rd column -->
      <div class="flex flex-col gap-6">
        <AudienceDonut />
        <LiveActivity />
      </div>
    </div>

    <!-- Live campaigns grid -->
    <section class="space-y-3">
      <h2 class="text-base font-semibold">Live campaigns</h2>

      <div v-if="loading" class="text-gray-400 text-sm py-6 text-center">
        Loading live campaigns…
      </div>

      <div v-else-if="error" class="text-red-600 text-sm py-6 text-center">
        Failed to load: {{ error }}
      </div>

      <div v-else-if="cards.length === 0" class="text-gray-400 text-sm py-6 text-center">
        No live campaigns yet.
      </div>

      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        data-testid="live-cards-grid"
      >
        <article
          v-for="card in cards"
          :key="card.cid"
          class="kix-live-card bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3"
        >
          <div class="flex justify-between items-start gap-2">
            <div class="font-bold text-sm text-gray-900 leading-snug">{{ card.name }}</div>
            <span
              class="inline-flex items-center gap-1 bg-green-100 text-green-800 text-[10.5px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase"
            >
              <span class="w-1.5 h-1.5 bg-green-600 rounded-full" />Live
            </span>
          </div>

          <div class="flex gap-3 text-xs text-gray-600">
            <div>
              <strong class="text-gray-900 text-base">{{ card.players }}</strong>
              <span class="text-[11px] uppercase tracking-wide ml-1">players</span>
            </div>
            <div>
              <strong class="text-gray-900 text-base">{{ card.vouchers }}</strong>
              <span class="text-[11px] uppercase tracking-wide ml-1">vouchers</span>
            </div>
            <div>
              <strong class="text-green-700 text-base">{{ card.redeems }}</strong>
              <span class="text-[11px] uppercase tracking-wide ml-1">redeemed</span>
            </div>
          </div>

          <div>
            <div class="h-1.5 rounded bg-gray-200 overflow-hidden">
              <div
                class="h-full bg-gradient-to-r from-green-500 to-green-700"
                :style="{ width: card.spend_pct + '%' }"
              />
            </div>
            <div class="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>{{ fmtSgd(card.spend_sgd) }} of {{ fmtSgd(card.budget_sgd) }}</span>
              <span>{{ card.spend_pct }}%</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
