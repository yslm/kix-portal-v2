/**
 * AbTests.vue render test — exercises the four state branches of the
 * A/B tests list: loaded (canonical `{ items, ... }` wrapper — the
 * shape `/api/v1/portal-admin/ab-tests` actually returns), bare-array
 * defensive fallback, error, and empty.
 *
 * Same fixture / stubbing shape as Audiences.spec.ts — `t(key) => key`
 * stub, no brand-id stub needed because `listAbTests()` infers brand
 * from the JWT (no explicit `?brand=` param, mirroring CustomerList +
 * Audiences). The actual translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/abtests', () => ({
  listAbTests: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import AbTests from '../AbTests.vue'
import { listAbTests } from '@/api/portal-admin/abtests'

// Schema mirrors `_demo_abtests()` at app/routers/portal_admin.py:2605 —
// the exact rows the backend emits for demo brands.
const sampleAbTests = [
  {
    id: 'abt_morning_cta',
    name: 'Morning Combo · CTA copy',
    campaign_a_id: 'c_lunch_spin',
    campaign_a_name: 'Lunch spin · 200m geofence',
    campaign_b_id: 'c_scratch_breakfast',
    campaign_b_name: 'Scratch & win · breakfast',
    metric: 'CTR',
    status: 'running',
    lift_pct: 18.4,
    p_value: 0.012,
    created_at: '2026-05-28T09:00:00+00:00'
  },
  {
    id: 'abt_weekend_tier',
    name: 'Weekend Spin · reward tier',
    campaign_a_id: 'c_lunch_spin',
    campaign_a_name: 'Lunch spin · 200m geofence',
    campaign_b_id: 'c_mystery_evening',
    campaign_b_name: 'Mystery box · evening',
    metric: 'Conversion',
    // Unknown-but-truthy status → StatusBadge falls back to gray pill.
    status: 'shipped',
    lift_pct: 4.1,
    p_value: 0.18,
    created_at: '2026-05-30T11:00:00+00:00'
  }
]

describe('AbTests.vue · A/B tests list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header and the tests table after a successful fetch (canonical `{ items, ... }` wrapper)', async () => {
    ;(listAbTests as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        items: sampleAbTests,
        source: 'redis · abtests:demo',
        updated_at: '2026-06-11T08:00:00+00:00',
        campaign_count: 4,
        can_create: true,
        empty_state_hint: null
      }
    })

    const wrapper = mount(AbTests)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.abtests.title')
    expect(wrapper.text()).toContain('portal.abtests.subtitle')

    // Data branch visible; loading / error / empty hidden.
    expect(wrapper.find('[data-testid="abtests-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="abtests-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="abtests-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="abtests-empty"]').exists()).toBe(false)

    const rows = wrapper.findAll('[data-testid="abtest-row"]')
    expect(rows).toHaveLength(2)

    // Row 1: name + status + variant count (2 because both campaign_*_id
    // are present) + created_at all rendered.
    expect(rows[0].text()).toContain('Morning Combo · CTA copy')
    expect(rows[0].text()).toContain('running')
    expect(rows[0].text()).toContain('2')
    expect(rows[0].text()).toContain('2026-05-28T09:00:00+00:00')

    // Row 2: shipped status → unknown-key fallback in StatusBadge (the
    // mapping table has 'ended' + 'failed' but not 'shipped' — gray
    // pill is the safe default; we just check the literal renders).
    expect(rows[1].text()).toContain('Weekend Spin · reward tier')
    expect(rows[1].text()).toContain('shipped')
    expect(rows[1].text()).toContain('2')
  })

  it('normalises a bare-array response (defensive fallback)', async () => {
    ;(listAbTests as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleAbTests
    })

    const wrapper = mount(AbTests)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="abtest-row"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Morning Combo · CTA copy')
  })

  it('shows the error branch when fetch rejects', async () => {
    ;(listAbTests as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('network down')
    )

    const wrapper = mount(AbTests)
    await flushPromises()

    expect(wrapper.find('[data-testid="abtests-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="abtests-list"]').exists()).toBe(false)
  })

  it('shows the empty-state placeholder when the brand has no A/B tests', async () => {
    ;(listAbTests as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { items: [], can_create: true, empty_state_hint: 'No A/B tests yet' }
    })

    const wrapper = mount(AbTests)
    await flushPromises()

    expect(wrapper.find('[data-testid="abtests-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No A/B tests yet')
    expect(wrapper.find('[data-testid="abtests-list"]').exists()).toBe(false)
  })
})
