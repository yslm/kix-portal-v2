/**
 * Flows.vue render test — exercises the four state branches of the
 * My Flows list: loaded (legacy `{ flows }` wrapper), bare array,
 * error, and empty (hero placeholder).
 *
 * Same fixture/stubbing shape as Games.spec.ts — `t(key) => key` stub,
 * `resolveBrandId` stubbed to a constant. The actual translation
 * pipeline is covered by `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/flows', () => ({
  listFlows: vi.fn()
}))

vi.mock('@/utils/kix/resolveBrandId', () => ({
  resolveBrandId: () => 'demo_brand'
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Flows from '../Flows.vue'
import { listFlows } from '@/api/portal-admin/flows'

const sampleFlows = [
  {
    flow_id: 'f-001',
    name: 'Ramadan 2026',
    status: 'active',
    start_date: '2026-03-01',
    end_date: '2026-03-30',
    steps_count: 5,
    template_id: 'ramadan_30d'
  },
  {
    flow_id: 'f-002',
    name: 'Family Referral',
    status: 'draft',
    start_date: '2026-04-15',
    end_date: '2026-04-30',
    steps_count: 3
    // No template_id → should fall back to literal "custom".
  }
]

describe('Flows.vue · my-flows list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header and the flows list after a successful fetch (legacy `{ flows }` shape)', async () => {
    ;(listFlows as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { flows: sampleFlows }
    })

    const wrapper = mount(Flows)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.flows.title')
    expect(wrapper.text()).toContain('portal.flows.subtitle')

    expect(wrapper.find('[data-testid="flows-list"]').exists()).toBe(true)
    const rows = wrapper.findAll('[data-testid="flow-row"]')
    expect(rows).toHaveLength(2)

    // Row 1: explicit template_id printed verbatim
    expect(rows[0].text()).toContain('Ramadan 2026')
    expect(rows[0].text()).toContain('ramadan_30d')
    expect(rows[0].text()).toContain('active')
    expect(rows[0].text()).toContain('2026-03-01')
    expect(rows[0].text()).toContain('2026-03-30')
    expect(rows[0].text()).toContain('5')

    // Row 2: missing template_id → 'custom' fallback (legacy behaviour)
    expect(rows[1].text()).toContain('Family Referral')
    expect(rows[1].text()).toContain('custom')
    expect(rows[1].text()).toContain('draft')

    // Empty hero is not shown when there are flows.
    expect(wrapper.find('[data-testid="flows-empty-hero"]').exists()).toBe(false)
  })

  it('normalises a bare-array response', async () => {
    ;(listFlows as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleFlows
    })

    const wrapper = mount(Flows)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="flow-row"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Ramadan 2026')
  })

  it('shows the error branch when fetch rejects', async () => {
    ;(listFlows as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('network down')
    )

    const wrapper = mount(Flows)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="flows-list"]').exists()).toBe(false)
  })

  it('shows the empty-state hero placeholder when the brand has no flows', async () => {
    ;(listFlows as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { flows: [] }
    })

    const wrapper = mount(Flows)
    await flushPromises()

    expect(wrapper.find('[data-testid="flows-empty-hero"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No flows yet')
    expect(wrapper.find('[data-testid="flows-list"]').exists()).toBe(false)
  })
})
