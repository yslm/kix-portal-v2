/**
 * CustomerList.vue render test — rebuilt view (art-design-pro look).
 *
 * Three regions: KPI strip (Total / Regulars / Plays / Redeems), a
 * segment + search toolbar, and an ArtTable of customer rows. Heavy
 * logic (KPIs, segment derivation, filtering) is unit tested in
 * customers/__tests__/customersModel.spec.ts; this verifies wiring only.
 *
 * ArtTable / ArtSvgIcon / ElInput are auto-imported globals → stubbed.
 * The ArtTable stub renders each row's handle so we can assert which
 * rows reach the table after filtering.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/api/portal-admin/customers', () => ({
  listCustomers: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import CustomerList from '../CustomerList.vue'
import { listCustomers } from '@/api/portal-admin/customers'

const ArtTableStub = defineComponent({
  name: 'ArtTable',
  props: ['data', 'columns', 'loading', 'pagination'],
  setup(props) {
    return () =>
      h(
        'div',
        { 'data-testid': 'art-table', 'data-row-count': (props.data ?? []).length },
        (props.data ?? []).map((r: { handle: string }) =>
          h('div', { 'data-testid': `row-${r.handle}` }, r.handle)
        )
      )
  }
})

const stubs = {
  ArtTable: ArtTableStub,
  ArtSvgIcon: { template: '<i />', props: ['icon'] },
  ElInput: {
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue']
  }
}

const sample = [
  { handle: 'aisha_t', name: 'Aisha Tan', channel: 'phone', plays: 8, redeems: 2 }, // regular
  { handle: 'bobby88', channel: 'email', plays: 3, redeems: 0 }, // returning
  { handle: 'cara', channel: 'qr', plays: 1, redeems: 0 } // new
]

const mockList = listCustomers as unknown as ReturnType<typeof vi.fn>

function mountView() {
  return mount(CustomerList, { global: { stubs } })
}

describe('CustomerList.vue · rebuilt view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders header + KPI strip with computed totals ({ customers } shape)', async () => {
    mockList.mockResolvedValueOnce({ data: { customers: sample } })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('portal.customers.title')
    const k = wrapper.find('[data-testid="customer-kpis"]')
    expect(k.exists()).toBe(true)
    const kt = k.text()
    expect(kt).toContain('3') // total
    expect(kt).toContain('12') // total plays 8+3+1
    expect(kt).toContain('2') // total redeems / regulars(1)
  })

  it('passes all rows to ArtTable by default (bare array tolerated)', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('3')
  })

  it('segment filter narrows the rows', async () => {
    mockList.mockResolvedValueOnce({ data: { customers: sample } })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('[data-testid="seg-regular"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('1')
    expect(wrapper.find('[data-testid="row-aisha_t"]').exists()).toBe(true)
  })

  it('name/handle search narrows the rows', async () => {
    mockList.mockResolvedValueOnce({ data: { customers: sample } })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('[data-testid="customers-search"]').setValue('bob')
    await flushPromises()
    expect(wrapper.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('1')
    expect(wrapper.find('[data-testid="row-bobby88"]').exists()).toBe(true)
  })

  it('shows the empty state when there are no customers', async () => {
    mockList.mockResolvedValueOnce({ data: { customers: [] } })
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('[data-testid="customers-empty"]').exists()).toBe(true)
  })

  it('shows the error state when the fetch rejects', async () => {
    mockList.mockRejectedValueOnce(new Error('network down'))
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.find('[data-testid="customers-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('network down')
  })
})
