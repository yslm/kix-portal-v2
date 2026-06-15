<script setup lang="ts">
  /**
   * Rewards (consolidated) view — rebuilt onto art-design-pro components
   * (Week 8m). Consolidates the legacy vouchers + coupons-qr + game-rewards
   * + prizes sections into one 4-tab view.
   *
   * Source: portal.html #view-coupons-qr (lines 2485-2581), fetcher
   * `kixLoadPrizes()` (~line 5728). Rebuilds the Templates tab as a
   * card-list KPI strip + polished `.art-card` template cards inside
   * native `ElTabs`. Logic in `rewards/rewardsModel.ts`.
   *
   * Endpoint (Templates only): GET /api/v1/prizes?brand_id=<resolveBrandId>.
   * Real fields: prize_id / name / type / offer_type / inventory_count /
   * original_price_cents / status.
   *
   * DEFERRED (not a restyle): the Templates new-template form + delete +
   * expiry flag; the Game links / Issuance / Redemption tabs (kept as
   * restyled "coming soon" panels naming the legacy fetcher each needs).
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listRewardTemplates } from '@/api/portal-admin/rewards'
  import type { RewardTemplate, RewardsTabId } from '@/api/portal-admin/types'
  import StatusBadge from '@/components/StatusBadge.vue'
  import {
    normalizeTemplates,
    valueFor,
    inventoryFor,
    subtypeFor,
    rewardKpis,
    filterTemplates,
    REWARD_FILTERS,
    type RewardFilterKey
  } from './rewards/rewardsModel'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const all = ref<RewardTemplate[]>([])
  const activeTab = ref<RewardsTabId>('templates')
  const filter = ref<RewardFilterKey>('all')
  const query = ref('')

  const filtered = computed(() =>
    filterTemplates(all.value, { filter: filter.value, query: query.value })
  )

  const kpis = computed(() => rewardKpis(all.value))
  const kpiCards = computed(() => [
    { icon: 'ri:coupon-3-line', label: 'Total templates', value: String(kpis.value.total) },
    { icon: 'ri:checkbox-circle-line', label: 'Active', value: String(kpis.value.active) },
    { icon: 'ri:money-dollar-circle-line', label: 'Catalog value', value: kpis.value.totalValue },
    { icon: 'ri:archive-2-line', label: 'Limited stock', value: String(kpis.value.limited) }
  ])

  function rowKey(tpl: RewardTemplate, idx: number): string {
    return tpl.prize_id ?? tpl.id ?? tpl.name ?? `idx-${idx}`
  }

  async function loadTemplates() {
    loading.value = true
    error.value = null
    try {
      const res = await listRewardTemplates()
      all.value = normalizeTemplates(res.data)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(loadTemplates)
</script>

<template>
  <div class="kix-rewards p-5 space-y-5">
    <header>
      <h1 class="text-2xl font-bold">{{ t('portal.rewards.title') }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ t('portal.rewards.subtitle') }}</p>
    </header>

    <!-- KPI strip (templates aggregates) -->
    <div data-testid="rewards-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

    <ElCard shadow="never">
      <ElTabs v-model="activeTab" data-testid="rewards-tabs">
        <ElTabPane label="Templates" name="templates">
          <!-- Toolbar -->
          <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div class="flex items-center gap-1 rounded-lg bg-g-100 p-1">
              <button
                v-for="f in REWARD_FILTERS"
                :key="f.key"
                :data-testid="`reward-${f.key}`"
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
              data-testid="rewards-search"
              placeholder="Search templates…"
              clearable
              class="max-w-xs"
            />
          </div>

          <div
            v-if="loading"
            data-testid="rewards-templates-loading"
            class="text-gray-400 text-sm py-10 text-center"
          >
            Loading templates…
          </div>
          <div
            v-else-if="error"
            data-testid="rewards-templates-error"
            class="text-red-600 text-sm py-10 text-center"
          >
            Failed to load templates: {{ error }}
          </div>
          <div
            v-else-if="all.length === 0"
            data-testid="rewards-templates-empty"
            class="text-gray-400 text-sm py-12 text-center"
          >
            No reward templates yet.
          </div>

          <div
            v-else
            class="grid gap-4"
            data-testid="rewards-templates-grid"
            style="grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))"
          >
            <article
              v-for="(tpl, idx) in filtered"
              :key="rowKey(tpl, idx)"
              class="art-card p-4 flex flex-col gap-2"
              data-testid="rewards-template-card"
            >
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-semibold text-sm text-gray-900 break-words leading-tight">
                  {{ tpl.name }}
                </h3>
                <StatusBadge v-if="tpl.status" :status="tpl.status" />
              </div>
              <span
                v-if="subtypeFor(tpl)"
                class="self-start text-xs px-2 py-0.5 rounded-full bg-theme/10 text-theme"
              >
                {{ subtypeFor(tpl) }}
              </span>
              <p v-if="valueFor(tpl)" class="text-xl font-bold tabular-nums mt-auto">
                {{ valueFor(tpl) }}
              </p>
              <p class="text-xs text-gray-400">Inventory: {{ inventoryFor(tpl) }}</p>
            </article>
          </div>
        </ElTabPane>

        <ElTabPane label="Game links" name="game-links">
          <div data-testid="rewards-panel-game-links" class="text-gray-400 py-12 text-center">
            <p class="font-medium text-gray-500">Game-link bindings coming soon.</p>
            <p class="text-xs mt-2">Defer: per-game prize + voucher tier configuration.</p>
          </div>
        </ElTabPane>

        <ElTabPane label="Issuance" name="issuance">
          <div data-testid="rewards-panel-issuance" class="text-gray-400 py-12 text-center">
            <p class="font-medium text-gray-500">Issuance history coming soon.</p>
            <p class="text-xs mt-2">Defer: per-customer voucher issuance log + filters.</p>
          </div>
        </ElTabPane>

        <ElTabPane label="Redemption" name="redemption">
          <div data-testid="rewards-panel-redemption" class="text-gray-400 py-12 text-center">
            <p class="font-medium text-gray-500">Redemption tracking coming soon.</p>
            <p class="text-xs mt-2">Defer: real-time redemption log + QR scan stats.</p>
          </div>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>
