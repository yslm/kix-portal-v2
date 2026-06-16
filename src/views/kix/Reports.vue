<script setup lang="ts">
  /**
   * Reports view — Plan 4 Task 2.
   *
   * Source: `kix-platform/landing/portal.html`, `<section id="view-reports">`
   * (lines 1960-2082). The legacy section is a multi-mode dashboard that
   * splits into:
   *
   *   - Simple-mode "owner-report" card (#owner-report, lines 1975-1991):
   *     three big numbers — new customers (7d), redemptions (today),
   *     returning players — plus a plain-language reading line.
   *   - Advanced-mode tabs (lines 1993-2079):
   *       · Performance — KPI grid + top-campaigns-by-ROAS table
   *         (data source `/api/v1/portal-admin/reports/top-campaigns`)
   *       · Engagement — funnel (Game→Reward→Register→Redeem→Return) +
   *         SVG funnel viz + heat-by-hour grid
   *       · Live monitoring — plays/min, redeems/hr, p95 latency,
   *         error rate, recent events feed
   *   - Export CSV button (advanced mode only)
   *
   * This first cut ports ONLY the Simple-mode owner-report card. The
   * Advanced tabs (KPI grid, funnel, heatmap, live monitoring feed),
   * Export CSV, and the legacy "reading" plain-language line are all
   * DEFERRED — same approach Plan 3 / Plan 4 T1 took (port a thin honest
   * slice, defer the rest behind a clear comment).
   *
   * Endpoints: composed via `fetchOwnerReport()` which fans out three
   * GETs in parallel (legacy `kixLoadOwnerReport()` ~line 3978):
   *   GET /api/v1/portal-admin/overview
   *   GET /api/v1/portal-admin/redemptions/today
   *   GET /api/v1/portal-admin/customers/rfm-summary
   *
   * State machine: loading → (data | empty | error). "Empty" means every
   * field came back null (every leg failed). When some fields succeed and
   * others fail we render the data branch with em-dash placeholders for
   * the failed fields — same partial-tolerance pattern as the legacy
   * aggregator (line 4005: "owner card is additive").
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { ElMessage } from 'element-plus'
  import { fetchOwnerReport, exportReportsCsv } from '@/api/portal-admin/reports'
  import type { OwnerReportSummary } from '@/api/portal-admin/types'
  import TopCampaignsTable from './reports/TopCampaignsTable.vue'
  import FunnelChart from './reports/FunnelChart.vue'
  import LiveMonitor from './reports/LiveMonitor.vue'
  import AttributionCard from './reports/AttributionCard.vue'

  const { t } = useI18n()

  const exporting = ref(false)

  async function exportCsv() {
    exporting.value = true
    try {
      const res = await exportReportsCsv()
      const blob =
        res.data instanceof Blob ? res.data : new Blob([String(res.data)], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'kix-reports-cohort.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      ElMessage.error(e instanceof Error ? e.message : 'Export failed')
    } finally {
      exporting.value = false
    }
  }

  const loading = ref(true)
  const error = ref<string | null>(null)
  const summary = ref<OwnerReportSummary | null>(null)

  const pageTitle = computed(() => t('portal.reports.title'))
  const pageSubtitle = computed(() => t('portal.reports.subtitle'))

  const newCustomersLabel = computed(() => t('portal.owner.new_customers'))
  const redemptionsLabel = computed(() => t('portal.owner.redemptions'))
  const repeatLabel = computed(() => t('portal.owner.repeat'))

  /**
   * Format a single owner-report number for display. The legacy renderer
   * uses raw `textContent = v` and a literal em-dash ('—') when the value
   * is null/undefined (line 3993). We mirror that exactly — no thousands
   * separator, no padding — so the visual matches the original 34px card.
   */
  function fmt(v: number | null): string {
    return v == null ? '—' : String(v)
  }

  /**
   * `empty` means every leg returned null. This is the right read-only
   * collapse: the owner card is supposed to render data the moment any
   * one endpoint resolves, even if the others 503. Mirrors the legacy
   * `.catch(() => null)` × 3 + per-field em-dash branch.
   */
  const isEmpty = computed(() => {
    const s = summary.value
    if (!s) return false
    return s.newCustomers == null && s.redemptionsToday == null && s.returningPlayers == null
  })

  async function load() {
    loading.value = true
    error.value = null
    try {
      summary.value = await fetchOwnerReport()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<template>
  <div class="kix-reports p-8 space-y-6">
    <!-- Page header (mirrors `<div class="ent-page-head">` at portal.html line 1961) -->
    <header class="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
      </div>
      <ElButton :loading="exporting" data-testid="reports-export" @click="exportCsv">
        Export CSV
      </ElButton>
    </header>

    <!-- Owner summary card · Simple mode (legacy #owner-report, lines 1975-1991) -->
    <section
      v-if="loading"
      class="text-gray-400 text-sm py-6 text-center"
      data-testid="reports-loading"
    >
      Loading reports…
    </section>

    <section
      v-else-if="error"
      class="text-red-600 text-sm py-6 text-center"
      data-testid="reports-error"
    >
      Failed to load: {{ error }}
    </section>

    <section
      v-else-if="isEmpty"
      class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
      data-testid="reports-empty"
    >
      No reports data yet. Once players start engaging, the owner numbers will appear here.
    </section>

    <section v-else class="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="owner-report">
      <!-- New customers · 7 days -->
      <div class="bg-white border border-gray-200 rounded-xl px-4 py-5 text-center">
        <div class="text-3xl font-extrabold tabular-nums" data-testid="own-new">
          {{ fmt(summary?.newCustomers ?? null) }}
        </div>
        <div class="text-xs text-gray-500 mt-1">{{ newCustomersLabel }}</div>
      </div>
      <!-- Redemptions · today -->
      <div class="bg-white border border-gray-200 rounded-xl px-4 py-5 text-center">
        <div class="text-3xl font-extrabold tabular-nums" data-testid="own-redeem">
          {{ fmt(summary?.redemptionsToday ?? null) }}
        </div>
        <div class="text-xs text-gray-500 mt-1">{{ redemptionsLabel }}</div>
      </div>
      <!-- Players who came back -->
      <div class="bg-white border border-gray-200 rounded-xl px-4 py-5 text-center">
        <div class="text-3xl font-extrabold tabular-nums" data-testid="own-repeat">
          {{ fmt(summary?.returningPlayers ?? null) }}
        </div>
        <div class="text-xs text-gray-500 mt-1">{{ repeatLabel }}</div>
      </div>
    </section>

    <!-- Performance · Top campaigns by ROAS (legacy #reports-top-campaigns,
         lines 2011-2019). Self-hiding non-critical card — renders only when
         the backend returns ≥1 campaign. -->
    <TopCampaignsTable />

    <!-- Engagement · conversion funnel (legacy #engagement-funnel, lines
         2022-2039). Self-hides until there's a real funnel. -->
    <FunnelChart />

    <!-- Live monitoring · "Live now" (legacy lines 2061-2072). Composed
         from /monitoring/live + /ops/today; self-hides if both legs fail. -->
    <LiveMonitor />

    <!-- Attribution by channel (legacy ~5018). Window selector + 4-model
         credit table; self-hides until there's attribution data. -->
    <AttributionCard />
  </div>
</template>
