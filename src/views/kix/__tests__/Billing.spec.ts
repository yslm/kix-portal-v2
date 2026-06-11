/**
 * Billing.vue render test — exercises the four state branches of the
 * consolidated wallet + invoices view (data | empty | error | loading)
 * plus the per-row normalisation of the invoices table. Mirrors the
 * legacy `kixLoadBilling()` single-fetch dance at portal.html line
 * 5267-5300 (the absorbed view-invoices surface is covered by the
 * same `invoices` array on the response).
 *
 * Same fixture / stubbing shape as VipTiers.spec.ts — `t(key) => key`
 * stub, no brand-id stub needed because the portal-admin billing route
 * infers brand from the JWT (`get_current_brand` dependency, no
 * `?brand=` param). The actual translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/billing', () => ({
  fetchWallet: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Billing from '../Billing.vue'
import { fetchWallet } from '@/api/portal-admin/billing'

// Schema mirrors the wire response `kixLoadBilling()` consumes at
// portal.html line 5272-5295. Pre-formatted `*_str` fields match
// what the legacy backend emits today; the v2 view also accepts
// raw `*_sgd` numbers for fmtSgd-consistent rendering.
const sampleResponse = {
  balance_str: 'S$1,234.56',
  balance_sgd: 1234.56,
  burn7_str: 'S$345',
  burn7_sgd: 345,
  burn_daily_str: 'S$49',
  burn_daily_sgd: 49,
  days_runway: 25,
  invoices: [
    {
      number: 'INV-2025-0312',
      date: '2025-03-12',
      total_sgd: 129,
      status: 'paid',
      pdf_url: '/api/v1/invoices/INV-2025-0312/download.pdf'
    },
    {
      number: 'INV-2025-0211',
      date: '2025-02-11',
      amount_str: 'S$199.00',
      status: 'open',
      pdf_url: '/api/v1/invoices/INV-2025-0211/download.pdf'
    }
  ]
}

const mockFetch = fetchWallet as unknown as ReturnType<typeof vi.fn>

describe('Billing.vue · wallet summary + invoices', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders the page header, wallet tiles, and invoices table after a successful fetch', async () => {
    mockFetch.mockResolvedValueOnce({ data: sampleResponse })

    const wrapper = mount(Billing)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.billing.title')
    expect(wrapper.text()).toContain('portal.billing.subtitle')

    // Data branch visible; loading / error / empty hidden.
    expect(wrapper.find('[data-testid="billing-wallet"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="billing-invoices"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="billing-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="billing-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="billing-empty"]').exists()).toBe(false)

    // Wallet stat tiles — raw SGD numbers preferred over pre-formatted
    // strings, so fmtSgd renders consistent thousands separators.
    expect(wrapper.find('[data-testid="billing-balance"]').text()).toBe('S$1,234.56')
    expect(wrapper.find('[data-testid="billing-burn7"]').text()).toBe('S$345')
    expect(wrapper.find('[data-testid="billing-burn-daily"]').text()).toBe('S$49')
    expect(wrapper.find('[data-testid="billing-runway"]').text()).toBe('25')

    // Invoice rows — one per response item.
    const rows = wrapper.findAll('[data-testid="billing-invoice-row"]')
    expect(rows).toHaveLength(2)

    // Row 1 · number + date + amount from raw total_sgd + paid badge + PDF link.
    expect(rows[0].text()).toContain('INV-2025-0312')
    expect(rows[0].text()).toContain('2025-03-12')
    expect(rows[0].text()).toContain('S$129')
    expect(rows[0].text()).toContain('paid')
    expect(rows[0].find('[data-testid="billing-invoice-pdf"]').exists()).toBe(true)
    expect(rows[0].find('[data-testid="billing-invoice-pdf"]').attributes('href')).toBe(
      '/api/v1/invoices/INV-2025-0312/download.pdf'
    )

    // Row 2 · falls back to pre-formatted amount_str when total_sgd absent.
    expect(rows[1].text()).toContain('INV-2025-0211')
    expect(rows[1].text()).toContain('S$199.00')
    expect(rows[1].text()).toContain('open')
  })

  it('shows the empty-state placeholder when both wallet and invoices are missing', async () => {
    // Defensive cover — server emits at least the wallet stats for
    // every signed-in merchant, but a malformed response should still
    // render the empty hint instead of blank cards.
    mockFetch.mockResolvedValueOnce({ data: {} })

    const wrapper = mount(Billing)
    await flushPromises()

    expect(wrapper.find('[data-testid="billing-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="billing-wallet"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="billing-invoices"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('No billing data yet')
  })

  it('renders the wallet card with an empty invoices placeholder when invoices is null', async () => {
    // V2.16 sweep fix — backend may omit `invoices` entirely. The
    // wallet card still renders; the invoices table shows the legacy
    // "No invoices yet." copy.
    mockFetch.mockResolvedValueOnce({
      data: {
        balance_sgd: 500,
        burn7_sgd: 100,
        days_runway: 10,
        invoices: null
      }
    })

    const wrapper = mount(Billing)
    await flushPromises()

    expect(wrapper.find('[data-testid="billing-wallet"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="billing-invoices"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="billing-invoices-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No invoices yet')
    expect(wrapper.findAll('[data-testid="billing-invoice-row"]')).toHaveLength(0)
  })

  it('shows the error branch when the fetch rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))

    const wrapper = mount(Billing)
    await flushPromises()

    expect(wrapper.find('[data-testid="billing-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="billing-wallet"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="billing-invoices"]').exists()).toBe(false)
  })
})
