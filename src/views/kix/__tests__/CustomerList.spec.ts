/**
 * CustomerList.vue render test — exercises the four state branches of the
 * verified-customers table: loaded (legacy `{ customers }` wrapper), bare
 * array (defensive), error, and empty.
 *
 * Same fixture / stubbing shape as Flows.spec.ts — `t(key) => key` stub,
 * no brand-id stub needed because `listCustomers()` infers brand from the
 * JWT (no explicit `?brand=` param, mirroring Reports). The actual
 * translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/customers', () => ({
  listCustomers: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import CustomerList from '../CustomerList.vue'
import { listCustomers } from '@/api/portal-admin/customers'

const sampleCustomers = [
  {
    id: 'c-001',
    name: 'Aisha Tan',
    handle: 'aisha_t',
    channel: 'phone',
    first_seen: '2026-01-12',
    plays: 8,
    redeems: 2,
    last_active: '2026-06-09'
  },
  {
    // No `name` — display falls back to `handle` (legacy `c.name||c.handle`).
    handle: 'bobby88',
    channel: 'email',
    first_seen: '2026-02-03',
    plays: 1,
    redeems: 0,
    last_active: '2026-05-22'
  }
]

describe('CustomerList.vue · verified-customers table', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header and the customers table after a successful fetch (legacy `{ customers }` shape)', async () => {
    ;(listCustomers as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { customers: sampleCustomers }
    })

    const wrapper = mount(CustomerList)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.customers.title')
    expect(wrapper.text()).toContain('portal.customers.subtitle')

    // Data branch visible; loading / error / empty hidden.
    expect(wrapper.find('[data-testid="customers-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="customers-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="customers-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="customers-empty"]').exists()).toBe(false)

    const rows = wrapper.findAll('[data-testid="customer-row"]')
    expect(rows).toHaveLength(2)

    // Row 1: explicit `name` wins over `handle`; channel + counts rendered.
    expect(rows[0].text()).toContain('Aisha Tan')
    expect(rows[0].text()).toContain('phone')
    expect(rows[0].text()).toContain('2026-01-12')
    expect(rows[0].text()).toContain('8')
    expect(rows[0].text()).toContain('2')
    expect(rows[0].text()).toContain('2026-06-09')

    // Row 2: missing `name` → falls back to `handle` (legacy behaviour).
    expect(rows[1].text()).toContain('bobby88')
    expect(rows[1].text()).toContain('email')
    expect(rows[1].text()).toContain('1')
    expect(rows[1].text()).toContain('0')
  })

  it('normalises a bare-array response', async () => {
    ;(listCustomers as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleCustomers
    })

    const wrapper = mount(CustomerList)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="customer-row"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Aisha Tan')
  })

  it('shows the error branch when fetch rejects', async () => {
    ;(listCustomers as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('network down')
    )

    const wrapper = mount(CustomerList)
    await flushPromises()

    expect(wrapper.find('[data-testid="customers-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="customers-list"]').exists()).toBe(false)
  })

  it('shows the empty-state placeholder when the brand has no customers', async () => {
    ;(listCustomers as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { customers: [] }
    })

    const wrapper = mount(CustomerList)
    await flushPromises()

    expect(wrapper.find('[data-testid="customers-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No customers yet')
    expect(wrapper.find('[data-testid="customers-list"]').exists()).toBe(false)
  })
})
