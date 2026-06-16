<script setup lang="ts">
  /**
   * VipTiers view — rebuilt onto art-design-pro components (Week 8k).
   *
   * Source: portal.html #view-vip-tiers (lines 2394-2412), fetchers
   * `kixLoadVipTiers()` (~line 4087) + distribution (~line 4090). Rebuilds
   * the tier ladder onto the native `ArtTable` (with member counts joined
   * in from the distribution endpoint) plus a card-list KPI strip and a
   * restyled member-distribution bar card. Logic in `vip-tiers/vipTiersModel.ts`.
   *
   * Endpoint pair: GET /loyalty-tiers (ladder) + GET
   * /loyalty-tiers/distribution (member counts; 503s when Redis is down —
   * the ladder still renders, members fall back to em-dash). Real fields:
   * name / min_xp / perk / members / sampled_members.
   *
   * DEFERRED (not a restyle): the per-row tier EDITOR (name/min_xp/perk
   * inputs + Add/Remove + "Save tiers" PUT + 422 surfacing).
   */
  import { computed, h, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listLoyaltyTiers, listLoyaltyTierDistribution } from '@/api/portal-admin/vip-tiers'
  import type { LoyaltyTier, LoyaltyTierDistribution } from '@/api/portal-admin/types'
  import type { ColumnOption } from '@/types/component'
  import {
    normalizeTiers,
    normalizeDistribution,
    mergeMembers,
    tierKpis,
    barPct,
    type LadderRow,
    type EditableTier
  } from './vip-tiers/vipTiersModel'
  import TierEditorDialog from './vip-tiers/TierEditorDialog.vue'

  const { t } = useI18n()

  const editorOpen = ref(false)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const tiers = ref<LoyaltyTier[]>([])
  const distribution = ref<LoyaltyTierDistribution[]>([])
  const sampledMembers = ref(0)
  const distError = ref<string | null>(null)

  const ladder = computed<LadderRow[]>(() => mergeMembers(tiers.value, distribution.value))
  const editableTiers = computed<EditableTier[]>(() =>
    tiers.value.map((tier) => ({
      name: tier.name ?? '',
      min_xp: Number(tier.min_xp) || 0,
      perk: tier.perk ?? ''
    }))
  )
  const kpis = computed(() => tierKpis(tiers.value, sampledMembers.value))
  const kpiCards = computed(() => [
    { icon: 'ri:vip-crown-2-line', label: 'Total tiers', value: String(kpis.value.total) },
    {
      icon: 'ri:group-line',
      label: 'Members sampled',
      value: kpis.value.sampledMembers.toLocaleString('en-US')
    },
    {
      icon: 'ri:bar-chart-box-line',
      label: 'Top threshold',
      value: `${kpis.value.topThreshold.toLocaleString('en-US')} pts`
    },
    { icon: 'ri:gift-line', label: 'Tiers with perks', value: String(kpis.value.withPerks) }
  ])

  const columns = computed<ColumnOption<LadderRow>[]>(() => [
    {
      prop: 'name',
      label: 'Tier',
      minWidth: 140,
      formatter: (r: LadderRow) => h('span', { class: 'font-semibold text-gray-900' }, r.name)
    },
    {
      prop: 'min_xp',
      label: 'From',
      width: 130,
      align: 'right',
      formatter: (r: LadderRow) =>
        h('span', { class: 'tabular-nums' }, `${(r.min_xp ?? 0).toLocaleString('en-US')} pts`)
    },
    {
      prop: 'perk',
      label: 'Perk',
      minWidth: 200,
      formatter: (r: LadderRow) => h('span', { class: 'text-gray-600' }, r.perk || '—')
    },
    {
      prop: 'members',
      label: 'Members',
      width: 110,
      align: 'right',
      formatter: (r: LadderRow) =>
        h(
          'span',
          { class: 'tabular-nums' },
          r.members != null ? r.members.toLocaleString('en-US') : '—'
        )
    }
  ])

  async function load() {
    loading.value = true
    error.value = null
    distError.value = null
    try {
      const res = await listLoyaltyTiers()
      tiers.value = normalizeTiers(res.data)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
      loading.value = false
      return
    }
    // Distribution is optional — a 503 (Redis down) still renders the ladder.
    try {
      const res = await listLoyaltyTierDistribution()
      const d = normalizeDistribution(res.data)
      distribution.value = d.rows
      sampledMembers.value = d.sampled
    } catch (e: unknown) {
      distError.value = e instanceof Error ? e.message : String(e)
      distribution.value = []
      sampledMembers.value = 0
    }
    loading.value = false
  }

  function pct(d: LoyaltyTierDistribution): number {
    return barPct(d.members, distribution.value)
  }

  onMounted(load)
</script>

<template>
  <div class="kix-vip-tiers p-5 space-y-5">
    <header class="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold">{{ t('portal.vip.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('portal.vip.subtitle') }}</p>
      </div>
      <ElButton type="primary" data-testid="vip-edit-tiers" @click="editorOpen = true">
        Edit tiers
      </ElButton>
    </header>

    <div data-testid="vip-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

    <div v-if="error" data-testid="vip-tiers-error" class="text-red-600 text-sm py-10 text-center">
      Failed to load tiers: {{ error }}
    </div>
    <div
      v-else-if="!loading && tiers.length === 0"
      data-testid="vip-tiers-empty"
      class="text-gray-400 text-sm py-12 text-center"
    >
      No tiers configured.
    </div>

    <div v-else class="space-y-5">
      <!-- Tier ladder · ArtTable with joined member counts -->
      <ElCard class="art-table-card" shadow="never" data-testid="vip-tiers-ladder">
        <template #header>
          <span class="font-semibold text-gray-900">Tier ladder</span>
        </template>
        <ArtTable :loading="loading" :data="ladder" :columns="columns" :show-table-header="false" />
      </ElCard>

      <!-- Member distribution · restyled bar card -->
      <ElCard shadow="never" data-testid="vip-tiers-distribution">
        <template #header>
          <span class="font-semibold text-gray-900">Member distribution</span>
        </template>

        <p
          v-if="distError || distribution.length === 0"
          class="text-gray-400 text-sm py-6"
          data-testid="vip-tiers-dist-empty"
        >
          No members yet — distribution appears once players start earning points.
        </p>

        <div v-else class="space-y-3">
          <div
            v-for="d in distribution"
            :key="d.name"
            class="flex items-center gap-3"
            data-testid="vip-tier-dist-row"
          >
            <span class="w-24 font-medium text-sm text-gray-900">{{ d.name }}</span>
            <div class="flex-1 h-3 bg-g-100 rounded-full overflow-hidden">
              <div
                class="h-full bg-theme rounded-full transition-all"
                :style="{ width: pct(d) + '%' }"
              />
            </div>
            <span class="w-14 text-right tabular-nums text-sm text-gray-600">{{
              d.members.toLocaleString('en-US')
            }}</span>
          </div>
          <p class="text-xs text-gray-400 pt-1">
            Sampled {{ sampledMembers.toLocaleString('en-US') }} members · real player XP
          </p>
        </div>
      </ElCard>
    </div>

    <TierEditorDialog v-model="editorOpen" :tiers="editableTiers" @saved="load" />
  </div>
</template>
