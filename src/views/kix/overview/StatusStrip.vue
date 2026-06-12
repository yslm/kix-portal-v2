<script setup lang="ts">
  /**
   * Overview · Status strip — 4-metric top row.
   *
   * Ports the legacy `kixLoadOverview()` status summary at
   * kix-platform/landing/portal.html ~line 3490 (labels at line 1335-1341)
   * onto a horizontal strip component sitting ABOVE the SetupGuide/NBA pair.
   *
   * Wire endpoint: GET /api/v1/portal-admin/overview (see
   * src/api/portal-admin/overview.ts · `fetchOverview`). Brand is inferred
   * server-side from the JWT — no `?brand=` query param.
   *
   * State machine (non-critical card — identical to NbaCard):
   *   - loading  → render nothing (avoid layout flicker)
   *   - error    → render nothing (e.g. demo-mode 401 → fail-soft)
   *   - data     → render the 4-metric strip
   *
   * Deferred from this first cut (legacy still owns these surfaces):
   *   - "+ Top up S$200" wallet action button (needs wallet top-up flow)
   *   - "↻ Refresh" button (live-refresh ticker)
   *   - i18n keys — English-only first cut, same approach as SetupGuideCard / NbaCard
   */
  import { computed, onMounted, ref } from 'vue'
  import { fetchOverview } from '@/api/portal-admin/overview'
  import type { OverviewResponse } from '@/api/portal-admin/types'
  import { fmtSgd } from '@/utils/format/currency'

  const loading = ref(true)
  const error = ref<string | null>(null)
  const data = ref<OverviewResponse | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchOverview()
      data.value = res.data ?? null
    } catch (e: unknown) {
      // Non-critical card — swallow the error and render nothing, matching
      // the NbaCard / legacy `catch (_) { card.style.display = 'none' }` pattern
      // at portal.html line 4196.
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  /** Single truth-gate for visibility: only show when data loaded without error. */
  const visible = computed(() => !loading.value && !error.value && data.value !== null)

  /** Formatted wallet value. fmtSgd takes dollars (not cents) — wallet_sgd is
   *  already in dollars per the API contract, so pass directly. */
  const walletDisplay = computed(() => (data.value !== null ? fmtSgd(data.value.wallet_sgd) : ''))
</script>

<template>
  <div
    v-if="visible"
    data-testid="status-strip"
    class="flex flex-wrap gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200"
  >
    <!-- WALLET -->
    <div class="flex flex-col items-center flex-1 bg-white px-6 py-4 min-w-[120px]">
      <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">
        Wallet
      </span>
      <span data-testid="status-wallet" class="text-xl font-bold text-gray-900 tabular-nums">
        {{ walletDisplay }}
      </span>
    </div>

    <!-- NEW · 7d -->
    <div class="flex flex-col items-center flex-1 bg-white px-6 py-4 min-w-[120px]">
      <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">
        New · 7d
      </span>
      <span data-testid="status-new7d" class="text-xl font-bold text-green-700 tabular-nums">
        {{ data!.new_customers_7d }} ↑
      </span>
    </div>

    <!-- CAMPAIGNS -->
    <div class="flex flex-col items-center flex-1 bg-white px-6 py-4 min-w-[120px]">
      <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">
        Campaigns
      </span>
      <span data-testid="status-campaigns" class="text-xl font-bold text-gray-900 tabular-nums">
        {{ data!.campaigns_live }} live
      </span>
    </div>

    <!-- BUDGET LEFT -->
    <div class="flex flex-col items-center flex-1 bg-white px-6 py-4 min-w-[120px]">
      <span class="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400 mb-1">
        Budget Left
      </span>
      <span data-testid="status-runway" class="text-xl font-bold text-gray-900 tabular-nums">
        {{ data!.runway_days }} days
      </span>
    </div>
  </div>
</template>
