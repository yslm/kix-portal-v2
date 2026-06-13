/**
 * Rules.vue render test — rebuilt view. KPI strip + state filter +
 * search + ArtTable. Heavy logic in rules/__tests__/rulesModel.spec.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/api/portal-admin/rules', () => ({ listRules: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import Rules from '../Rules.vue'
import { listRules } from '@/api/portal-admin/rules'

const ArtTableStub = defineComponent({
  name: 'ArtTable',
  props: ['data', 'columns', 'loading', 'pagination'],
  setup(props) {
    return () =>
      h(
        'div',
        { 'data-testid': 'art-table', 'data-row-count': (props.data ?? []).length },
        (props.data ?? []).map((r: { id: string; name: string }) =>
          h('div', { 'data-testid': `row-${r.id}` }, r.name)
        )
      )
  }
})
const stubs = {
  ArtTable: ArtTableStub,
  ArtSvgIcon: { template: '<i />', props: ['icon'] },
  StatusBadge: { template: '<span>{{ status }}</span>', props: ['status'] },
  ElInput: {
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue']
  }
}

const sample = [
  {
    id: 'r1',
    name: 'Pause overspend',
    state: 'on',
    condition: 'spend>100',
    action: 'pause',
    scope: 'All'
  },
  {
    id: 'r3',
    name: 'Low balance',
    state: 'notify_only',
    condition: 'runway<7',
    action: 'notify',
    scope: 'Wallet'
  }
]
const mockList = listRules as unknown as ReturnType<typeof vi.fn>
const mountView = () => mount(Rules, { global: { stubs } })

describe('Rules.vue · rebuilt view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders KPI strip with computed totals (rules wrapper)', async () => {
    mockList.mockResolvedValueOnce({ data: { rules: sample } })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('portal.rules.title')
    const k = w.find('[data-testid="rule-kpis"]')
    expect(k.exists()).toBe(true)
    expect(k.text()).toContain('2') // total
  })

  it('passes all rows to ArtTable (bare array tolerated)', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('2')
  })

  it('state filter narrows rows', async () => {
    mockList.mockResolvedValueOnce({ data: { rules: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="rule-on"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('1')
    expect(w.find('[data-testid="row-r1"]').exists()).toBe(true)
  })

  it('shows empty + error states', async () => {
    mockList.mockResolvedValueOnce({ data: { rules: [] } })
    const w1 = mountView()
    await flushPromises()
    expect(w1.find('[data-testid="rules-empty"]').exists()).toBe(true)

    mockList.mockRejectedValueOnce(new Error('boom'))
    const w2 = mountView()
    await flushPromises()
    expect(w2.find('[data-testid="rules-error"]').exists()).toBe(true)
  })
})
