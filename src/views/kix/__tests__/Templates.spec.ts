/**
 * Templates.vue render test — rebuilt view (art-design-pro card gallery,
 * Week 8g). KPI strip + Ready/Catalog filter + search + card grid. Heavy
 * logic unit-tested in templates/__tests__/templatesModel.spec.ts; this
 * verifies wiring + states. Same shape as Games.spec.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/templates', () => ({ listTemplates: vi.fn() }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

import Templates from '../Templates.vue'
import { listTemplates } from '@/api/portal-admin/templates'

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
  { slug: 'scratch-win', name: 'Scratch & Win', reskinable: true },
  { slug: 'spin-wheel', name: 'Spin the Wheel', reskinable: true },
  { slug: 'quiz-master', name: 'Quiz Master' }
]
const mockList = listTemplates as unknown as ReturnType<typeof vi.fn>
const mountView = () => mount(Templates, { global: { stubs } })

describe('Templates.vue · rebuilt view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders KPI strip with computed totals ({ games } shape)', async () => {
    mockList.mockResolvedValueOnce({ data: { games: sample } })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('portal.templates.title')
    const k = w.find('[data-testid="template-kpis"]')
    expect(k.exists()).toBe(true)
    expect(k.text()).toContain('3') // total
    expect(k.text()).toContain('2') // ready
  })

  it('renders one card per template (bare array tolerated)', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const w = mountView()
    await flushPromises()
    expect(w.findAll('[data-testid="template-card"]')).toHaveLength(3)
  })

  it('Ready filter narrows the grid', async () => {
    mockList.mockResolvedValueOnce({ data: { games: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="tpl-ready"]').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-testid="template-card"]')).toHaveLength(2)
  })

  it('search narrows the grid (name or slug)', async () => {
    mockList.mockResolvedValueOnce({ data: { games: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="templates-search"]').setValue('quiz')
    await flushPromises()
    expect(w.findAll('[data-testid="template-card"]')).toHaveLength(1)
  })

  it('card click routes to /builder', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="template-card"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/builder')
  })

  it('shows empty + error states', async () => {
    mockList.mockResolvedValueOnce({ data: { games: [] } })
    const w1 = mountView()
    await flushPromises()
    expect(w1.find('[data-testid="templates-empty"]').exists()).toBe(true)

    mockList.mockRejectedValueOnce(new Error('boom'))
    const w2 = mountView()
    await flushPromises()
    expect(w2.find('[data-testid="templates-error"]').exists()).toBe(true)
  })
})
