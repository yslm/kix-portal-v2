/**
 * NewCustomersChart.vue render test.
 *
 * Branches covered:
 *   1. Fetcher resolves with 14 rows → component visible, correct sum value,
 *      correct chartData passed to ArtLineChartCard.
 *   2. Fetcher rejects → self-hides.
 *   3. Fetcher resolves with empty array → self-hides (isReady gate).
 *   4. While loading (never-resolving promise) → self-hides.
 *
 * ArtLineChartCard uses echarts internally. Because echarts does not render
 * in jsdom (ResizeObserver + canvas missing), we stub ArtLineChartCard and
 * assert that the correct props are forwarded to it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/overview', () => ({
  fetchCohort: vi.fn()
}))

import NewCustomersChart from '../NewCustomersChart.vue'
import { fetchCohort } from '@/api/portal-admin/overview'

/** Capture the last prop set received by the stub. */
let lastProps: Record<string, unknown> = {}

const stubs = {
  ArtLineChartCard: {
    template: '<div data-stub="art-line-chart-card" />',
    props: ['value', 'label', 'percentage', 'chartData', 'showAreaColor', 'height'],
    setup(props: Record<string, unknown>) {
      lastProps = { ...props }
    }
  }
}

const MOCK_COHORT = [
  { cohort_day: '2026-05-30', new_customers: 7 },
  { cohort_day: '2026-05-31', new_customers: 12 },
  { cohort_day: '2026-06-01', new_customers: 5 },
  { cohort_day: '2026-06-02', new_customers: 18 },
  { cohort_day: '2026-06-03', new_customers: 22 },
  { cohort_day: '2026-06-04', new_customers: 9 },
  { cohort_day: '2026-06-05', new_customers: 14 },
  { cohort_day: '2026-06-06', new_customers: 11 },
  { cohort_day: '2026-06-07', new_customers: 19 },
  { cohort_day: '2026-06-08', new_customers: 8 },
  { cohort_day: '2026-06-09', new_customers: 24 },
  { cohort_day: '2026-06-10', new_customers: 16 },
  { cohort_day: '2026-06-11', new_customers: 21 },
  { cohort_day: '2026-06-12', new_customers: 13 }
]

const EXPECTED_SUM = MOCK_COHORT.reduce((s, r) => s + r.new_customers, 0) // 199
const EXPECTED_CHART_DATA = MOCK_COHORT.map((r) => r.new_customers)

describe('NewCustomersChart.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastProps = {}
  })

  it('renders and passes correct props to ArtLineChartCard when data resolves', async () => {
    ;(fetchCohort as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: MOCK_COHORT
    })

    const wrapper = mount(NewCustomersChart, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="new-customers-chart"]').exists()).toBe(true)
    expect(wrapper.find('[data-stub="art-line-chart-card"]').exists()).toBe(true)

    // Sum of all 14 rows
    expect(lastProps.value).toBe(EXPECTED_SUM)
    // chartData array matches per-day counts
    expect(lastProps.chartData).toEqual(EXPECTED_CHART_DATA)
    // label
    expect(lastProps.label).toBe('New customers · 14 days')
  })

  it('self-hides when the fetch rejects', async () => {
    ;(fetchCohort as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('401 Unauthorized')
    )

    const wrapper = mount(NewCustomersChart, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="new-customers-chart"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('self-hides when the resolved array is empty', async () => {
    ;(fetchCohort as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: []
    })

    const wrapper = mount(NewCustomersChart, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="new-customers-chart"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('self-hides while loading (pre-mount, never-resolving promise)', () => {
    ;(fetchCohort as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(new Promise(() => {}))

    const wrapper = mount(NewCustomersChart, { global: { stubs } })

    expect(wrapper.find('[data-testid="new-customers-chart"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})
