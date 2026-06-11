<script setup lang="ts">
  /**
   * Billing view — Plan 5 Task 5.
   *
   * Source: `kix-platform/landing/portal.html`, `<section
   * id="view-billing">` (lines 2586-2643) + the legacy fetcher
   * `kixLoadBilling()` (~line 5267). Per the Plan 5 T5 audit, the
   * separate `<section id="view-invoices">` (lines 2645-2661) is a
   * DUPLICATE of the invoices card already living inside view-billing
   * — same logical rows (date / number / total / status / PDF link),
   * just served by a different endpoint. We CONSOLIDATE: one
   * Billing.vue holds the wallet summary AND the invoices table.
   * The /invoices route stays as Placeholder (its sidebar entry was
   * already dropped in Plan 5 T0).
   *
   * Plan 5 T5 ports:
   *   - Page header + subtitle ("Wallet balance, auto-recharge,
   *     invoices, payment methods." at portal.html line 2589)
   *   - Wallet summary card (line 2592-2620) — three stat tiles for
   *     balance / 7-day burn / days-runway, driven by the real
   *     `/portal-admin/billing` response.
   *   - Invoices table (line 2622-2632) — date · number · amount ·
   *     status · PDF link, normalised from the same response's
   *     `invoices` array. Empty-state matches the legacy
   *     "No invoices yet" copy (line 5281).
   *
   * DEFERRED (legacy still owns these surfaces; documented in
   * `src/api/portal-admin/billing.ts`):
   *   - Payment-method management (Manage payment methods CTA)
   *   - Recharge / top-up CTAs (+ S$100 / + S$500 / + S$2,000)
   *   - "Auto-recharge on" pill in the wallet card header
   *   - "Export CSV" button (kixExportInvoicesCsv)
   *   - Per-brand spend table (per_brand on the response)
   *   - Billing-history filters (date range, status, search)
   *
   * State machine: loading → (data | empty | error). The "empty"
   * branch (no wallet AND no invoices) is defensive cover — the
   * server emits at least the wallet stats for any signed-in
   * merchant, but a malformed wire response still shows the empty
   * placeholder rather than blank cards.
   *
   * Endpoint: GET /api/v1/portal-admin/billing. Brand inferred from
   * the JWT (`get_current_brand` dependency, no `?brand=` param —
   * same pattern as listCustomers() / listAudiences() / …). The
   * `resolveBrandId()` helper is imported for future deferred-slice
   * wiring but not exercised by the first-cut fetch path.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { fetchWallet } from '@/api/portal-admin/billing'
  import type { BillingResponse, Invoice, WalletBalance } from '@/api/portal-admin/types'
  import { fmtSgd } from '@/utils/format/currency'
  import StatusBadge from '@/components/StatusBadge.vue'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const wallet = ref<WalletBalance | null>(null)
  const invoices = ref<Invoice[]>([])

  const pageTitle = computed(() => t('portal.billing.title'))
  const pageSubtitle = computed(() => t('portal.billing.subtitle'))

  /**
   * Wallet stat display — prefer the raw SGD number (so fmtSgd
   * renders consistently with the rest of the portal) and fall back
   * to the legacy pre-formatted string the server emits today.
   * `—` placeholder matches the legacy initial-state copy at
   * portal.html line 2600-2611.
   */
  const balanceDisplay = computed<string>(() => {
    const w = wallet.value
    if (!w) return 'S$—'
    if (typeof w.balance_sgd === 'number') return fmtSgd(w.balance_sgd)
    return w.balance_str || 'S$—'
  })

  const burn7Display = computed<string>(() => {
    const w = wallet.value
    if (!w) return 'S$—'
    if (typeof w.burn7_sgd === 'number') return fmtSgd(w.burn7_sgd)
    return w.burn7_str || 'S$—'
  })

  const burnDailyDisplay = computed<string>(() => {
    const w = wallet.value
    if (!w) return '—'
    if (typeof w.burn_daily_sgd === 'number') return fmtSgd(w.burn_daily_sgd)
    return w.burn_daily_str || '—'
  })

  const runwayDisplay = computed<string>(() => {
    const w = wallet.value
    if (!w || typeof w.days_runway !== 'number') return '—'
    return String(w.days_runway)
  })

  /**
   * Per-row invoice total — same raw-vs-formatted preference as the
   * wallet stats. Backend may emit `total_sgd` (raw SGD), `total_cents`
   * (legacy cents-based from the settings-router shape), or the
   * pre-formatted `amount_str`. The view normalises to a single
   * fmtSgd-rendered string when a raw number is available.
   */
  function invoiceAmount(inv: Invoice): string {
    if (typeof inv.total_sgd === 'number') return fmtSgd(inv.total_sgd)
    if (typeof inv.total_cents === 'number') return fmtSgd(inv.total_cents / 100)
    return inv.amount_str || '—'
  }

  /**
   * Row key — prefer `number` (server-emitted unique invoice number,
   * e.g. "INV-2025-0312") then `id` then array index. Mirrors the
   * convention in Templates / Cases / AbTests where a stable
   * row-level key is selected from the most-likely-unique field.
   */
  function rowKey(inv: Invoice, idx: number): string {
    return inv.number || inv.id || `idx-${idx}`
  }

  /**
   * Total-empty fallback — true when neither the wallet response nor
   * the invoices array yielded any data. Defensive cover; in practice
   * the server emits at least the wallet stat numbers for every
   * signed-in merchant. Mirrors the legacy "Loading…" placeholders
   * that the renderer leaves in place when the fetch returned `{}`.
   */
  const isEmpty = computed<boolean>(() => {
    const w = wallet.value
    const hasWalletData =
      !!w &&
      (typeof w.balance_sgd === 'number' ||
        typeof w.burn7_sgd === 'number' ||
        typeof w.days_runway === 'number' ||
        !!w.balance_str ||
        !!w.burn7_str)
    return !hasWalletData && invoices.value.length === 0
  })

  async function load() {
    loading.value = true
    error.value = null

    try {
      const res = await fetchWallet()
      const data: BillingResponse | undefined = res.data
      if (data && typeof data === 'object') {
        // Split into wallet + invoices so the template can render the
        // two cards independently. We KEEP the full WalletBalance
        // surface on `wallet` (not just the formatted strings) so
        // future deferred slices — per-brand spend, recharge CTA —
        // can layer onto the existing reactive state without a
        // second fetch.
        wallet.value = {
          balance_str: data.balance_str,
          balance_sgd: data.balance_sgd,
          burn7_str: data.burn7_str,
          burn7_sgd: data.burn7_sgd,
          burn_daily_str: data.burn_daily_str,
          burn_daily_sgd: data.burn_daily_sgd,
          days_runway: data.days_runway
        }
        // V2.16 sweep fix (portal.html line 5278-5282) — backend may
        // omit `invoices` entirely. Treat null / missing as "no
        // invoices yet" rather than letting the view render stale
        // data from a previous load.
        invoices.value = Array.isArray(data.invoices) ? data.invoices : []
      } else {
        wallet.value = null
        invoices.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<template>
  <div class="kix-billing p-8 space-y-6">
    <!-- Page header (mirrors `.ent-page-head` at portal.html line 2587-2590) -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- 4-state -->
    <section
      v-if="loading"
      class="text-gray-400 text-sm py-6 text-center"
      data-testid="billing-loading"
    >
      Loading billing…
    </section>

    <section
      v-else-if="error"
      class="text-red-600 text-sm py-6 text-center"
      data-testid="billing-error"
    >
      Failed to load: {{ error }}
    </section>

    <section
      v-else-if="isEmpty"
      class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
      data-testid="billing-empty"
    >
      No billing data yet — wallet and invoices appear once your account is provisioned.
    </section>

    <template v-else>
      <!-- Wallet summary card · mirrors portal.html line 2592-2620 -->
      <section
        class="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
        data-testid="billing-wallet"
      >
        <header>
          <h2 class="text-sm font-semibold text-gray-900">Wallet</h2>
        </header>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="bg-gray-50 rounded-lg p-4" data-testid="billing-balance-tile">
            <div class="text-xs uppercase tracking-wide text-gray-500">Balance</div>
            <div
              class="text-2xl font-extrabold text-gray-900 mt-1 tabular-nums"
              data-testid="billing-balance"
            >
              {{ balanceDisplay }}
            </div>
            <div class="text-xs text-gray-400 mt-1">Updates real-time</div>
          </div>

          <div class="bg-gray-50 rounded-lg p-4" data-testid="billing-burn-tile">
            <div class="text-xs uppercase tracking-wide text-gray-500">Burn last 7d</div>
            <div
              class="text-2xl font-extrabold text-gray-900 mt-1 tabular-nums"
              data-testid="billing-burn7"
            >
              {{ burn7Display }}
            </div>
            <div class="text-xs text-gray-400 mt-1">
              ≈ <span data-testid="billing-burn-daily">{{ burnDailyDisplay }}</span
              >/day
            </div>
          </div>

          <div class="bg-gray-50 rounded-lg p-4" data-testid="billing-runway-tile">
            <div class="text-xs uppercase tracking-wide text-gray-500">Days runway</div>
            <div
              class="text-2xl font-extrabold text-gray-900 mt-1 tabular-nums"
              data-testid="billing-runway"
            >
              {{ runwayDisplay }}
            </div>
            <div class="text-xs text-gray-400 mt-1">At current burn</div>
          </div>
        </div>
      </section>

      <!-- Invoices table · mirrors portal.html line 2622-2632 AND absorbs view-invoices -->
      <section
        class="bg-white border border-gray-200 rounded-lg overflow-hidden"
        data-testid="billing-invoices"
      >
        <header class="px-4 py-3 border-b border-gray-100">
          <h2 class="text-sm font-semibold text-gray-900">Invoices</h2>
        </header>
        <p
          v-if="invoices.length === 0"
          class="text-gray-400 text-sm px-4 py-8 text-center"
          data-testid="billing-invoices-empty"
        >
          No invoices yet.
        </p>
        <table v-else class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th class="text-left font-medium px-4 py-2 w-32">Date</th>
              <th class="text-left font-medium px-4 py-2">Invoice #</th>
              <th class="text-right font-medium px-4 py-2 w-32">Amount</th>
              <th class="text-left font-medium px-4 py-2 w-28">Status</th>
              <th class="text-right font-medium px-4 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr
              v-for="(inv, idx) in invoices"
              :key="rowKey(inv, idx)"
              data-testid="billing-invoice-row"
            >
              <td class="px-4 py-3 text-gray-600">{{ inv.date || '—' }}</td>
              <td class="px-4 py-3 font-semibold text-gray-900">{{
                inv.number || inv.id || '—'
              }}</td>
              <td class="px-4 py-3 text-right tabular-nums text-gray-900">
                {{ invoiceAmount(inv) }}
              </td>
              <td class="px-4 py-3">
                <StatusBadge :status="inv.status" />
              </td>
              <td class="px-4 py-3 text-right">
                <a
                  v-if="inv.pdf_url"
                  :href="inv.pdf_url"
                  target="_blank"
                  rel="noopener"
                  class="text-xs font-semibold text-blue-600 hover:underline"
                  data-testid="billing-invoice-pdf"
                >
                  PDF
                </a>
                <span v-else class="text-xs text-gray-400">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>
