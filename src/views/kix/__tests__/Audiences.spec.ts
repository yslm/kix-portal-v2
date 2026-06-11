/**
 * Audiences.vue render test — exercises the four state branches of the
 * saved-audiences table: loaded (bare array — the canonical
 * portal-admin shape), `{ audiences }` wrapper (defensive), error, and
 * empty.
 *
 * Same fixture / stubbing shape as CustomerList.spec.ts — `t(key) => key`
 * stub, no brand-id stub needed because `listAudiences()` infers brand
 * from the JWT (no explicit `?brand=` param, mirroring Reports +
 * CustomerList). The actual translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/audiences', () => ({
  listAudiences: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Audiences from '../Audiences.vue'
import { listAudiences } from '@/api/portal-admin/audiences'

const sampleAudiences = [
  {
    id: 'aud_bedok_200m',
    name: 'Bedok · 200m geofence',
    type: 'geofence',
    size_estimate: 18000,
    geofence_m: 200,
    created_at: '2026-03-15',
    last_used_at: '2026-05-31'
  },
  {
    // No `type` — display falls back to em-dash badge placeholder.
    id: 'aud_first_time',
    name: 'First-time customers',
    size_estimate: 42000,
    created_at: '2026-04-02',
    last_used_at: null
  }
]

describe('Audiences.vue · saved-audiences table', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header and the audiences table after a successful fetch (bare-array shape — canonical portal-admin)', async () => {
    ;(listAudiences as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleAudiences
    })

    const wrapper = mount(Audiences)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.audiences.title')
    expect(wrapper.text()).toContain('portal.audiences.subtitleFull')

    // Data branch visible; loading / error / empty hidden.
    expect(wrapper.find('[data-testid="audiences-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="audiences-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="audiences-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="audiences-empty"]').exists()).toBe(false)

    const rows = wrapper.findAll('[data-testid="audience-row"]')
    expect(rows).toHaveLength(2)

    // Row 1: full set of fields rendered.
    expect(rows[0].text()).toContain('Bedok · 200m geofence')
    expect(rows[0].text()).toContain('geofence')
    // size_estimate=18000 → grouped as 18,000 by toLocaleString (en-US default
    // under the vitest jsdom runtime).
    expect(rows[0].text()).toContain('18,000')
    expect(rows[0].text()).toContain('2026-03-15')
    expect(rows[0].text()).toContain('2026-05-31')

    // Row 2: missing `type` + null `last_used_at` → em-dash fallbacks.
    expect(rows[1].text()).toContain('First-time customers')
    expect(rows[1].text()).toContain('42,000')
    expect(rows[1].text()).toContain('2026-04-02')
    expect(rows[1].text()).toContain('—')
  })

  it('normalises a `{ audiences: [...] }` wrapper response', async () => {
    ;(listAudiences as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { audiences: sampleAudiences }
    })

    const wrapper = mount(Audiences)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="audience-row"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Bedok · 200m geofence')
  })

  it('shows the error branch when fetch rejects', async () => {
    ;(listAudiences as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('network down')
    )

    const wrapper = mount(Audiences)
    await flushPromises()

    expect(wrapper.find('[data-testid="audiences-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="audiences-list"]').exists()).toBe(false)
  })

  it('shows the empty-state placeholder when the brand has no audiences', async () => {
    ;(listAudiences as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: []
    })

    const wrapper = mount(Audiences)
    await flushPromises()

    expect(wrapper.find('[data-testid="audiences-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No audiences yet')
    expect(wrapper.find('[data-testid="audiences-list"]').exists()).toBe(false)
  })
})
