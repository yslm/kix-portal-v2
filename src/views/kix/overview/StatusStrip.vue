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
  import { computed, onMounted } from 'vue'
  import { fetchOverview } from '@/api/portal-admin/overview'
  import type { OverviewResponse } from '@/api/portal-admin/types'
  import { fmtSgd } from '@/utils/format/currency'
  import { useNonCriticalCard } from '@/hooks/kix/useNonCriticalCard'

  const { data, visible, reload } = useNonCriticalCard<OverviewResponse>(() => fetchOverview())

  onMounted(reload)

  /** Formatted wallet value. fmtSgd takes dollars (not cents) — wallet_sgd is
   *  already in dollars per the API contract, so pass directly. */
  const walletDisplay = computed(() => (data.value !== null ? fmtSgd(data.value.wallet_sgd) : ''))
</script>

<template>
  <div v-if="visible" data-testid="status-strip" class="art-card px-6 py-4">
    <div class="flex flex-wrap gap-6">
      <!-- WALLET -->
      <div class="flex items-center gap-3 flex-1 min-w-[120px]">
        <div class="size-9 rounded-lg flex-cc bg-theme/10 shrink-0">
          <ArtSvgIcon icon="ri:wallet-3-line" class="text-base text-theme" />
        </div>
        <div class="flex flex-col">
          <span class="text-g-600 text-xs">Wallet</span>
          <span data-testid="status-wallet" class="text-lg font-medium tabular-nums">
            {{ walletDisplay }}
          </span>
        </div>
      </div>

      <div class="w-px self-stretch bg-gray-200 dark:bg-gray-700 hidden sm:block" />

      <!-- NEW · 7d -->
      <div class="flex items-center gap-3 flex-1 min-w-[120px]">
        <div class="size-9 rounded-lg flex-cc bg-theme/10 shrink-0">
          <ArtSvgIcon icon="ri:user-add-line" class="text-base text-theme" />
        </div>
        <div class="flex flex-col">
          <span class="text-g-600 text-xs">New · 7d</span>
          <span data-testid="status-new7d" class="text-lg font-medium text-success tabular-nums">
            {{ data!.new_customers_7d }} ↑
          </span>
        </div>
      </div>

      <div class="w-px self-stretch bg-gray-200 dark:bg-gray-700 hidden sm:block" />

      <!-- CAMPAIGNS -->
      <div class="flex items-center gap-3 flex-1 min-w-[120px]">
        <div class="size-9 rounded-lg flex-cc bg-theme/10 shrink-0">
          <ArtSvgIcon icon="ri:megaphone-line" class="text-base text-theme" />
        </div>
        <div class="flex flex-col">
          <span class="text-g-600 text-xs">Campaigns</span>
          <span data-testid="status-campaigns" class="text-lg font-medium tabular-nums">
            {{ data!.campaigns_live }} live
          </span>
        </div>
      </div>

      <div class="w-px self-stretch bg-gray-200 dark:bg-gray-700 hidden sm:block" />

      <!-- BUDGET LEFT -->
      <div class="flex items-center gap-3 flex-1 min-w-[120px]">
        <div class="size-9 rounded-lg flex-cc bg-theme/10 shrink-0">
          <ArtSvgIcon icon="ri:funds-line" class="text-base text-theme" />
        </div>
        <div class="flex flex-col">
          <span class="text-g-600 text-xs">Budget Left</span>
          <span data-testid="status-runway" class="text-lg font-medium tabular-nums">
            {{ data!.runway_days }} days
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
