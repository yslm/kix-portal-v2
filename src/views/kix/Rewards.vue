<script setup lang="ts">
  /**
   * Rewards (consolidated) view — Plan 5 Task 8 (LAST in Plan 5).
   *
   * Replaces FOUR overlapping legacy sections per the Plan 5 audit:
   *
   *   - `<section id="view-coupons-qr">` (~96 lines, portal.html line
   *     2485-2581) — 4-tab unified: templates / game links / issuance
   *     / redemption. The "master" surface; the other three sections
   *     overlap 90% with its tabs.
   *   - `<section id="view-vouchers">` (~140 lines) — 3-tab pool /
   *     redeem / QR. Folds into the issuance + redemption tabs.
   *   - `<section id="view-prizes">` (~46 lines) — prize templates
   *     (duplicate of coupons-qr tab 1).
   *   - `<section id="view-game-rewards">` (~15 lines) — skeleton:
   *     prize + voucher tier per game. Folds into the game-links tab.
   *
   * Audit decision: collapse into a single `/rewards` view with 4
   * tabs (Templates / Game links / Issuance / Redemption). Plan 5 T0
   * already added the `/rewards` route as Placeholder and removed
   * the four legacy sidebar entries.
   *
   * This task ships:
   *   - Page header + 4-tab nav UI (functional, switches active tab).
   *   - Templates tab FULLY implemented — fetches the merchant's
   *     prize/voucher template catalog from `/api/v1/prizes?brand_id=…`
   *     and renders cards with name / offer type / SGD value /
   *     inventory / StatusBadge.
   *   - Game links / Issuance / Redemption tabs as STUBS with
   *     "Coming soon" placeholders that prove the tab switch works.
   *
   * Deferred items (legacy view still owns these surfaces):
   *
   *   Templates tab:
   *     - New-template form (left column of the legacy two-pane
   *       layout at portal.html line 2499-2562). Requires upload-
   *       image flow, offer-type-driven field visibility, and the
   *       `POST /api/v1/prizes/create` mutation.
   *     - Per-card delete action (`kixDeletePrize()` at line 5754,
   *       DELETE `/api/v1/prizes/<pid>`). The legacy code also
   *       auto-unbinds the prize from any game reward rules — a
   *       cascade-aware mutation that belongs with the editor.
   *     - Expiry indicator (legacy `kixCQTemplateExpired()` at
   *       portal.html flags "past today" with a red border + label).
   *
   *   Game links tab:
   *     - Config selector + per-game card grid (`kixCQRenderCard()`
   *       at portal.html). Reads from
   *       `/api/v1/portal-admin/game-rewards` per `kixCQLoadGameRewards()`.
   *
   *   Issuance tab:
   *     - Per-template issuance counts list (`kixCQLoadIssuance()`).
   *
   *   Redemption tab:
   *     - Voucher-id lookup + redeem CTA (`kixCQLookup()` +
   *       `kixCQRedeem()`). Counter-side flow.
   *
   * State machine for Templates tab: loading → (data | empty | error).
   * Same four-state template as Plan 5 T1-T7. Other tabs are pure
   * presentational stubs (no fetch).
   *
   * Endpoint (Templates only): GET /api/v1/prizes?brand_id=<bid>.
   * Brand id resolved via `resolveBrandId()` (falls back to
   * 'demo_brand' when `kix_brand_id` is unset in localStorage).
   * Response shape: canonical `{ prizes: RewardTemplate[] }` (per
   * legacy `kixLoadPrizes` reading `d.prizes`), with `{ templates }`
   * / `{ items }` / bare array tolerated defensively.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listRewardTemplates } from '@/api/portal-admin/rewards'
  import type {
    RewardTemplate,
    RewardTemplatesResponse,
    RewardsTabId
  } from '@/api/portal-admin/types'
  import StatusBadge from '@/components/StatusBadge.vue'
  import { fmtSgd } from '@/utils/format/currency'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const templates = ref<RewardTemplate[]>([])
  const activeTab = ref<RewardsTabId>('templates')

  const pageTitle = computed(() => t('portal.rewards.title'))
  const pageSubtitle = computed(() => t('portal.rewards.subtitle'))

  /**
   * Tab order mirrors the legacy `view-coupons-qr` button bar at
   * portal.html line 2492-2497 — Templates first because it's the
   * data-densest surface and the entry point most merchants visit.
   */
  const tabs: { id: RewardsTabId; label: string }[] = [
    { id: 'templates', label: 'Templates' },
    { id: 'game-links', label: 'Game links' },
    { id: 'issuance', label: 'Issuance' },
    { id: 'redemption', label: 'Redemption' }
  ]

  async function loadTemplates() {
    loading.value = true
    error.value = null
    try {
      const res = await listRewardTemplates()
      const data: RewardTemplatesResponse | undefined = res.data
      if (Array.isArray(data)) {
        templates.value = data
      } else if (data && typeof data === 'object') {
        // Canonical shape is `{ prizes }` per legacy `kixLoadPrizes`
        // at portal.html line 5728 (`(d && d.prizes) || []`).
        // `{ templates }` / `{ items }` accepted defensively.
        templates.value = data.prizes ?? data.templates ?? data.items ?? []
      } else {
        templates.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Row key — `prize_id` is the canonical identifier on the legacy
   * payload (used as the DELETE path param at portal.html line 5758).
   * Falls back to `id` then `name` then array index for defensive
   * parity with the rest of the portal-admin surface.
   */
  function rowKey(tpl: RewardTemplate, idx: number): string {
    return tpl.prize_id ?? tpl.id ?? tpl.name ?? `idx-${idx}`
  }

  /**
   * Per-card SGD value. Legacy payload uses `original_price_cents`
   * (integer cents, see portal.html line 5743 `_kixMoney(p.original_price_cents)`).
   * v2 divides by 100 before passing to `fmtSgd` which already handles
   * thousands separators + trailing-zero trim.
   */
  function valueFor(tpl: RewardTemplate): string | null {
    if (typeof tpl.original_price_cents !== 'number') return null
    return fmtSgd(tpl.original_price_cents / 100)
  }

  /**
   * Per-card inventory display. Mirrors the legacy ternary at
   * portal.html line 5735: `p.inventory_count == null ? 'unlimited' : …`.
   * Note `== null` deliberately catches both `null` and `undefined`.
   */
  function inventoryFor(tpl: RewardTemplate): string {
    return tpl.inventory_count == null ? 'unlimited' : String(tpl.inventory_count)
  }

  /**
   * Per-card subtype label. Prefers explicit `type` (voucher / prize /
   * cashback) over `offer_type` (free / percent_off / fixed_price)
   * — the former describes WHAT the reward is, the latter HOW it
   * discounts. Legacy code shows both in different surfaces; v2
   * surfaces the higher-level kind on the card head.
   */
  function subtypeFor(tpl: RewardTemplate): string | null {
    return tpl.type ?? tpl.offer_type ?? null
  }

  onMounted(loadTemplates)
</script>

<template>
  <div class="kix-rewards p-8 space-y-6">
    <!-- Page header -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!--
      Tab nav. Mirrors the legacy `.cq-tabs` button row at portal.html
      line 2491-2497 but rebuilt as proper `<button>`s with aria-state
      via the active class binding. -mb-px collapses the active tab's
      bottom border into the strip's top border for the classic
      "active tab is welded to the panel" look.
    -->
    <nav class="border-b border-gray-200" data-testid="rewards-tabs">
      <ul class="flex gap-1">
        <li v-for="tab in tabs" :key="tab.id">
          <button
            :class="
              activeTab === tab.id
                ? 'border-green-600 text-green-700 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            "
            :data-testid="`rewards-tab-${tab.id}`"
            class="px-4 py-2 text-sm border-b-2 -mb-px"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </li>
      </ul>
    </nav>

    <!-- Templates tab content (the only fully-implemented tab) -->
    <section v-if="activeTab === 'templates'" data-testid="rewards-panel-templates">
      <div
        v-if="loading"
        class="text-gray-400 text-sm py-6 text-center"
        data-testid="rewards-templates-loading"
      >
        Loading templates…
      </div>

      <div
        v-else-if="error"
        class="text-red-600 text-sm py-6 text-center"
        data-testid="rewards-templates-error"
      >
        Failed to load: {{ error }}
      </div>

      <!--
        Empty-state — mirrors the legacy fallback copy at portal.html
        line 5730 ("No prizes yet. Create one on the left.") but
        retitled to "reward templates" since this view consolidates
        prizes + vouchers + coupons under one umbrella.
      -->
      <div
        v-else-if="templates.length === 0"
        class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
        data-testid="rewards-templates-empty"
      >
        No reward templates yet.
      </div>

      <div
        v-else
        class="grid gap-4"
        data-testid="rewards-templates-grid"
        style="grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))"
      >
        <article
          v-for="(tpl, idx) in templates"
          :key="rowKey(tpl, idx)"
          class="bg-white border border-gray-200 rounded-lg p-4 space-y-2"
          data-testid="rewards-template-card"
        >
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-semibold text-sm text-gray-900 break-words">
              {{ tpl.name }}
            </h3>
            <StatusBadge :status="tpl.status" />
          </div>
          <p v-if="subtypeFor(tpl)" class="text-xs uppercase tracking-wide text-gray-500">
            {{ subtypeFor(tpl) }}
          </p>
          <p v-if="valueFor(tpl)" class="text-lg font-bold tabular-nums">
            {{ valueFor(tpl) }}
          </p>
          <p class="text-xs text-gray-400">Inventory: {{ inventoryFor(tpl) }}</p>
        </article>
      </div>
    </section>

    <!--
      Stub tabs — surface the tab-switch UX but defer real data
      until follow-up tasks. Each one names the legacy fetcher that
      will eventually power it so reviewers can trace the audit
      trail.
    -->
    <section
      v-else-if="activeTab === 'game-links'"
      class="text-gray-400 p-8 text-center"
      data-testid="rewards-panel-game-links"
    >
      <p>Game-link bindings coming soon.</p>
      <p class="text-xs mt-2"> Defer: per-game prize + voucher tier configuration. </p>
    </section>

    <section
      v-else-if="activeTab === 'issuance'"
      class="text-gray-400 p-8 text-center"
      data-testid="rewards-panel-issuance"
    >
      <p>Issuance history coming soon.</p>
      <p class="text-xs mt-2"> Defer: per-customer voucher issuance log + filters. </p>
    </section>

    <section
      v-else-if="activeTab === 'redemption'"
      class="text-gray-400 p-8 text-center"
      data-testid="rewards-panel-redemption"
    >
      <p>Redemption tracking coming soon.</p>
      <p class="text-xs mt-2"> Defer: real-time redemption log + QR scan stats. </p>
    </section>
  </div>
</template>
