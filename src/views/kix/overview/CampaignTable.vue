<script setup lang="ts">
  /**
   * Overview · Active campaigns table.
   *
   * Ports the "Active campaigns" KPI table from the legacy portal.html
   * (~line 1390) onto art-design-pro's native ElTable surface inside an
   * `.art-card` wrapper. Sits BETWEEN the SetupGuide/NBA pair and the
   * "Live campaigns" grid in Overview.vue.
   *
   * State machine (non-critical card):
   *   - loading / error / empty → hidden (same fail-soft as NbaCard /
   *     SetupGuideCard — matches the legacy `catch (_) { display=none }`)
   *   - data + ≥1 campaign → render the table
   *
   * Columns backed by REAL Campaign fields only:
   *   Status · Campaign (name + objective) · Spend · Impressions ·
   *   New customers · CPA · CTR
   *
   * Audience / Plays columns from the legacy HTML are NOT rendered because
   * the v2 Campaign type has no such fields ("no fake data" rule).
   *
   * Normalization mirrors Campaigns.vue exactly: bare array | { campaigns }
   * | { items } → Campaign[].
   */
  import { computed, onMounted } from 'vue'
  import { listCampaigns } from '@/api/portal-admin/campaigns'
  import type { Campaign, CampaignsListResponse } from '@/api/portal-admin/types'
  import { fmtSgd } from '@/utils/format/currency'
  import { useNonCriticalCard } from '@/hooks/kix/useNonCriticalCard'
  import StatusBadge from '@/components/StatusBadge.vue'

  /** Normalize the three wire shapes to Campaign[]. */
  function normalize(raw: CampaignsListResponse): Campaign[] {
    if (Array.isArray(raw)) return raw
    if (raw && typeof raw === 'object') {
      return (
        (raw as { campaigns?: Campaign[]; items?: Campaign[] }).campaigns ??
        (raw as { campaigns?: Campaign[]; items?: Campaign[] }).items ??
        []
      )
    }
    return []
  }

  const { data, visible, reload } = useNonCriticalCard<CampaignsListResponse>(
    () => listCampaigns(),
    { isReady: (d) => normalize(d).length > 0 }
  )

  onMounted(reload)

  const rows = computed<Campaign[]>(() => (data.value ? normalize(data.value) : []))

  // Real-field-first (reconciled with Campaigns.vue / TopCampaignsTable):
  // prefer the numeric spend_sgd via fmtSgd, fall back to the pre-formatted
  // spend_str alias, em-dash when neither. One consistent S$ format across
  // every campaign surface.
  function spendCell(c: Campaign): string {
    if (c.spend_sgd != null) return fmtSgd(c.spend_sgd)
    if (c.spend_str) return c.spend_str
    return '—'
  }

  // Real "verified new customers" first; legacy `conversions` alias fallback.
  function newCustomersCell(c: Campaign): string {
    const v = c.new_customers ?? c.conversions
    return v == null ? '—' : v.toLocaleString('en-US')
  }

  // Real numeric cpa_sgd via fmtSgd first; legacy cpa_str alias fallback.
  function cpaCell(c: Campaign): string {
    if (c.cpa_sgd != null) return fmtSgd(c.cpa_sgd)
    if (c.cpa_str) return c.cpa_str
    return '—'
  }

  function ctrCell(c: Campaign): string {
    if (c.ctr_pct == null) return '—'
    return typeof c.ctr_pct === 'number' ? `${c.ctr_pct}%` : String(c.ctr_pct)
  }
</script>

<template>
  <div v-if="visible" class="art-card" data-testid="campaign-table-card">
    <!-- Card header: title left, "View all" link right -->
    <div class="flex items-center justify-between px-5 pt-5 pb-3">
      <h2 class="text-base font-semibold">Active campaigns</h2>
      <router-link
        to="/campaigns"
        class="text-sm text-[var(--art-primary)] hover:opacity-80 transition-opacity"
        data-testid="campaign-table-view-all"
      >
        View all →
      </router-link>
    </div>

    <!-- Native ElTable — no border, comfortable row height, transparent header -->
    <ElTable
      :data="rows"
      :border="false"
      :stripe="false"
      :show-header="true"
      :header-cell-style="{ background: 'transparent', fontWeight: '600', fontSize: '12px' }"
      style="width: 100%"
      data-testid="campaign-el-table"
    >
      <!-- Status -->
      <ElTableColumn label="Status" width="110">
        <template #default="{ row }">
          <StatusBadge :status="row.status" />
        </template>
      </ElTableColumn>

      <!-- Campaign (name + objective sub-line) -->
      <ElTableColumn label="Campaign" min-width="180">
        <template #default="{ row }">
          <div class="font-medium text-gray-900 leading-tight">{{ row.name }}</div>
          <div v-if="row.objective" class="text-xs text-gray-400 mt-0.5">
            {{ row.objective }}
          </div>
        </template>
      </ElTableColumn>

      <!-- Spend (right-aligned, tabular nums) -->
      <ElTableColumn label="Spend" width="110" align="right">
        <template #default="{ row }">
          <span class="tabular-nums">{{ spendCell(row) }}</span>
        </template>
      </ElTableColumn>

      <!-- Impressions -->
      <ElTableColumn label="Impressions" width="120" align="right">
        <template #default="{ row }">
          <span class="tabular-nums">{{ row.impressions ?? '—' }}</span>
        </template>
      </ElTableColumn>

      <!-- New customers (real new_customers, conversions fallback) -->
      <ElTableColumn label="New customers" width="140" align="right">
        <template #default="{ row }">
          <span class="tabular-nums">{{ newCustomersCell(row) }}</span>
        </template>
      </ElTableColumn>

      <!-- CPA -->
      <ElTableColumn label="CPA" width="100" align="right">
        <template #default="{ row }">
          <span class="tabular-nums">{{ cpaCell(row) }}</span>
        </template>
      </ElTableColumn>

      <!-- CTR -->
      <ElTableColumn label="CTR" width="80" align="right">
        <template #default="{ row }">
          <span class="tabular-nums">{{ ctrCell(row) }}</span>
        </template>
      </ElTableColumn>
    </ElTable>
  </div>
</template>
