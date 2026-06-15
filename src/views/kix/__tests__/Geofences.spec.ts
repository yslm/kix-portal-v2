/**
 * Geofences.vue render test — rebuilt view (art-design-pro, Week 8i).
 * KPI strip + geocoded filter + search + ArtTable. Heavy logic unit-tested
 * in geofences/__tests__/geofencesModel.spec.ts; this verifies wiring.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/api/portal-admin/geofences', () => ({ listGeofences: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import Geofences from '../Geofences.vue'
import { listGeofences } from '@/api/portal-admin/geofences'

const ArtTableStub = defineComponent({
  name: 'ArtTable',
  props: ['data', 'columns', 'loading', 'pagination'],
  setup(props) {
    return () =>
      h(
        'div',
        { 'data-testid': 'art-table', 'data-row-count': (props.data ?? []).length },
        (props.data ?? []).map((r: { id: string }) => h('div', { 'data-testid': `row-${r.id}` }))
      )
  }
})
const stubs = {
  ArtTable: ArtTableStub,
  ArtSvgIcon: { template: '<i />', props: ['icon'] },
  StatusBadge: { template: '<span />', props: ['status'] },
  ElInput: {
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue']
  }
}

const sample = [
  { id: 'l1', name: 'Orchard', address: '1 Orchard Rd', radius_m: 100, place_id: 'p1' },
  { id: 'l2', name: 'Bugis', address: '2 Bugis St', radius_m: 200, lat: 1.3, lng: 103.8 },
  { id: 'l3', name: 'Tampines', address: '3 Tampines Ave' }
]
const mockList = listGeofences as unknown as ReturnType<typeof vi.fn>
const mountView = () => mount(Geofences, { global: { stubs } })

describe('Geofences.vue · rebuilt view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders KPI strip with computed totals ({ locations } shape)', async () => {
    mockList.mockResolvedValueOnce({ data: { locations: sample } })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('portal.geofences.title')
    const k = w.find('[data-testid="geofence-kpis"]')
    expect(k.exists()).toBe(true)
    expect(k.text()).toContain('3') // total
    expect(k.text()).toContain('2') // geocoded
    expect(k.text()).toContain('117 m') // avg radius
  })

  it('passes all rows to ArtTable (bare array tolerated)', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('3')
  })

  it('geocoded filter narrows rows', async () => {
    mockList.mockResolvedValueOnce({ data: { locations: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="geo-pending"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('1')
    expect(w.find('[data-testid="row-l3"]').exists()).toBe(true)
  })

  it('search narrows rows', async () => {
    mockList.mockResolvedValueOnce({ data: { locations: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="geofences-search"]').setValue('bugis')
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('1')
    expect(w.find('[data-testid="row-l2"]').exists()).toBe(true)
  })

  it('shows empty + error states', async () => {
    mockList.mockResolvedValueOnce({ data: { locations: [] } })
    const w1 = mountView()
    await flushPromises()
    expect(w1.find('[data-testid="geofences-empty"]').exists()).toBe(true)

    mockList.mockRejectedValueOnce(new Error('boom'))
    const w2 = mountView()
    await flushPromises()
    expect(w2.find('[data-testid="geofences-error"]').exists()).toBe(true)
  })
})
