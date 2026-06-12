/**
 * Overview.vue render test — exercises the loaded/error branches of the
 * live-cards section. Uses bare `t(key) => key` to avoid spinning up the
 * full vue-i18n setup; the actual translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/overview', () => ({
  fetchLiveCards: vi.fn(),
  // New fetchers used by sub-components imported in Overview.vue.
  // They self-hide on error/empty so returning a never-resolving promise
  // keeps the sub-cards hidden without affecting the live-cards section.
  fetchCohort: vi.fn(() => new Promise(() => {})),
  fetchAudienceBreakdown: vi.fn(() => new Promise(() => {})),
  fetchLiveActivity: vi.fn(() => new Promise(() => {})),
  // Other fetchers referenced transitively by non-critical cards.
  fetchOverview: vi.fn(() => new Promise(() => {})),
  fetchMetrics: vi.fn(() => new Promise(() => {})),
  fetchSetupGuide: vi.fn(() => new Promise(() => {})),
  fetchNextBestAction: vi.fn(() => new Promise(() => {}))
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Overview from '../Overview.vue'
import { fetchLiveCards } from '@/api/portal-admin/overview'

const sampleCard = {
  cid: 'c-1',
  name: 'Weekend Spin',
  players: 47,
  vouchers: 31,
  redeems: 12,
  spend_sgd: 28.5,
  budget_sgd: 200,
  spend_pct: 14,
  stale_seconds: 3
}

describe('Overview.vue · live-cards section', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header and a card after a successful fetch', async () => {
    ;(fetchLiveCards as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { cards: [sampleCard] }
    })

    const wrapper = mount(Overview)
    await flushPromises()

    // page header uses i18n keys; our t-stub returns the key
    expect(wrapper.text()).toContain('portal.overview.title')
    expect(wrapper.text()).toContain('portal.overview.subtitle')

    // card data renders
    expect(wrapper.text()).toContain('Weekend Spin')
    expect(wrapper.text()).toContain('47')
    expect(wrapper.text()).toContain('31')
    expect(wrapper.text()).toContain('12')
    // fmtSgd (extracted to src/utils/format/currency) trims trailing zeros and
    // uses thousands separators — see Plan 3 Task 1.
    expect(wrapper.text()).toContain('S$28.5')
    expect(wrapper.text()).toContain('S$200')
    expect(wrapper.find('[data-testid="live-cards-grid"]').exists()).toBe(true)
  })

  it('shows the error branch when fetch rejects', async () => {
    ;(fetchLiveCards as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom')
    )

    const wrapper = mount(Overview)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('boom')
    expect(wrapper.find('[data-testid="live-cards-grid"]').exists()).toBe(false)
  })
})
