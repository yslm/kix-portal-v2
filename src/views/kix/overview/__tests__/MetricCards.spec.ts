/**
 * MetricCards.vue render test — covers the four meaningful render branches
 * for the Overview KPI metric card row:
 *
 *   1. Fetcher resolves with 4 cards → renders all 4 cards with correct
 *      label / value / delta (arrow + abs pct + sub_label) / sub text.
 *   2. delta_direction='up' → delta text has green class; 'down' → red class.
 *   3. Fetcher rejects (e.g. demo-mode 401) → renders nothing (self-hide).
 *   4. Fetcher resolves with empty array → renders nothing (self-hide via
 *      isReady predicate).
 *   5. While loading (never-resolving promise) → renders nothing.
 *   6. neutral/flat direction → NO ↑/↓ arrow glyphs in delta text.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/overview', () => ({
  fetchMetrics: vi.fn()
}))

import MetricCards from '../MetricCards.vue'
import { LABELS } from '../metricLabels'
import { fetchMetrics } from '@/api/portal-admin/overview'

const MOCK_METRICS = [
  {
    value: '9,120',
    delta_pct: 12.5,
    delta_direction: 'up',
    sub_label: 'vs last 7d',
    benchmark_note: 'up vs last week'
  },
  {
    value: '3,450',
    delta_pct: 4.2,
    delta_direction: 'down',
    sub_label: 'vs last 7d'
  },
  {
    value: '214',
    delta_pct: 0,
    delta_direction: 'neutral',
    sub_label: 'vs last 7d',
    benchmark_note: 'flat vs last week'
  },
  {
    value: 'S$1,800 · S$8.41',
    delta_pct: 2.1,
    delta_direction: 'up',
    sub_label: 'CPA benchmark'
  }
]

describe('MetricCards.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders 4 cards with correct label / value / delta / sub on resolve', async () => {
    ;(fetchMetrics as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: MOCK_METRICS
    })

    const wrapper = mount(MetricCards)
    await flushPromises()

    // Root container must be present
    expect(wrapper.find('[data-testid="metric-cards"]').exists()).toBe(true)

    // Each card
    for (let i = 0; i < 4; i++) {
      const card = wrapper.find(`[data-testid="metric-card-${i}"]`)
      expect(card.exists()).toBe(true)

      // Label — assert against the exported LABELS constant so a rename is caught
      const label = card.find('[data-testid="metric-label"]')
      expect(label.exists()).toBe(true)
      expect(label.text()).toBe(LABELS[i])

      // Value — rendered as-is from server
      const value = card.find('[data-testid="metric-value"]')
      expect(value.exists()).toBe(true)
      expect(value.text()).toContain(String(MOCK_METRICS[i].value))

      // Delta — arrow + abs pct + sub_label
      const delta = card.find('[data-testid="metric-delta"]')
      expect(delta.exists()).toBe(true)
      const m = MOCK_METRICS[i]
      expect(delta.text()).toContain(String(Math.abs(m.delta_pct)))
      expect(delta.text()).toContain(m.sub_label)

      // Sub — benchmark_note ?? sub_label
      const sub = card.find('[data-testid="metric-sub"]')
      expect(sub.exists()).toBe(true)
      const expectedSub = m.benchmark_note ?? m.sub_label
      expect(sub.text()).toContain(expectedSub)
    }
  })

  it('renders delta arrow ↑ for direction=up, ↓ for direction=down, and NO arrow for neutral', async () => {
    ;(fetchMetrics as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: MOCK_METRICS
    })

    const wrapper = mount(MetricCards)
    await flushPromises()

    // card-0: direction='up' → must contain ↑
    const card0Delta = wrapper.find('[data-testid="metric-card-0"] [data-testid="metric-delta"]')
    expect(card0Delta.text()).toContain('↑')
    expect(card0Delta.text()).not.toMatch(/↓/)

    // card-1: direction='down' → must contain ↓
    const card1Delta = wrapper.find('[data-testid="metric-card-1"] [data-testid="metric-delta"]')
    expect(card1Delta.text()).toContain('↓')
    expect(card1Delta.text()).not.toMatch(/↑/)

    // card-2: direction='neutral' → MUST NOT contain ↑ or ↓
    // (the separator · is present in every delta line, so toContain('·') is not
    // a valid neutral check — use a negative assertion on the arrow glyphs instead)
    const card2Delta = wrapper.find('[data-testid="metric-card-2"] [data-testid="metric-delta"]')
    expect(card2Delta.text()).not.toMatch(/[↑↓]/)
  })

  it('applies text-success class for up delta and text-danger class for down delta', async () => {
    ;(fetchMetrics as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: MOCK_METRICS
    })

    const wrapper = mount(MetricCards)
    await flushPromises()

    // Restyled to art-design-pro theme tokens: text-success (up) / text-danger (down)
    const upDelta = wrapper.find('[data-testid="metric-card-0"] [data-testid="metric-delta"]')
    expect(upDelta.classes()).toContain('text-success')

    const downDelta = wrapper.find('[data-testid="metric-card-1"] [data-testid="metric-delta"]')
    expect(downDelta.classes()).toContain('text-danger')
  })

  it('renders nothing while loading (pre-mount state)', () => {
    // Never resolves during this test — simulates in-flight loading state
    ;(fetchMetrics as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise(() => {})
    )

    const wrapper = mount(MetricCards)

    // Before flushPromises — still loading
    expect(wrapper.find('[data-testid="metric-cards"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('renders nothing (self-hides) when the fetch rejects', async () => {
    ;(fetchMetrics as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('401 Unauthorized')
    )

    const wrapper = mount(MetricCards)
    await flushPromises()

    expect(wrapper.find('[data-testid="metric-cards"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('renders nothing (self-hides) when the fetch resolves with an empty array', async () => {
    ;(fetchMetrics as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: []
    })

    const wrapper = mount(MetricCards)
    await flushPromises()

    expect(wrapper.find('[data-testid="metric-cards"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('renders only the cards present when backend returns fewer than 4', async () => {
    const partial = MOCK_METRICS.slice(0, 2)
    ;(fetchMetrics as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: partial
    })

    const wrapper = mount(MetricCards)
    await flushPromises()

    expect(wrapper.find('[data-testid="metric-card-0"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="metric-card-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="metric-card-2"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="metric-card-3"]').exists()).toBe(false)
  })
})
