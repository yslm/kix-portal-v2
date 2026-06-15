/**
 * CreateFlowWizard — the 4-step flow creation. Decision/format logic is in
 * flowWizardModel.spec.ts; this verifies the wiring + step progression:
 * templates → pick (create) → customize (update) → simulate → publish.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/flows', () => ({
  listFlowTemplates: vi.fn(),
  createFlow: vi.fn(),
  updateFlow: vi.fn(),
  simulateFlow: vi.fn(),
  publishFlow: vi.fn()
}))
vi.mock('@/utils/kix/resolveBrandId', () => ({ resolveBrandId: () => '42' }))

import CreateFlowWizard from '../CreateFlowWizard.vue'
import {
  listFlowTemplates,
  createFlow,
  updateFlow,
  simulateFlow,
  publishFlow
} from '@/api/portal-admin/flows'

const mockTpls = listFlowTemplates as unknown as ReturnType<typeof vi.fn>
const mockCreate = createFlow as unknown as ReturnType<typeof vi.fn>
const mockUpdate = updateFlow as unknown as ReturnType<typeof vi.fn>
const mockSim = simulateFlow as unknown as ReturnType<typeof vi.fn>
const mockPublish = publishFlow as unknown as ReturnType<typeof vi.fn>

const stubs = {
  ElDialog: {
    props: ['modelValue'],
    emits: ['open'],
    // real ElDialog fires `open` when v-model becomes true (incl. initial)
    mounted() {
      if (this.modelValue) this.$emit('open')
    },
    template: '<div v-if="modelValue"><slot /></div>'
  },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  ElButton: {
    props: ['loading', 'disabled'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  }
}

function mountWizard() {
  return mount(CreateFlowWizard, { props: { modelValue: true }, global: { stubs } })
}

const TEMPLATE = {
  template_id: 'ramadan_30day',
  name: 'Ramadan 30-day',
  icon: '🌙',
  summary: 'Daily login',
  steps_count: 3,
  default_duration_days: 30
}
const FLOW = {
  flow_id: 'fl_1',
  name: 'Ramadan 30-day',
  start_date: '2026-03-01',
  end_date: '2026-03-30',
  steps: [
    { step_id: 's1', label: 'Login' },
    { step_id: 's2', label: 'Streak' }
  ]
}

describe('CreateFlowWizard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads templates on open (step 1)', async () => {
    mockTpls.mockResolvedValueOnce({ data: { templates: [TEMPLATE] } })
    const w = mountWizard()
    await flushPromises()
    expect(w.find('[data-testid="flow-step-1"]').exists()).toBe(true)
    expect(w.find('[data-testid="flow-template-ramadan_30day"]').exists()).toBe(true)
  })

  it('runs the full create → customize → simulate → publish path', async () => {
    mockTpls.mockResolvedValue({ data: { templates: [TEMPLATE] } })
    mockCreate.mockResolvedValueOnce({ data: FLOW })
    mockUpdate.mockResolvedValueOnce({ data: FLOW })
    mockSim.mockResolvedValueOnce({
      data: {
        projected_reach: 61800,
        final_completers: 16637,
        currency_symbol: 'SAR',
        projected_total_cost: 634000,
        projected_cost_per_completer: 38,
        summary_sentence: '16,637 of 100,000 finish all steps',
        step_funnel: [
          { step_id: 's1', label: 'Login', completers: 55000 },
          { step_id: 's2', label: 'Streak', completers: 30250 }
        ]
      }
    })
    mockPublish.mockResolvedValueOnce({ data: { ...FLOW, status: 'published' } })

    const w = mountWizard()
    await flushPromises()

    // step 1 → pick template
    await w.find('[data-testid="flow-template-ramadan_30day"]').trigger('click')
    await flushPromises()
    expect(mockCreate).toHaveBeenCalledWith('42', { template_id: 'ramadan_30day' })
    expect(w.find('[data-testid="flow-step-2"]').exists()).toBe(true)
    expect(w.find('[data-testid="flow-step-preview"]').exists()).toBe(true)

    // step 2 → simulate
    await w.find('[data-testid="flow-to-simulate"]').trigger('click')
    await flushPromises()
    expect(mockUpdate).toHaveBeenCalled()
    expect(w.find('[data-testid="flow-step-3"]').exists()).toBe(true)

    // step 3 → run sim
    await w.find('[data-testid="flow-run-sim"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="flow-sim-cards"]').exists()).toBe(true)
    expect(w.find('[data-testid="flow-funnel"]').exists()).toBe(true)
    expect(w.text()).toContain('SAR634,000')

    // publish → step 4 + created emitted
    await w.find('[data-testid="flow-publish"]').trigger('click')
    await flushPromises()
    expect(mockPublish).toHaveBeenCalledWith('fl_1', '42')
    expect(w.find('[data-testid="flow-step-4"]').exists()).toBe(true)
    expect(w.emitted('created')).toBeTruthy()
  })

  it('blank start creates a flow with no template_id', async () => {
    mockTpls.mockResolvedValue({ data: { templates: [TEMPLATE] } })
    mockCreate.mockResolvedValueOnce({ data: { ...FLOW, steps: [] } })
    const w = mountWizard()
    await flushPromises()
    await w.find('[data-testid="flow-blank"]').trigger('click')
    await flushPromises()
    expect(mockCreate).toHaveBeenCalledWith('42', {})
    expect(w.find('[data-testid="flow-step-2"]').exists()).toBe(true)
  })
})
