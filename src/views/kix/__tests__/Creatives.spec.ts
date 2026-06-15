/**
 * Creatives.vue render test — rebuilt view (art-design-pro card gallery,
 * Week 8j). KPI strip + kind filter + search + asset cards. Heavy logic
 * unit-tested in creatives/__tests__/creativesModel.spec.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/creatives', () => ({ listCreatives: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import Creatives from '../Creatives.vue'
import { listCreatives } from '@/api/portal-admin/creatives'

const stubs = {
  ArtSvgIcon: { template: '<i />', props: ['icon'] },
  ElInput: {
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue']
  }
}

const sample = [
  { asset_id: 'a1', filename: 'logo.png', kind: 'image', bytes: 51200 },
  { asset_id: 'a2', filename: 'hero.jpg', bytes: 2097152 },
  { asset_id: 'a3', filename: 'promo.mp4', kind: 'video', bytes: 10485760 }
]
const mockList = listCreatives as unknown as ReturnType<typeof vi.fn>
const mountView = () => mount(Creatives, { global: { stubs } })

describe('Creatives.vue · rebuilt view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders KPI strip with computed totals ({ items } shape)', async () => {
    mockList.mockResolvedValueOnce({ data: { items: sample } })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('portal.creatives.title')
    const k = w.find('[data-testid="creative-kpis"]')
    expect(k.exists()).toBe(true)
    expect(k.text()).toContain('3') // total
    expect(k.text()).toContain('12.0 MB') // total size
  })

  it('renders one card per asset (bare array tolerated)', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const w = mountView()
    await flushPromises()
    expect(w.findAll('[data-testid="creatives-card"]')).toHaveLength(3)
  })

  it('kind filter narrows the grid', async () => {
    mockList.mockResolvedValueOnce({ data: { items: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="creative-video"]').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-testid="creatives-card"]')).toHaveLength(1)
  })

  it('search narrows the grid by filename', async () => {
    mockList.mockResolvedValueOnce({ data: { items: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="creatives-search"]').setValue('promo')
    await flushPromises()
    expect(w.findAll('[data-testid="creatives-card"]')).toHaveLength(1)
  })

  it('shows empty + error states', async () => {
    mockList.mockResolvedValueOnce({ data: { items: [] } })
    const w1 = mountView()
    await flushPromises()
    expect(w1.find('[data-testid="creatives-empty"]').exists()).toBe(true)

    mockList.mockRejectedValueOnce(new Error('boom'))
    const w2 = mountView()
    await flushPromises()
    expect(w2.find('[data-testid="creatives-error"]').exists()).toBe(true)
  })
})
