/**
 * Cases.vue render test — rebuilt view (art-design-pro card grid, Week 8h).
 * KPI strip + status filter + search + prospect cards. Heavy logic
 * unit-tested in cases/__tests__/casesModel.spec.ts; this verifies wiring.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/cases', () => ({ listCases: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import Cases from '../Cases.vue'
import { listCases } from '@/api/portal-admin/cases'

const stubs = {
  ArtSvgIcon: { template: '<i />', props: ['icon'] },
  StatusBadge: { template: '<span class="badge" />', props: ['status'] },
  ElInput: {
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue']
  }
}

const sample = [
  {
    prospect_id: 'nana',
    company_name: 'Nana',
    tagline: 'Saudi q-commerce',
    research_status: 'complete'
  },
  { prospect_id: 'sbux', company_name: 'Starbucks SG', research_status: 'in_progress' },
  { prospect_id: 'draft_co', company_name: 'Draft Co', research_status: 'draft' }
]
const mockList = listCases as unknown as ReturnType<typeof vi.fn>
const mountView = () => mount(Cases, { global: { stubs } })

describe('Cases.vue · rebuilt view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders KPI strip with computed totals ({ prospects } shape)', async () => {
    mockList.mockResolvedValueOnce({ data: { prospects: sample } })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('portal.cases.title')
    const k = w.find('[data-testid="case-kpis"]')
    expect(k.exists()).toBe(true)
    expect(k.text()).toContain('3') // total
    expect(k.text()).toContain('1') // complete
  })

  it('renders one card per prospect (bare array tolerated)', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const w = mountView()
    await flushPromises()
    expect(w.findAll('[data-testid="case-card"]')).toHaveLength(3)
  })

  it('status filter narrows the grid', async () => {
    mockList.mockResolvedValueOnce({ data: { prospects: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="case-complete"]').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-testid="case-card"]')).toHaveLength(1)
  })

  it('search narrows the grid (name / url / tagline)', async () => {
    mockList.mockResolvedValueOnce({ data: { prospects: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="cases-search"]').setValue('q-commerce')
    await flushPromises()
    expect(w.findAll('[data-testid="case-card"]')).toHaveLength(1)
  })

  it('shows empty + error states', async () => {
    mockList.mockResolvedValueOnce({ data: { prospects: [] } })
    const w1 = mountView()
    await flushPromises()
    expect(w1.find('[data-testid="cases-empty"]').exists()).toBe(true)

    mockList.mockRejectedValueOnce(new Error('boom'))
    const w2 = mountView()
    await flushPromises()
    expect(w2.find('[data-testid="cases-error"]').exists()).toBe(true)
  })
})
