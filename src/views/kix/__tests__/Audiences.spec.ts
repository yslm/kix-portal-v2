/**
 * Audiences.vue render test — rebuilt view (art-design-pro look).
 * KPI strip + type filter + search + ArtTable. Heavy logic unit-tested
 * in audiences/__tests__/audiencesModel.spec.ts; this verifies wiring.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/api/portal-admin/audiences', () => ({ listAudiences: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import Audiences from '../Audiences.vue'
import { listAudiences } from '@/api/portal-admin/audiences'

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
  ElInput: {
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue']
  }
}

const sample = [
  { id: 'a1', name: 'Lunch crowd', type: 'geofence', size_estimate: 1200, geofence_m: 200 },
  { id: 'a2', name: 'Loyalty VIPs', type: 'retargeting', size_estimate: 340 }
]
const mockList = listAudiences as unknown as ReturnType<typeof vi.fn>
const mountView = () => mount(Audiences, { global: { stubs } })

describe('Audiences.vue · rebuilt view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders KPI strip with computed totals ({ audiences } shape)', async () => {
    mockList.mockResolvedValueOnce({ data: { audiences: sample } })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('portal.audiences.title')
    const k = w.find('[data-testid="audience-kpis"]')
    expect(k.exists()).toBe(true)
    expect(k.text()).toContain('2') // total
    expect(k.text()).toContain('1,540') // total reach 1200+340
  })

  it('passes all rows to ArtTable (bare array tolerated)', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('2')
  })

  it('type filter narrows rows', async () => {
    mockList.mockResolvedValueOnce({ data: { audiences: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="aud-geofence"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('1')
    expect(w.find('[data-testid="row-a1"]').exists()).toBe(true)
  })

  it('search narrows rows', async () => {
    mockList.mockResolvedValueOnce({ data: { audiences: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="audiences-search"]').setValue('vip')
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('1')
    expect(w.find('[data-testid="row-a2"]').exists()).toBe(true)
  })

  it('shows empty + error states', async () => {
    mockList.mockResolvedValueOnce({ data: { audiences: [] } })
    const w1 = mountView()
    await flushPromises()
    expect(w1.find('[data-testid="audiences-empty"]').exists()).toBe(true)

    mockList.mockRejectedValueOnce(new Error('boom'))
    const w2 = mountView()
    await flushPromises()
    expect(w2.find('[data-testid="audiences-error"]').exists()).toBe(true)
  })
})
