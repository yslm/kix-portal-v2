/**
 * StatusStrip.vue render test — covers the three meaningful render branches
 * for the Overview status strip:
 *
 *   1. Fetcher resolves with data → strip renders all 4 metrics with correct
 *      formatted values (wallet, new-7d, campaigns, runway).
 *   2. Fetcher rejects (e.g. demo-mode 401) → strip renders nothing (self-hide,
 *      matching the NbaCard / SetupGuideCard "non-critical card" pattern at
 *      portal.html line 4196).
 *   3. While loading → strip renders nothing (avoid layout flicker, same as
 *      NbaCard visible-gate logic).
 *
 * Element Plus (el-card) is stubbed locally — same approach as NbaCard.spec.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/overview', () => ({
  fetchNextBestAction: vi.fn(),
  fetchSetupGuide: vi.fn(),
  fetchOverview: vi.fn()
}))

import StatusStrip from '../StatusStrip.vue'
import { fetchOverview } from '@/api/portal-admin/overview'

const stubs = {
  'el-card': {
    template: '<div data-stub="el-card"><slot name="header" /><slot /></div>'
  }
}

describe('StatusStrip.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all 4 metrics with correct formatted values when data resolves', async () => {
    ;(fetchOverview as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        wallet_sgd: 1234,
        new_customers_7d: 42,
        campaigns_live: 3,
        runway_days: 28
      }
    })

    const wrapper = mount(StatusStrip, { global: { stubs } })
    await flushPromises()

    // Strip root must be present
    expect(wrapper.find('[data-testid="status-strip"]').exists()).toBe(true)

    // Wallet: fmtSgd(1234) → 'S$1,234' (en-SG thousands separator)
    const walletEl = wrapper.find('[data-testid="status-wallet"]')
    expect(walletEl.exists()).toBe(true)
    expect(walletEl.text()).toContain('S$1,234')

    // New customers 7d: '42 ↑'
    const new7dEl = wrapper.find('[data-testid="status-new7d"]')
    expect(new7dEl.exists()).toBe(true)
    expect(new7dEl.text()).toContain('42')
    expect(new7dEl.text()).toContain('↑')

    // Campaigns live: '3 live'
    const campaignsEl = wrapper.find('[data-testid="status-campaigns"]')
    expect(campaignsEl.exists()).toBe(true)
    expect(campaignsEl.text()).toContain('3')
    expect(campaignsEl.text()).toContain('live')

    // Runway days: '28 days'
    const runwayEl = wrapper.find('[data-testid="status-runway"]')
    expect(runwayEl.exists()).toBe(true)
    expect(runwayEl.text()).toContain('28')
    expect(runwayEl.text()).toContain('days')
  })

  it('renders nothing (self-hides) when the fetch rejects', async () => {
    ;(fetchOverview as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('401 Unauthorized')
    )

    const wrapper = mount(StatusStrip, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="status-strip"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('renders nothing while loading (pre-mount state)', () => {
    // Never resolves during this test — simulates in-flight loading state
    ;(fetchOverview as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise(() => {})
    )

    const wrapper = mount(StatusStrip, { global: { stubs } })

    // Before flushPromises — still loading
    expect(wrapper.find('[data-testid="status-strip"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})
