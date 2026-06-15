<script setup lang="ts">
  /**
   * Reports · Performance · "Top campaigns by ROAS".
   *
   * Ports the legacy `#reports-top-campaigns` table (portal.html line
   * 2011-2019, renderer `kixLoadTopCampaigns()` ~line 5010) onto
   * art-design-pro's native ElTable inside an `.art-card` — same surface
   * as the Overview `CampaignTable`.
   *
   * Wire endpoint: GET /api/v1/portal-admin/reports/top-campaigns
   * (see src/api/portal-admin/reports.ts · `fetchTopCampaigns`). Brand is
   * inferred server-side from the JWT — no `?brand=` query param.
   *
   * State machine (non-critical card — same fail-soft as every Overview
   * card): loading / error / empty-items → render nothing; ≥1 item →
   * render the table. Mirrors the legacy `catch (_) { display=none }`.
   *
   * Columns map the legacy headers exactly: Campaign · Spend · Conv ·
   * ROAS. For real brands spend/conversions/roas come back `null` until
   * per-campaign attribution exists — we render "—", never fabricated
   * numbers (the backend is deliberately honest about this).
   */
  import { computed, onMounted } from 'vue'
  import { fetchTopCampaigns } from '@/api/portal-admin/reports'
  import type { TopCampaign, TopCampaignsResponse } from '@/api/portal-admin/types'
  import { fmtSgd } from '@/utils/format/currency'
  import { useNonCriticalCard } from '@/hooks/kix/useNonCriticalCard'

  /** Normalize the wire shapes to TopCampaign[]: `{ items }` envelope
   *  (canonical) or a bare array (defensive, mirrors CampaignTable). */
  function normalize(raw: TopCampaignsResponse | TopCampaign[]): TopCampaign[] {
    if (Array.isArray(raw)) return raw
    if (raw && typeof raw === 'object') return raw.items ?? []
    return []
  }

  const { data, visible, reload } = useNonCriticalCard<TopCampaignsResponse | TopCampaign[]>(
    () => fetchTopCampaigns(),
    { isReady: (d) => normalize(d).length > 0 }
  )

  onMounted(reload)

  const rows = computed<TopCampaign[]>(() => (data.value ? normalize(data.value) : []))

  /** Real-field-first (reconciled with Campaigns.vue / Overview CampaignTable):
   *  numeric spend_sgd via fmtSgd preferred; pre-formatted spend_str alias as
   *  fallback; em-dash when both absent. */
  function spendCell(c: TopCampaign): string {
    if (c.spend_sgd != null) return fmtSgd(c.spend_sgd)
    if (c.spend_str) return c.spend_str
    return '—'
  }

  /** ROAS renders with a "×" suffix (legacy "4.2×"); em-dash when null. */
  function roasCell(c: TopCampaign): string {
    return c.roas == null ? '—' : `${c.roas}×`
  }
</script>

<template>
  <div v-if="visible" class="art-card" data-testid="top-campaigns-card">
    <!-- Card header -->
    <div class="flex items-center justify-between px-5 pt-5 pb-3">
      <h2 class="text-base font-semibold">Top campaigns by ROAS</h2>
      <router-link
        to="/campaigns"
        class="text-sm text-[var(--art-primary)] hover:opacity-80 transition-opacity"
        data-testid="top-campaigns-view-all"
      >
        View all →
      </router-link>
    </div>

    <ElTable
      :data="rows"
      :border="false"
      :stripe="false"
      :show-header="true"
      :header-cell-style="{ background: 'transparent', fontWeight: '600', fontSize: '12px' }"
      style="width: 100%"
      data-testid="top-campaigns-el-table"
    >
      <!-- Campaign name -->
      <ElTableColumn label="Campaign" min-width="200">
        <template #default="{ row }">
          <span class="font-medium text-gray-900">{{ row.name }}</span>
        </template>
      </ElTableColumn>

      <!-- Spend -->
      <ElTableColumn label="Spend" width="120" align="right">
        <template #default="{ row }">
          <span class="tabular-nums">{{ spendCell(row) }}</span>
        </template>
      </ElTableColumn>

      <!-- Conversions -->
      <ElTableColumn label="Conv" width="100" align="right">
        <template #default="{ row }">
          <span class="tabular-nums">{{ row.conversions ?? '—' }}</span>
        </template>
      </ElTableColumn>

      <!-- ROAS -->
      <ElTableColumn label="ROAS" width="100" align="right">
        <template #default="{ row }">
          <span class="tabular-nums font-semibold">{{ roasCell(row) }}</span>
        </template>
      </ElTableColumn>
    </ElTable>
  </div>
</template>
