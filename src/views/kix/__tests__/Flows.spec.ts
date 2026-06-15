/**
 * Flows.vue render test — rebuilt view (art-design-pro look, Week 8f).
 * KPI strip + status filter + search + ArtTable. Heavy logic unit-tested
 * in flows/__tests__/flowsModel.spec.ts; this verifies wiring + states.
 *
 * Same fixture/stubbing shape as Audiences.spec.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/api/portal-admin/flows', () => ({
  listFlows: vi.fn(),
  listFlowTemplates: vi.fn(),
  createFlow: vi.fn(),
  updateFlow: vi.fn(),
  simulateFlow: vi.fn(),
  publishFlow: vi.fn()
}))
vi.mock('@/utils/kix/resolveBrandId', () => ({ resolveBrandId: () => 'demo_brand' }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import Flows from '../Flows.vue'
import { listFlows } from '@/api/portal-admin/flows'

const ArtTableStub = defineComponent({
  name: 'ArtTable',
  props: ['data', 'columns', 'loading', 'pagination'],
  setup(props) {
    return () =>
      h(
        'div',
        { 'data-testid': 'art-table', 'data-row-count': (props.data ?? []).length },
        (props.data ?? []).map((r: { flow_id: string; name?: string }) =>
          h('div', { 'data-testid': `row-${r.flow_id}` }, r.name ?? '')
        )
      )
  }
})
const stubs = {
  ArtTable: ArtTableStub,
  ArtSvgIcon: { template: '<i />', props: ['icon'] },
  StatusBadge: { template: '<span />', props: ['status'] },
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
  ElInput: {
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue']
  },
  CreateFlowWizard: {
    props: ['modelValue'],
    template: '<div data-testid="flow-wizard-stub" :data-open="modelValue" />'
  }
}

const sample = [
  {
    flow_id: 'f1',
    name: 'Ramadan 2026',
    status: 'active',
    start_date: '2026-03-01',
    end_date: '2026-03-30',
    steps_count: 5,
    template_id: 'ramadan_30d'
  },
  { flow_id: 'f2', name: 'Welcome series', status: 'active', steps_count: 3 },
  { flow_id: 'f3', name: 'Win-back lapsed', status: 'paused', steps_count: 4 }
]
const mockList = listFlows as unknown as ReturnType<typeof vi.fn>
const mountView = () => mount(Flows, { global: { stubs } })

describe('Flows.vue · rebuilt view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders KPI strip with computed totals ({ flows } shape)', async () => {
    mockList.mockResolvedValueOnce({ data: { flows: sample } })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('portal.flows.title')
    const k = w.find('[data-testid="flow-kpis"]')
    expect(k.exists()).toBe(true)
    expect(k.text()).toContain('3') // total
    expect(k.text()).toContain('12') // total steps 5+3+4
  })

  it('passes all rows to ArtTable (bare array tolerated)', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('3')
  })

  it('status filter narrows rows', async () => {
    mockList.mockResolvedValueOnce({ data: { flows: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="flow-paused"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('1')
    expect(w.find('[data-testid="row-f3"]').exists()).toBe(true)
  })

  it('search narrows rows', async () => {
    mockList.mockResolvedValueOnce({ data: { flows: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="flows-search"]').setValue('win')
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('1')
    expect(w.find('[data-testid="row-f3"]').exists()).toBe(true)
  })

  it('+ Create flow opens the creation wizard', async () => {
    mockList.mockResolvedValueOnce({ data: { flows: sample } })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="flow-wizard-stub"]').attributes('data-open')).toBe('false')
    await w.find('[data-testid="flows-create"]').trigger('click')
    expect(w.find('[data-testid="flow-wizard-stub"]').attributes('data-open')).toBe('true')
  })

  it('shows empty + error states', async () => {
    mockList.mockResolvedValueOnce({ data: { flows: [] } })
    const w1 = mountView()
    await flushPromises()
    expect(w1.find('[data-testid="flows-empty"]').exists()).toBe(true)

    mockList.mockRejectedValueOnce(new Error('boom'))
    const w2 = mountView()
    await flushPromises()
    expect(w2.find('[data-testid="flows-error"]').exists()).toBe(true)
  })
})
