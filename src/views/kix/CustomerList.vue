<script setup lang="ts">
  /**
   * CustomerList view — Plan 4 Task 3.
   *
   * Source: `kix-platform/landing/portal.html`, `<section id="view-customer-list">`
   * (lines 2126-2157). The legacy section bundles into one card:
   *
   *   - Page header + Export-CSV CTA (lines 2127-2133)
   *   - Search input (#customers-search, line 2138) with 220ms debounce
   *   - Paginated customer table (#customers-tbody, lines 2142-2147)
   *   - Prev / Next page buttons + page-info copy (lines 2148-2155)
   *   - Per-row RFM-segment badge derived client-side (legacy `_seg()`
   *     at line 5118-5124) — colour-coded by plays/redeems
   *
   * This first cut ports ONLY the page header + a single-page table fed by
   * the simpler `/api/v1/portal-admin/customers` GET endpoint (legacy
   * `kixLoadCustomers()` at line 7303). Everything else is DEFERRED:
   *   - RFM filters / per-row segment badge
   *   - Search input + debounce
   *   - Pagination (prev / next / page-info)
   *   - Export CSV
   *   - Segment edit
   *
   * Same approach Plan 3 / Plan 4 T1-T2 took: port a thin honest slice of a
   * real endpoint, defer the rest behind a clear comment. The legacy live
   * view actually calls the paginated `/customers/page` variant — we use
   * the simpler endpoint because the row schema is identical and there is
   * no pagination state to manage. When pagination lands in a future task,
   * the fetcher swaps to `listCustomersPaged()` without changing the row
   * renderer.
   *
   * State machine: loading → (data | empty | error). Empty-state copy
   * mirrors the legacy "No customers yet — once games go live, verified
   * customers appear here." string (portal.html line 7314).
   *
   * Endpoint: GET /api/v1/portal-admin/customers (brand inferred from JWT
   * by the portal-admin router — no explicit `?brand=` param, unlike
   * `listFlows()`).
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listCustomers } from '@/api/portal-admin/customers'
  import type { Customer } from '@/api/portal-admin/types'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const customers = ref<Customer[]>([])

  const pageTitle = computed(() => t('portal.customers.title'))
  const pageSubtitle = computed(() => t('portal.customers.subtitle'))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listCustomers()
      const data = res.data
      if (Array.isArray(data)) {
        customers.value = data
      } else if (data && typeof data === 'object') {
        const d = data as { customers?: Customer[]; items?: Customer[] }
        customers.value = d.customers ?? d.items ?? []
      } else {
        customers.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Legacy renderer reads `${c.name||c.handle}` (portal.html line 7313).
   * We mirror that fallback chain exactly — name wins, handle is the
   * fallback, em-dash when neither is present (defensive — legacy would
   * render the literal string "undefined" in that case).
   */
  function displayName(c: Customer): string {
    return c.name || c.handle || '—'
  }

  /**
   * Row key — prefer stable id, then handle, then array index. The legacy
   * renderer does not key its rows (re-emits the entire <tbody> on each
   * load), so any stable-within-the-page string is correct.
   */
  function rowKey(c: Customer, idx: number): string {
    return c.id ?? c.handle ?? `idx-${idx}`
  }

  onMounted(load)
</script>

<template>
  <div class="kix-customer-list p-8 space-y-6">
    <!-- Page header (mirrors `<div class="ent-page-head">` at portal.html line 2127) -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- Customer table · 4-state -->
    <section
      v-if="loading"
      class="text-gray-400 text-sm py-6 text-center"
      data-testid="customers-loading"
    >
      Loading customers…
    </section>

    <section
      v-else-if="error"
      class="text-red-600 text-sm py-6 text-center"
      data-testid="customers-error"
    >
      Failed to load: {{ error }}
    </section>

    <!--
      Empty-state — mirrors the legacy "No customers yet" string at
      portal.html line 7314. The legacy view also includes an alternate
      "no match for search" message; deferred until search lands.
    -->
    <section
      v-else-if="customers.length === 0"
      class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
      data-testid="customers-empty"
    >
      No customers yet — once games go live, verified customers appear here.
    </section>

    <section v-else class="space-y-3" data-testid="customers-list">
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-4 py-2 font-medium">Name / handle</th>
              <th class="px-4 py-2 font-medium">Channel</th>
              <th class="px-4 py-2 font-medium">First seen</th>
              <th class="px-4 py-2 font-medium text-right">Plays</th>
              <th class="px-4 py-2 font-medium text-right">Redeems</th>
              <th class="px-4 py-2 font-medium">Last activity</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(c, idx) in customers"
              :key="rowKey(c, idx)"
              class="border-t border-gray-100 hover:bg-gray-50"
              data-testid="customer-row"
            >
              <td class="px-4 py-2 font-medium text-gray-900">{{ displayName(c) }}</td>
              <td class="px-4 py-2">
                <span
                  v-if="c.channel"
                  class="text-xs px-2 py-0.5 rounded-full inline-block bg-gray-50 text-gray-600"
                >
                  {{ c.channel }}
                </span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-2 text-gray-600">{{ c.first_seen ?? '—' }}</td>
              <td class="px-4 py-2 text-right tabular-nums">{{ c.plays ?? 0 }}</td>
              <td class="px-4 py-2 text-right tabular-nums">{{ c.redeems ?? 0 }}</td>
              <td class="px-4 py-2 text-gray-600">{{ c.last_active ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
