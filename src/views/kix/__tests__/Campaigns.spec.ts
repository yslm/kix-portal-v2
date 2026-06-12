/**
 * Campaigns.vue render test — rebuilt view (art-design-pro look).
 *
 * The view now has three regions:
 *   1. KPI summary strip (card-list anatomy) — Total / Active / Spend /
 *      New customers, computed from the loaded list.
 *   2. Filter toolbar — status segmented buttons + name search + a
 *      "Create campaign" CTA routing to /builder.
 *   3. ArtTable — the campaign rows (real backend fields preferred).
 *
 * The heavy logic (KPI maths, filtering, field reconciliation) is unit
 * tested in campaigns/__tests__/campaignsModel.spec.ts. This component
 * test only verifies wiring: data flows into the (stubbed) ArtTable, the
 * KPI strip shows computed values, the status filter / search narrow the
 * rows, the CTA navigates, and loading/error/empty render.
 *
 * ArtTable / ArtSvgIcon / ElInput / ElButton are auto-imported globals in
 * the app, so they're stubbed here. The ArtTable stub renders each row's
 * name so we can assert which rows reach the table.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/api/portal-admin/campaigns', () => ({
  listCampaigns: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push })
}))

import Campaigns from '../Campaigns.vue'
import { listCampaigns } from '@/api/portal-admin/campaigns'

const ArtTableStub = defineComponent({
  name: 'ArtTable',
  props: ['data', 'columns', 'loading', 'pagination'],
  setup(props) {
    return () =>
      h(
        'div',
        { 'data-testid': 'art-table', 'data-row-count': (props.data ?? []).length },
        (props.data ?? []).map((r: { id: string; name: string }) =>
          h('div', { class: 'stub-row', 'data-testid': `row-${r.id}` }, r.name)
        )
      )
  }
})

const stubs = {
  ArtTable: ArtTableStub,
  ArtTableHeader: { template: '<div><slot name="left" /><slot name="right" /></div>' },
  ArtSvgIcon: { template: '<i />', props: ['icon'] },
  StatusBadge: { template: '<span>{{ status }}</span>', props: ['status'] },
  ElInput: {
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue']
  },
  ElButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' }
}

const sample = [
  {
    id: 'c1',
    name: 'Lunch spin',
    status: 'live',
    objective: 'NEW',
    spend_sgd: 378,
    impressions: 7420,
    plays: 2103,
    new_customers: 87,
    cpa_sgd: 4.2,
    ctr_pct: 28.3
  },
  {
    id: 'c2',
    name: 'Scratch & win',
    status: 'paused',
    objective: 'REPEAT',
    spend_sgd: 214,
    impressions: 4180,
    plays: 1142,
    new_customers: 42,
    cpa_sgd: 5.1,
    ctr_pct: 27.3
  }
]

const mockList = listCampaigns as unknown as ReturnType<typeof vi.fn>

function mountView() {
  return mount(Campaigns, { global: { stubs } })
}

describe('Campaigns.vue · rebuilt view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders header + KPI strip with computed totals after a successful load', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('portal.campaigns.title')

    const kpis = wrapper.find('[data-testid="campaign-kpis"]')
    expect(kpis.exists()).toBe(true)
    const kt = kpis.text()
    expect(kt).toContain('2') // total
    expect(kt).toContain('1') // active (only "live")
    expect(kt).toContain('S$592') // total spend 378+214
    expect(kt).toContain('129') // new customers 87+42
  })

  it('passes all rows to ArtTable by default', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('2')
    expect(wrapper.find('[data-testid="row-c1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="row-c2"]').exists()).toBe(true)
  })

  it('status filter narrows the rows passed to ArtTable', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('[data-testid="filter-active"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('1')
    expect(wrapper.find('[data-testid="row-c1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="row-c2"]').exists()).toBe(false)
  })

  it('name search narrows the rows', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('[data-testid="campaigns-search"]').setValue('scratch')
    await flushPromises()

    expect(wrapper.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('1')
    expect(wrapper.find('[data-testid="row-c2"]').exists()).toBe(true)
  })

  it('"Create campaign" CTA routes to /builder', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('[data-testid="create-campaign"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/builder')
  })

  it('shows the error state when the fetch rejects', async () => {
    mockList.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('[data-testid="campaigns-error"]').exists()).toBe(true)
  })

  it('shows the empty state when the list is empty', async () => {
    mockList.mockResolvedValueOnce({ data: [] })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('[data-testid="campaigns-empty"]').exists()).toBe(true)
  })
})
