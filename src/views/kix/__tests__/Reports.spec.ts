/**
 * Reports.vue render test — exercises the four state branches of the
 * Simple-mode owner-report card: loaded (all three fields), partial
 * (one leg null → em-dash), empty (every leg null → empty hero), and
 * error (mounted `fetchOwnerReport` throws).
 *
 * Same fixture / stubbing shape as Flows.spec.ts — `t(key) => key` stub.
 * The actual translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/reports', () => ({
  fetchOwnerReport: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Reports from '../Reports.vue'
import { fetchOwnerReport } from '@/api/portal-admin/reports'

describe('Reports.vue · owner-report summary card', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header and the three owner numbers after a successful fetch', async () => {
    ;(fetchOwnerReport as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      newCustomers: 12,
      redemptionsToday: 4,
      returningPlayers: 7
    })

    const wrapper = mount(Reports)
    await flushPromises()

    // Header — i18n keys passed through the stub render verbatim.
    expect(wrapper.text()).toContain('portal.reports.title')
    expect(wrapper.text()).toContain('portal.reports.subtitle')

    // Owner summary card visible; loading / error / empty hidden.
    expect(wrapper.find('[data-testid="owner-report"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="reports-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="reports-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="reports-empty"]').exists()).toBe(false)

    expect(wrapper.find('[data-testid="own-new"]').text()).toBe('12')
    expect(wrapper.find('[data-testid="own-redeem"]').text()).toBe('4')
    expect(wrapper.find('[data-testid="own-repeat"]').text()).toBe('7')

    // i18n labels rendered next to each number.
    expect(wrapper.text()).toContain('portal.owner.new_customers')
    expect(wrapper.text()).toContain('portal.owner.redemptions')
    expect(wrapper.text()).toContain('portal.owner.repeat')
  })

  it('renders em-dash placeholders for partial failures (one leg null)', async () => {
    ;(fetchOwnerReport as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      newCustomers: 3,
      redemptionsToday: null,
      returningPlayers: 0
    })

    const wrapper = mount(Reports)
    await flushPromises()

    // Card is still visible — partial data is the legacy "additive" path.
    expect(wrapper.find('[data-testid="owner-report"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="reports-empty"]').exists()).toBe(false)

    expect(wrapper.find('[data-testid="own-new"]').text()).toBe('3')
    expect(wrapper.find('[data-testid="own-redeem"]').text()).toBe('—')
    expect(wrapper.find('[data-testid="own-repeat"]').text()).toBe('0')
  })

  it('shows the empty-state placeholder when every leg returns null', async () => {
    ;(fetchOwnerReport as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      newCustomers: null,
      redemptionsToday: null,
      returningPlayers: null
    })

    const wrapper = mount(Reports)
    await flushPromises()

    expect(wrapper.find('[data-testid="reports-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No reports data yet')
    expect(wrapper.find('[data-testid="owner-report"]').exists()).toBe(false)
  })

  it('shows the error branch when fetchOwnerReport rejects', async () => {
    ;(fetchOwnerReport as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('network down')
    )

    const wrapper = mount(Reports)
    await flushPromises()

    expect(wrapper.find('[data-testid="reports-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="owner-report"]').exists()).toBe(false)
  })
})
