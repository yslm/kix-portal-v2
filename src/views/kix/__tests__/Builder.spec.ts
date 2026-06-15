/**
 * Builder.vue render test — rebuilt view (art-design-pro, Week 8o).
 * Opportunity-score hero card + build-block art-card grid. Heavy logic
 * unit-tested in builder/__tests__/builderModel.spec.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'

vi.mock('@/api/portal-admin/builder', () => ({
  fetchOpportunityScore: vi.fn(),
  defaultEmptyConfig: {}
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import Builder from '../Builder.vue'
import { fetchOpportunityScore } from '@/api/portal-admin/builder'

const ElCardStub = defineComponent({
  name: 'ElCard',
  setup:
    (_, { slots }) =>
    () => [slots.header?.(), slots.default?.()]
})
const stubs = {
  ElCard: ElCardStub,
  ArtSvgIcon: { template: '<i />', props: ['icon'] }
}
const mockScore = fetchOpportunityScore as unknown as ReturnType<typeof vi.fn>
const mountView = () => mount(Builder, { global: { stubs } })

describe('Builder.vue · rebuilt view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the opportunity score + hints + the 6 build blocks', async () => {
    mockScore.mockResolvedValueOnce({
      data: {
        score: 65,
        hints: [
          { points: 20, label: 'Add a voucher' },
          { points: 15, label: 'Set a schedule' }
        ]
      }
    })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="opp-score-val"]').text()).toBe('65')
    expect(w.find('[data-testid="opp-score-hints"]').exists()).toBe(true)
    expect(w.text()).toContain('Add a voucher')
    expect(w.findAll('[data-testid="module-gallery"] button')).toHaveLength(6)
  })

  it('shows the all-good copy when there are no hints', async () => {
    mockScore.mockResolvedValueOnce({ data: { score: 92, hints: [] } })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="opp-score-good"]').exists()).toBe(true)
    expect(w.find('[data-testid="opp-score-hints"]').exists()).toBe(false)
  })

  it('fires the deferred module click', async () => {
    mockScore.mockResolvedValueOnce({ data: { score: 50, hints: [] } })
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="module-game"]').trigger('click')
    expect(alertSpy).toHaveBeenCalledWith('Coming soon: game form')
    alertSpy.mockRestore()
  })

  it('shows the error state', async () => {
    mockScore.mockRejectedValueOnce(new Error('boom'))
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="opp-score-error"]').exists()).toBe(true)
  })
})
