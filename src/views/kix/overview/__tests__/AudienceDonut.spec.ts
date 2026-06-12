/**
 * AudienceDonut.vue render test.
 *
 * Branches covered:
 *   1. Fetcher resolves with segments → component visible, legend rows rendered,
 *      correct data passed to ArtRingChart stub.
 *   2. Fetcher rejects → self-hides.
 *   3. Fetcher resolves with empty array → self-hides (isReady gate).
 *   4. While loading → self-hides.
 *
 * ArtRingChart uses echarts which does not render in jsdom. We stub it and
 * assert on the legend DOM + the ringData / colors props forwarded to the stub.
 * Asserting the legend DOM exercises the non-echarts part of the component.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/overview', () => ({
  fetchAudienceBreakdown: vi.fn()
}))

import AudienceDonut from '../AudienceDonut.vue'
import { fetchAudienceBreakdown } from '@/api/portal-admin/overview'

let lastRingProps: Record<string, unknown> = {}

const stubs = {
  ArtRingChart: {
    template: '<div data-stub="art-ring-chart" />',
    props: ['data', 'colors', 'radius', 'height', 'showLabel', 'borderRadius', 'showTooltip'],
    setup(props: Record<string, unknown>) {
      lastRingProps = { ...props }
    }
  }
}

const MOCK_SEGMENTS = [
  { source: 'QR poster', count: 142, pct: 46, color: '#3b82f6' },
  { source: 'Social', count: 87, pct: 28, color: '#10b981' },
  { source: 'Referral', count: 53, pct: 17, color: '#f59e0b' },
  { source: 'Walk-in', count: 28, pct: 9, color: '#8b5cf6' }
]

describe('AudienceDonut.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastRingProps = {}
  })

  it('renders legend rows and passes correct data/colors to ArtRingChart on resolve', async () => {
    ;(fetchAudienceBreakdown as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: MOCK_SEGMENTS
    })

    const wrapper = mount(AudienceDonut, { global: { stubs } })
    await flushPromises()

    // Card root visible
    expect(wrapper.find('[data-testid="audience-donut"]').exists()).toBe(true)

    // ArtRingChart stub rendered
    expect(wrapper.find('[data-stub="art-ring-chart"]').exists()).toBe(true)

    // ring data matches segment counts
    expect(lastRingProps.data).toEqual([
      { value: 142, name: 'QR poster' },
      { value: 87, name: 'Social' },
      { value: 53, name: 'Referral' },
      { value: 28, name: 'Walk-in' }
    ])

    // colors come from segment.color → ArtRingChart `colors` prop (plural)
    expect(lastRingProps.colors).toEqual(['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'])

    // Legend rows rendered
    const legend = wrapper.find('[data-testid="audience-legend"]')
    expect(legend.exists()).toBe(true)
    const text = legend.text()
    expect(text).toContain('QR poster')
    expect(text).toContain('142 (46%)')
    expect(text).toContain('Social')
    expect(text).toContain('87 (28%)')
    expect(text).toContain('Walk-in')
    expect(text).toContain('28 (9%)')
  })

  it('self-hides when the fetch rejects', async () => {
    ;(fetchAudienceBreakdown as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('401 Unauthorized')
    )

    const wrapper = mount(AudienceDonut, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="audience-donut"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('self-hides when the resolved array is empty', async () => {
    ;(fetchAudienceBreakdown as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: []
    })

    const wrapper = mount(AudienceDonut, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="audience-donut"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('self-hides while loading', () => {
    ;(fetchAudienceBreakdown as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise(() => {})
    )

    const wrapper = mount(AudienceDonut, { global: { stubs } })

    expect(wrapper.find('[data-testid="audience-donut"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})
