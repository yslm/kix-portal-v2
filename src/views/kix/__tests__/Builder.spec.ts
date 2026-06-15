/**
 * Builder.vue render test — entry hero + 6 module sub-forms + publish.
 * Heavy logic (field specs, collectors, cfg/publish assembly, validation,
 * draft persistence) is unit-tested in builder/__tests__/builderForms.spec.ts;
 * this verifies wiring: score renders, a block opens the editor, a module
 * save re-scores, and Publish validates / configures / posts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'

vi.mock('@/api/portal-admin/builder', () => ({
  fetchOpportunityScore: vi.fn(),
  fetchVoucherTemplates: vi.fn(),
  configureRule: vi.fn(),
  configureSchedule: vi.fn(),
  publishCampaign: vi.fn(),
  defaultEmptyConfig: {}
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/utils/kix/resolveBrandId', () => ({ resolveBrandId: () => '42' }))
const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

import Builder from '../Builder.vue'
import {
  fetchOpportunityScore,
  fetchVoucherTemplates,
  configureRule,
  configureSchedule,
  publishCampaign
} from '@/api/portal-admin/builder'

const ElCardStub = defineComponent({
  name: 'ElCard',
  setup:
    (_, { slots }) =>
    () => [slots.header?.(), slots.default?.()]
})
const stubs = {
  ElCard: ElCardStub,
  ArtSvgIcon: { template: '<i />', props: ['icon'] },
  ElButton: {
    props: ['loading'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>'
  },
  // Stub the editor — expose a button that emits a module save payload.
  ModuleEditor: {
    name: 'ModuleEditor',
    props: ['modelValue', 'moduleId', 'title', 'initial', 'dynamicOptions'],
    emits: ['update:modelValue', 'save', 'field-change'],
    template:
      '<div data-testid="editor-stub" :data-open="modelValue" :data-mod="moduleId" @save-now="$emit(\'save\', { template_id: \'spin_and_win\', x: 1 })" />'
  }
}
const mockScore = fetchOpportunityScore as unknown as ReturnType<typeof vi.fn>
const mockTpls = fetchVoucherTemplates as unknown as ReturnType<typeof vi.fn>
const mockRule = configureRule as unknown as ReturnType<typeof vi.fn>
const mockSched = configureSchedule as unknown as ReturnType<typeof vi.fn>
const mockPublish = publishCampaign as unknown as ReturnType<typeof vi.fn>

function primeOk(score = 50) {
  mockScore.mockResolvedValue({ data: { score, hints: [] } })
  mockTpls.mockResolvedValue({
    data: { templates: [{ id: 'tmpl_5off', label: 'S$5 off', is_default: true }] }
  })
}

const mountView = () => mount(Builder, { global: { stubs } })

describe('Builder.vue · entry hero', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders the score + hints + 6 build blocks', async () => {
    mockScore.mockResolvedValueOnce({
      data: { score: 65, hints: [{ points: 20, label: 'Add a voucher' }] }
    })
    mockTpls.mockResolvedValue({ data: { templates: [] } })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="opp-score-val"]').text()).toBe('65')
    expect(w.text()).toContain('Add a voucher')
    expect(w.findAll('[data-testid="module-gallery"] button')).toHaveLength(6)
  })

  it('shows the error state', async () => {
    mockScore.mockRejectedValueOnce(new Error('boom'))
    mockTpls.mockResolvedValue({ data: { templates: [] } })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="opp-score-error"]').exists()).toBe(true)
  })
})

describe('Builder.vue · module editor + publish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    primeOk()
  })

  it('a build block opens the editor for that module', async () => {
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="editor-stub"]').attributes('data-open')).toBe('false')
    await w.find('[data-testid="module-game"]').trigger('click')
    const stub = w.find('[data-testid="editor-stub"]')
    expect(stub.attributes('data-open')).toBe('true')
    expect(stub.attributes('data-mod')).toBe('game')
  })

  it('saving a module re-scores and marks it configured', async () => {
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="module-game"]').trigger('click') // sets editingModule
    mockScore.mockResolvedValueOnce({ data: { score: 78, hints: [] } })
    w.findComponent({ name: 'ModuleEditor' }).vm.$emit('save', {
      template_id: 'mystery_box',
      difficulty: 'hard',
      session_secs: 60,
      brand_assets: 'auto'
    })
    await flushPromises()
    expect(w.find('[data-testid="opp-score-val"]').text()).toBe('78')
    expect(w.find('[data-testid="module-done-game"]').exists()).toBe(true)
  })

  it('Publish blocks on validation when no voucher template is set', async () => {
    mockTpls.mockResolvedValue({ data: { templates: [] } }) // no default → template_id stays ''
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="builder-publish"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="publish-errors"]').exists()).toBe(true)
    expect(mockPublish).not.toHaveBeenCalled()
  })

  it('Publish configures rule + schedule then posts, and navigates on ok', async () => {
    const w = mountView()
    await flushPromises() // voucher default auto-selected → validation passes
    mockRule.mockResolvedValue({ data: { ok: true } })
    mockSched.mockResolvedValue({ data: { ok: true } })
    mockPublish.mockResolvedValueOnce({ data: { ok: true, campaign: { id: 'camp_123' } } })

    await w.find('[data-testid="builder-publish"]').trigger('click')
    await flushPromises()

    expect(mockRule).toHaveBeenCalled()
    expect(mockSched).toHaveBeenCalled()
    expect(mockPublish).toHaveBeenCalled()
    expect(w.find('[data-testid="publish-result"]').text()).toContain('camp_123')
  })

  it('Publish surfaces the KYC gate on a 403', async () => {
    const w = mountView()
    await flushPromises()
    mockRule.mockResolvedValue({ data: { ok: true } })
    mockSched.mockResolvedValue({ data: { ok: true } })
    mockPublish.mockRejectedValueOnce({
      response: { status: 403, data: { error: 'kyc_required', next: '/add-card' } }
    })
    await w.find('[data-testid="builder-publish"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="publish-result"]').text()).toContain('payment method')
  })
})
