/**
 * Billing.vue render test — rebuilt view (art-design-pro, Week 8l).
 * Wallet KPI strip + per-brand spend ArtTable + invoices ArtTable. Heavy
 * logic unit-tested in billing/__tests__/billingModel.spec.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/api/portal-admin/billing', () => ({ fetchWallet: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import Billing from '../Billing.vue'
import { fetchWallet } from '@/api/portal-admin/billing'

const ArtTableStub = defineComponent({
  name: 'ArtTable',
  props: ['data', 'columns'],
  setup(props) {
    return () =>
      h('div', { 'data-testid': 'art-table', 'data-row-count': (props.data ?? []).length })
  }
})
const ElCardStub = defineComponent({
  name: 'ElCard',
  setup(_, { slots }) {
    return () => h('div', { class: 'el-card' }, [slots.header?.(), slots.default?.()])
  }
})
const stubs = {
  ArtTable: ArtTableStub,
  ElCard: ElCardStub,
  ArtSvgIcon: { template: '<i />', props: ['icon'] },
  StatusBadge: { template: '<span />', props: ['status'] }
}

const full = {
  balance_sgd: 1842.5,
  burn7_sgd: 311,
  burn_daily_sgd: 44.4,
  days_runway: 41,
  invoices: [{ number: 'INV-1', date: '2026-06-01', total_sgd: 500, status: 'paid' }],
  per_brand: [{ brand: 'demo', spend7_sgd: 311, spend30_sgd: 1280 }]
}
const mockFetch = fetchWallet as unknown as ReturnType<typeof vi.fn>
const mountView = () => mount(Billing, { global: { stubs } })

describe('Billing.vue · rebuilt view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders wallet KPI strip from real fields', async () => {
    mockFetch.mockResolvedValueOnce({ data: full })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('portal.billing.title')
    const k = w.find('[data-testid="billing-wallet"]')
    expect(k.text()).toContain('S$1,842.5') // balance
    expect(k.text()).toContain('41') // runway
  })

  it('renders per-brand spend + invoices ArtTables', async () => {
    mockFetch.mockResolvedValueOnce({ data: full })
    const w = mountView()
    await flushPromises()
    const tables = w.findAll('[data-testid="art-table"]')
    expect(tables).toHaveLength(2) // per-brand + invoices
    expect(w.find('[data-testid="billing-per-brand"]').exists()).toBe(true)
  })

  it('hides per-brand card when no per_brand data, shows invoices-empty', async () => {
    mockFetch.mockResolvedValueOnce({ data: { balance_sgd: 10, invoices: [], per_brand: [] } })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="billing-per-brand"]').exists()).toBe(false)
    expect(w.find('[data-testid="billing-invoices-empty"]').exists()).toBe(true)
  })

  it('shows error + empty states', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom'))
    const w1 = mountView()
    await flushPromises()
    expect(w1.find('[data-testid="billing-error"]').exists()).toBe(true)

    mockFetch.mockResolvedValueOnce({ data: {} })
    const w2 = mountView()
    await flushPromises()
    expect(w2.find('[data-testid="billing-empty"]').exists()).toBe(true)
  })
})
