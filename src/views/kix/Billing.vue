<script setup lang="ts">
  /**
   * Billing view — rebuilt onto art-design-pro components (Week 8l).
   *
   * Source: portal.html #view-billing (lines 2586-2643), fetcher
   * `kixLoadBilling()` (~line 5267). Rebuilds the wallet summary as a
   * card-list KPI strip and the invoices table onto the native `ArtTable`.
   * Also SURFACES the real `per_brand` spend breakdown the legacy view
   * ignored — a per-brand spend ArtTable. Logic in `billing/billingModel.ts`.
   *
   * Endpoint: GET /api/v1/portal-admin/billing (brand from JWT). Real
   * fields: balance/burn7/burn_daily/days_runway, invoices[], per_brand[].
   *
   * DEFERRED (not a restyle): payment-method management, recharge/top-up
   * CTAs, auto-recharge pill, Export CSV, billing-history filters.
   */
  import { computed, h, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { fetchWallet } from '@/api/portal-admin/billing'
  import type { BillingBrandSpend, Invoice, WalletBalance } from '@/api/portal-admin/types'
  import type { ColumnOption } from '@/types/component'
  import StatusBadge from '@/components/StatusBadge.vue'
  import {
    splitBilling,
    balanceDisplay,
    burn7Display,
    burnDailyDisplay,
    runwayDisplay,
    invoiceAmount,
    spend7Display,
    spend30Display,
    isEmpty
  } from './billing/billingModel'
  import TopUpDialog from './billing/TopUpDialog.vue'
  import PaymentMethodDialog from './billing/PaymentMethodDialog.vue'

  const { t } = useI18n()

  const topupOpen = ref(false)
  const payOpen = ref(false)
  const loading = ref(true)
  const error = ref<string | null>(null)
  const wallet = ref<WalletBalance | null>(null)
  const invoices = ref<Invoice[]>([])
  const perBrand = ref<BillingBrandSpend[]>([])

  const empty = computed(() => isEmpty(wallet.value, invoices.value))

  const kpiCards = computed(() => [
    { icon: 'ri:wallet-3-line', label: 'Balance', value: balanceDisplay(wallet.value) },
    { icon: 'ri:fire-line', label: 'Burn last 7d', value: burn7Display(wallet.value) },
    { icon: 'ri:calendar-line', label: 'Daily burn', value: burnDailyDisplay(wallet.value) },
    { icon: 'ri:timer-flash-line', label: 'Days runway', value: runwayDisplay(wallet.value) }
  ])

  const brandColumns = computed<ColumnOption<BillingBrandSpend>[]>(() => [
    {
      prop: 'brand',
      label: 'Brand',
      minWidth: 160,
      formatter: (r: BillingBrandSpend) =>
        h('span', { class: 'font-medium text-gray-900' }, r.brand)
    },
    {
      prop: 'spend7',
      label: 'Spend · 7d',
      width: 140,
      align: 'right',
      formatter: (r: BillingBrandSpend) => h('span', { class: 'tabular-nums' }, spend7Display(r))
    },
    {
      prop: 'spend30',
      label: 'Spend · 30d',
      width: 140,
      align: 'right',
      formatter: (r: BillingBrandSpend) => h('span', { class: 'tabular-nums' }, spend30Display(r))
    }
  ])

  const invoiceColumns = computed<ColumnOption<Invoice>[]>(() => [
    {
      prop: 'date',
      label: 'Date',
      width: 130,
      formatter: (r: Invoice) => h('span', { class: 'text-gray-600' }, r.date || '—')
    },
    {
      prop: 'number',
      label: 'Invoice #',
      minWidth: 160,
      formatter: (r: Invoice) =>
        h('span', { class: 'font-medium text-gray-900' }, r.number || r.id || '—')
    },
    {
      prop: 'amount',
      label: 'Amount',
      width: 130,
      align: 'right',
      formatter: (r: Invoice) => h('span', { class: 'tabular-nums' }, invoiceAmount(r))
    },
    {
      prop: 'status',
      label: 'Status',
      width: 110,
      formatter: (r: Invoice) => h(StatusBadge, { status: r.status })
    },
    {
      prop: 'pdf',
      label: '',
      width: 80,
      align: 'right',
      formatter: (r: Invoice) =>
        r.pdf_url
          ? h(
              'a',
              {
                href: r.pdf_url,
                target: '_blank',
                rel: 'noopener',
                class: 'text-xs font-semibold text-theme hover:underline'
              },
              'PDF'
            )
          : h('span', { class: 'text-xs text-gray-400' }, '—')
    }
  ])

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchWallet()
      const s = splitBilling(res.data)
      wallet.value = s.wallet
      invoices.value = s.invoices
      perBrand.value = s.perBrand
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<template>
  <div class="kix-billing p-5 space-y-5">
    <header class="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold">{{ t('portal.billing.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('portal.billing.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <ElButton data-testid="billing-payment" @click="payOpen = true">Payment methods</ElButton>
        <ElButton type="primary" data-testid="billing-topup" @click="topupOpen = true"
          >Top up</ElButton
        >
      </div>
    </header>

    <div v-if="error" data-testid="billing-error" class="text-red-600 text-sm py-10 text-center">
      Failed to load billing: {{ error }}
    </div>
    <div
      v-else-if="!loading && empty"
      data-testid="billing-empty"
      class="text-gray-400 text-sm py-12 text-center"
    >
      No billing data yet — wallet and invoices appear once your account is provisioned.
    </div>

    <template v-else>
      <!-- Wallet summary · canonical card-list KPI strip -->
      <div data-testid="billing-wallet" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      <!-- Per-brand spend · real per_brand data the legacy view ignored -->
      <ElCard
        v-if="perBrand.length > 0"
        class="art-table-card"
        shadow="never"
        data-testid="billing-per-brand"
      >
        <template #header>
          <span class="font-semibold text-gray-900">Spend by brand</span>
        </template>
        <ArtTable :data="perBrand" :columns="brandColumns" :show-table-header="false" />
      </ElCard>

      <!-- Invoices · ArtTable (absorbs the legacy view-invoices section) -->
      <ElCard class="art-table-card" shadow="never" data-testid="billing-invoices">
        <template #header>
          <span class="font-semibold text-gray-900">Invoices</span>
        </template>
        <div
          v-if="invoices.length === 0"
          data-testid="billing-invoices-empty"
          class="text-gray-400 text-sm py-8 text-center"
        >
          No invoices yet.
        </div>
        <ArtTable v-else :data="invoices" :columns="invoiceColumns" :show-table-header="false" />
      </ElCard>
    </template>

    <TopUpDialog v-model="topupOpen" @done="load" />
    <PaymentMethodDialog v-model="payOpen" @added="load" />
  </div>
</template>
