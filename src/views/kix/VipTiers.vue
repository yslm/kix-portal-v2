<script setup lang="ts">
  /**
   * VipTiers view — Plan 5 Task 3.
   *
   * Source: `kix-platform/landing/portal.html`, `<section id="view-vip-tiers">`
   * (lines 2394-2412) + the legacy fetcher `kixLoadVipTiers()` (~line
   * 4087) + the row renderer `kixAddVipTier()` (~line 4119) + the save
   * handler `kixSaveVipTiers()` (~line 4127). The legacy section bundles
   * in one place:
   *
   *   - Page header + subtitle ("Reward your regulars. Members climb
   *     tiers by earning points; each tier unlocks a perk you define.")
   *     at portal.html line 2397-2398
   *   - "Save tiers" primary CTA in the top-right (line 2400,
   *     `kixSaveVipTiers()` PUTs the per-row input values back to the
   *     server, server validates lowest min_xp=0 + unique names)
   *   - Tier ladder card (line 2402-2406) — `#vip-tier-rows` filled by
   *     `kixAddVipTier()` per-tier with three `<input>` controls
   *     (name / min_xp / perk) + a "✕" remove button. "+ Add tier"
   *     button (line 2404) appends an empty row.
   *   - Inline save-status pill (`#vip-tier-status` line 2405) that
   *     flips green on success and red on 422.
   *   - Member distribution card (line 2407-2410) — `#vip-tier-dist`
   *     graphs each tier's `members` count as a horizontal bar
   *     normalised to the max bucket, plus a "Sampled N members · real
   *     player XP" subscript.
   *
   * Plan 5 T3 ports ONLY: page header + a READ-ONLY tier ladder card +
   * a READ-ONLY member-distribution card. Everything mutating is
   * DEFERRED:
   *   - Tier rule EDITOR — per-row name/min_xp/perk `<input>`s + "+ Add
   *     tier" CTA + "✕" remove button + "Save tiers" PUT + inline
   *     save-status pill. The PUT endpoint exists and is documented in
   *     `src/api/portal-admin/vip-tiers.ts`, but the editor form
   *     requires state management, 422 surfacing, and a re-load loop
   *     that goes beyond the four-state read pattern this slice ports.
   *
   * Same template as Plan 3/4/5 T1/T2: port a thin honest slice of a
   * real endpoint, defer the rest behind a clear comment. The tier
   * ladder reads like a small table (3 cols: name · min_xp · perk);
   * the distribution card reads like a bar chart (label · bar · count).
   *
   * State machine: loading → (data | empty | error). The empty state
   * fires when the brand has no saved tiers AND the server hasn't
   * fallen back to defaults — note that in practice the server ALWAYS
   * emits the 3 default tiers (`_DEFAULT_TIERS` at portal_admin.py
   * line 3520-3524) when nothing is saved, so the empty branch is
   * defensive cover for a malformed wire response, not the real
   * "no tiers configured" path.
   *
   * Endpoint pair: GET /api/v1/portal-admin/loyalty-tiers (tier ladder)
   * + GET /api/v1/portal-admin/loyalty-tiers/distribution (member
   * counts). Brand inferred from the JWT, no `?brand=` param.
   *
   * Distribution-card resilience: the distribution endpoint 503s when
   * Redis is unavailable (portal_admin.py line 3582-3583). The legacy
   * loader uses `.catch(() => null)` so the tier ladder still renders
   * when the distribution fetch fails. We mirror that intent — the
   * distribution card has its own `distError` state and falls back to
   * a flat "No members yet" placeholder mirroring the legacy fallback
   * copy at portal.html line 4111.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listLoyaltyTiers, listLoyaltyTierDistribution } from '@/api/portal-admin/vip-tiers'
  import type { LoyaltyTier, LoyaltyTierDistribution } from '@/api/portal-admin/types'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const tiers = ref<LoyaltyTier[]>([])

  // The distribution graph is independent of the tier ladder — it can
  // fail or be empty without invalidating the read of the ladder.
  // Mirrors the legacy `.catch(() => null)` swallow at portal.html
  // line 4090.
  const distribution = ref<LoyaltyTierDistribution[]>([])
  const sampledMembers = ref<number>(0)
  const distError = ref<string | null>(null)

  const pageTitle = computed(() => t('portal.vip.title'))
  const pageSubtitle = computed(() => t('portal.vip.subtitle'))

  /**
   * Max members across all distribution buckets — used to normalise the
   * horizontal bar widths to 0-100%. Mirrors the legacy `Math.max(1,
   * ...dist.distribution.map(d => d.members))` guard at portal.html
   * line 4100, where the floor of 1 prevents a divide-by-zero when
   * every tier has 0 members.
   */
  const maxBucket = computed(() => Math.max(1, ...distribution.value.map((d) => d.members)))

  function barPct(d: LoyaltyTierDistribution): number {
    return Math.round((100 * d.members) / maxBucket.value)
  }

  async function load() {
    loading.value = true
    error.value = null
    distError.value = null

    // Tier ladder — required. A failure here breaks the whole page.
    try {
      const res = await listLoyaltyTiers()
      const data = res.data
      if (data && typeof data === 'object' && Array.isArray(data.tiers)) {
        tiers.value = data.tiers
      } else if (Array.isArray(data)) {
        // Defensive: the canonical shape is `{ tiers }` but a bare
        // array is tolerated for parity with the rest of the
        // portal-admin surface (Campaigns / Audiences / Flows).
        tiers.value = data
      } else {
        tiers.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
      loading.value = false
      return
    }

    // Distribution — optional. A 503 here (Redis down) still lets us
    // render the tier ladder; only the bar-chart card shows an inline
    // fallback. Same intent as the legacy `.catch(() => null)`.
    try {
      const res = await listLoyaltyTierDistribution()
      const data = res.data
      if (data && typeof data === 'object') {
        distribution.value = Array.isArray(data.distribution) ? data.distribution : []
        sampledMembers.value = typeof data.sampled_members === 'number' ? data.sampled_members : 0
      }
    } catch (e: unknown) {
      distError.value = e instanceof Error ? e.message : String(e)
      distribution.value = []
      sampledMembers.value = 0
    }

    loading.value = false
  }

  /**
   * Row key — tier names are server-validated unique (case-insensitive,
   * see `put_loyalty_tiers` at portal_admin.py line 3567-3569) so they
   * make a safe key. The array-index fallback is defensive against
   * schema drift, matching the convention in Templates / Cases /
   * Audiences / AbTests.
   */
  function rowKey(tier: { name?: string }, idx: number): string {
    return tier.name ?? `idx-${idx}`
  }

  onMounted(load)
</script>

<template>
  <div class="kix-vip-tiers p-8 space-y-6">
    <!-- Page header (mirrors `.ent-page-head` at portal.html line 2395-2401, minus the deferred "Save tiers" CTA) -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- Tier ladder card · 4-state -->
    <section
      v-if="loading"
      class="text-gray-400 text-sm py-6 text-center"
      data-testid="vip-tiers-loading"
    >
      Loading tiers…
    </section>

    <section
      v-else-if="error"
      class="text-red-600 text-sm py-6 text-center"
      data-testid="vip-tiers-error"
    >
      Failed to load: {{ error }}
    </section>

    <!--
      Empty-state — defensive cover. The server ALWAYS falls back to the
      three default tiers (Bronze / Silver / Gold) when nothing is
      saved, so this branch only fires on a malformed wire response.
    -->
    <section
      v-else-if="tiers.length === 0"
      class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
      data-testid="vip-tiers-empty"
    >
      No tiers configured.
    </section>

    <template v-else>
      <!-- Tier ladder · read-only table (deferred editor will land in a later task) -->
      <section
        class="bg-white border border-gray-200 rounded-lg overflow-hidden"
        data-testid="vip-tiers-ladder"
      >
        <header class="px-4 py-3 border-b border-gray-100">
          <h2 class="text-sm font-semibold text-gray-900">Tier ladder</h2>
        </header>
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th class="text-left font-medium px-4 py-2 w-40">Tier</th>
              <th class="text-left font-medium px-4 py-2 w-32">From (pts)</th>
              <th class="text-left font-medium px-4 py-2">Perk</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(tier, idx) in tiers" :key="rowKey(tier, idx)" data-testid="vip-tier-row">
              <td class="px-4 py-3 font-semibold text-gray-900">{{ tier.name }}</td>
              <td class="px-4 py-3 text-gray-600 tabular-nums">{{ tier.min_xp }}</td>
              <td class="px-4 py-3 text-gray-600">{{ tier.perk || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Member distribution · independent fail/empty -->
      <section
        class="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
        data-testid="vip-tiers-distribution"
      >
        <header>
          <h2 class="text-sm font-semibold text-gray-900">Member distribution</h2>
        </header>

        <p v-if="distError" class="text-gray-400 text-sm" data-testid="vip-tiers-dist-error">
          No members yet — distribution appears once players start earning points.
        </p>

        <p
          v-else-if="distribution.length === 0"
          class="text-gray-400 text-sm"
          data-testid="vip-tiers-dist-empty"
        >
          No members yet — distribution appears once players start earning points.
        </p>

        <div v-else class="space-y-2">
          <div
            v-for="(d, idx) in distribution"
            :key="rowKey(d, idx)"
            class="flex items-center gap-3"
            data-testid="vip-tier-dist-row"
          >
            <span class="w-24 font-semibold text-sm text-gray-900">{{ d.name }}</span>
            <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full bg-blue-500 rounded-full" :style="{ width: barPct(d) + '%' }" />
            </div>
            <span class="w-12 text-right tabular-nums text-sm text-gray-600">{{ d.members }}</span>
          </div>
          <p class="text-xs text-gray-400 pt-1">
            Sampled {{ sampledMembers }} members · real player XP
          </p>
        </div>
      </section>
    </template>
  </div>
</template>
