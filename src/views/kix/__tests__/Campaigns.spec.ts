/**
 * Campaigns.vue render test — exercises the four state branches of the
 * campaigns list view: loaded (bare-array response), error, and empty.
 * Wrapper-object response is also covered to lock the legacy "Marathon
 * fix" shape-tolerance (portal.html line 5329-5332).
 *
 * Uses bare `t(key) => key` stub instead of the full vue-i18n setup; the
 * actual translation pipeline is covered by `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/campaigns', () => ({
  listCampaigns: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Campaigns from '../Campaigns.vue'
import { listCampaigns } from '@/api/portal-admin/campaigns'

const sampleCampaigns = [
  {
    id: 'c-001',
    name: 'Spin-to-Win Launch',
    status: 'active',
    objective: 'Awareness',
    budget_sgd: 1200,
    spend_sgd: 345.5,
    impressions: 12450,
    conversions: 87
  },
  {
    id: 'c-002',
    name: 'Scratch Card Friday',
    status: 'paused',
    objective: 'Acquisition',
    budget_str: 'S$800',
    spend_str: 'S$0',
    impressions: 0,
    conversions: 0
  }
]

describe('Campaigns.vue · list view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header and the campaigns table after a successful fetch (bare array)', async () => {
    ;(listCampaigns as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleCampaigns
    })

    const wrapper = mount(Campaigns)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.campaigns.title')
    expect(wrapper.text()).toContain('portal.campaigns.subtitle')

    expect(wrapper.find('[data-testid="campaigns-table-card"]').exists()).toBe(true)
    const rows = wrapper.findAll('[data-testid="campaign-row"]')
    expect(rows).toHaveLength(2)

    // first row: raw numeric budget/spend → fmtSgd formatted
    expect(rows[0].text()).toContain('Spin-to-Win Launch')
    expect(rows[0].text()).toContain('active')
    expect(rows[0].text()).toContain('Awareness')
    expect(rows[0].text()).toContain('S$1,200')
    expect(rows[0].text()).toContain('S$345.5')
    expect(rows[0].text()).toContain('12450')
    expect(rows[0].text()).toContain('87')

    // second row: backend-formatted *_str fallthrough
    expect(rows[1].text()).toContain('Scratch Card Friday')
    expect(rows[1].text()).toContain('paused')
    expect(rows[1].text()).toContain('S$800')
  })

  it('normalises the legacy `{ campaigns: [...] }` wrapper response', async () => {
    ;(listCampaigns as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { campaigns: sampleCampaigns }
    })

    const wrapper = mount(Campaigns)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="campaign-row"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Spin-to-Win Launch')
  })

  it('shows the error branch when fetch rejects', async () => {
    ;(listCampaigns as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('network down')
    )

    const wrapper = mount(Campaigns)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="campaigns-table-card"]').exists()).toBe(false)
  })

  it('shows the empty branch when the list is empty', async () => {
    ;(listCampaigns as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: []
    })

    const wrapper = mount(Campaigns)
    await flushPromises()

    expect(wrapper.text()).toContain('No campaigns yet.')
    expect(wrapper.find('[data-testid="campaigns-table-card"]').exists()).toBe(false)
  })
})
