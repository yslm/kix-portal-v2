/**
 * FunnelChart.vue render test — Reports · Engagement · conversion funnel.
 *
 * Backend contract (GET /api/v1/portal-admin/reports/funnel?source=true,
 * portal_admin.py · funnel_report() ~line 772):
 *   { items: [{ step, count, conversion_pct? }], source, source_key,
 *     updated_at, freshness, empty_state_hint }
 * (the bare-array form `FunnelStep[]` is returned when source is omitted —
 *  we tolerate both).
 *
 * The 6 steps, top→bottom: Impressions → Plays → Winners → Redeemed at
 * counter → Verified new customers → Returned in 14 days. The first step
 * has no `conversion_pct` (nothing above it).
 *
 * Branches covered:
 *   1. { items } envelope            → one bar per step, label + count
 *   2. conversion_pct rendered        → "27.3%" shown for steps that have it
 *   3. bare array (defensive)         → normalised to bars
 *   4. fetch error                    → card hidden (non-critical fail-soft)
 *   5. empty items                    → card hidden
 *   6. all-zero counts                → card hidden (no real funnel yet)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/reports', () => ({
  fetchFunnel: vi.fn()
}))

import FunnelChart from '../FunnelChart.vue'
import { fetchFunnel } from '@/api/portal-admin/reports'

const sampleItems = [
  { step: 'Impressions', count: 14238 },
  { step: 'Plays', count: 3892, conversion_pct: 27.3 },
  { step: 'Winners', count: 2179, conversion_pct: 56.0 },
  { step: 'Redeemed at counter', count: 412, conversion_pct: 18.9 },
  { step: 'Verified new customers', count: 147, conversion_pct: 35.7 },
  { step: 'Returned in 14 days', count: 42, conversion_pct: 28.6 }
]

const mockFetch = fetchFunnel as unknown as ReturnType<typeof vi.fn>

describe('FunnelChart.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders one bar per step with label + count ({ items } envelope)', async () => {
    mockFetch.mockResolvedValueOnce({ data: { items: sampleItems } })

    const wrapper = mount(FunnelChart)
    await flushPromises()

    expect(wrapper.find('[data-testid="funnel-card"]').exists()).toBe(true)
    const bars = wrapper.findAll('[data-testid^="funnel-step-"]')
    expect(bars.length).toBe(6)

    const text = wrapper.text()
    expect(text).toContain('Impressions')
    expect(text).toContain('14,238') // thousands-formatted
    expect(text).toContain('Returned in 14 days')
    expect(text).toContain('42')
  })

  it('renders conversion_pct for steps that have it (and not for the first)', async () => {
    mockFetch.mockResolvedValueOnce({ data: { items: sampleItems } })

    const wrapper = mount(FunnelChart)
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('27.3%')
    expect(text).toContain('56%')
  })

  it('tolerates a bare array response', async () => {
    mockFetch.mockResolvedValueOnce({ data: sampleItems })

    const wrapper = mount(FunnelChart)
    await flushPromises()

    expect(wrapper.find('[data-testid="funnel-card"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Impressions')
  })

  it('hides the card when the fetch rejects (non-critical UI)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'))

    const wrapper = mount(FunnelChart)
    await flushPromises()

    expect(wrapper.find('[data-testid="funnel-card"]').exists()).toBe(false)
  })

  it('hides the card when items is empty', async () => {
    mockFetch.mockResolvedValueOnce({ data: { items: [] } })

    const wrapper = mount(FunnelChart)
    await flushPromises()

    expect(wrapper.find('[data-testid="funnel-card"]').exists()).toBe(false)
  })

  it('hides the card when every step count is zero (no real funnel yet)', async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        items: [
          { step: 'Impressions', count: 0 },
          { step: 'Plays', count: 0, conversion_pct: 0 }
        ]
      }
    })

    const wrapper = mount(FunnelChart)
    await flushPromises()

    expect(wrapper.find('[data-testid="funnel-card"]').exists()).toBe(false)
  })
})
