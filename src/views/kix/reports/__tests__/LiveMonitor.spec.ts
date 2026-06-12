/**
 * LiveMonitor.vue render test — Reports · Live monitoring "Live now".
 *
 * Consumes the composed `fetchLiveMonitor()` reading (plays_per_min,
 * plays_today, redemptions_today, new_customers_today). Four honest
 * stats, each backed by a real endpoint — the legacy p95-latency /
 * error-rate tiles are intentionally dropped (no backend source).
 *
 * Branches covered:
 *   1. all four values present       → four stat tiles render
 *   2. a null field                  → renders "—" (partial tolerance)
 *   3. zero values                   → render "0" (a real live reading)
 *   4. all-null reading              → card hidden (both legs failed)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/reports', () => ({
  fetchLiveMonitor: vi.fn()
}))

import LiveMonitor from '../LiveMonitor.vue'
import { fetchLiveMonitor } from '@/api/portal-admin/reports'

const mockFetch = fetchLiveMonitor as unknown as ReturnType<typeof vi.fn>

describe('LiveMonitor.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the four live stats when all values are present', async () => {
    mockFetch.mockResolvedValueOnce({
      data: { plays_per_min: 2.4, plays_today: 318, redemptions_today: 24, new_customers_today: 12 }
    })

    const wrapper = mount(LiveMonitor)
    await flushPromises()

    expect(wrapper.find('[data-testid="live-monitor-card"]').exists()).toBe(true)
    const text = wrapper.text()
    expect(text).toContain('2.4')
    expect(text).toContain('318')
    expect(text).toContain('24')
    expect(text).toContain('12')
  })

  it('renders "—" for a null field (failed leg)', async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        plays_per_min: 2.4,
        plays_today: 318,
        redemptions_today: null,
        new_customers_today: null
      }
    })

    const wrapper = mount(LiveMonitor)
    await flushPromises()

    expect(wrapper.find('[data-testid="live-monitor-card"]').exists()).toBe(true)
    expect((wrapper.text().match(/—/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  it('renders 0 as a real reading (not hidden)', async () => {
    mockFetch.mockResolvedValueOnce({
      data: { plays_per_min: 0, plays_today: 0, redemptions_today: 0, new_customers_today: 0 }
    })

    const wrapper = mount(LiveMonitor)
    await flushPromises()

    expect(wrapper.find('[data-testid="live-monitor-card"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('0')
  })

  it('hides the card when the reading is entirely null (both legs failed)', async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        plays_per_min: null,
        plays_today: null,
        redemptions_today: null,
        new_customers_today: null
      }
    })

    const wrapper = mount(LiveMonitor)
    await flushPromises()

    expect(wrapper.find('[data-testid="live-monitor-card"]').exists()).toBe(false)
  })
})
