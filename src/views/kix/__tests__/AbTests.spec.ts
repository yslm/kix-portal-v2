/**
 * AbTests.vue render test — rebuilt view. KPI strip + status filter +
 * search + ArtTable. Heavy logic in abtests/__tests__/abTestsModel.spec.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/api/portal-admin/ab-tests', () => ({ listAbTests: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import AbTests from '../AbTests.vue'
import { listAbTests } from '@/api/portal-admin/ab-tests'

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
  { id: 't1', name: 'CTR test', status: 'running', lift_pct: 4.2, p_value: 0.21 },
  { id: 't2', name: 'Copy test', status: 'significant', lift_pct: 12.8, p_value: 0.03 }
]
const mockList = listAbTests as unknown as ReturnType<typeof vi.fn>
const mountView = () => mount(AbTests, { global: { stubs } })

describe('AbTests.vue · rebuilt view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders KPI strip with computed totals (ab_tests wrapper)', async () => {
    mockList.mockResolvedValueOnce({ data: { ab_tests: sample } })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('portal.abtests.title')
    const k = w.find('[data-testid="abtest-kpis"]')
    expect(k.exists()).toBe(true)
    expect(k.text()).toContain('2') // total
  })

  it('passes all rows to ArtTable (bare array tolerated)', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('2')
  })

  it('status filter narrows rows', async () => {
    mockList.mockResolvedValueOnce({ data: { ab_tests: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="abt-running"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('1')
    expect(w.find('[data-testid="row-t1"]').exists()).toBe(true)
  })

  it('shows empty + error states', async () => {
    mockList.mockResolvedValueOnce({ data: { ab_tests: [] } })
    const w1 = mountView()
    await flushPromises()
    expect(w1.find('[data-testid="abtests-empty"]').exists()).toBe(true)

    mockList.mockRejectedValueOnce(new Error('boom'))
    const w2 = mountView()
    await flushPromises()
    expect(w2.find('[data-testid="abtests-error"]').exists()).toBe(true)
  })
})
