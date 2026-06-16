/**
 * CreateAbTestDialog wiring + Rules inline toggle. Real contracts:
 * POST /ab-tests, PATCH /automations/{id}/state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/ab-tests', () => ({ createAbTest: vi.fn() }))
vi.mock('@/api/portal-admin/campaigns', () => ({ listCampaigns: vi.fn() }))

import CreateAbTestDialog from '../abtests/CreateAbTestDialog.vue'
import { createAbTest } from '@/api/portal-admin/ab-tests'
import { listCampaigns } from '@/api/portal-admin/campaigns'

const mCreate = createAbTest as unknown as ReturnType<typeof vi.fn>
const mCampaigns = listCampaigns as unknown as ReturnType<typeof vi.fn>

const stubs = {
  ElDialog: {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
  },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>'
  },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElButton: {
    props: ['loading'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>'
  }
}

describe('CreateAbTestDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mCampaigns.mockResolvedValue({
      data: [
        { id: 'c1', name: 'A' },
        { id: 'c2', name: 'B' }
      ]
    })
  })

  it('loads campaigns + blocks until both variants picked', async () => {
    const w = mount(CreateAbTestDialog, { props: { modelValue: true }, global: { stubs } })
    await flushPromises()
    expect(w.findAll('[data-testid="abt-a"] option')).toHaveLength(2)
    await w.find('[data-testid="abt-name"]').setValue('Spin vs Scratch')
    await w.find('[data-testid="abt-save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="abt-error"]').exists()).toBe(true)
    expect(mCreate).not.toHaveBeenCalled()
  })

  it('rejects identical A/B', async () => {
    const w = mount(CreateAbTestDialog, { props: { modelValue: true }, global: { stubs } })
    await flushPromises()
    await w.find('[data-testid="abt-name"]').setValue('T')
    await w.find('[data-testid="abt-a"]').setValue('c1')
    await w.find('[data-testid="abt-b"]').setValue('c1')
    await w.find('[data-testid="abt-save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="abt-error"]').text()).toContain('different')
    expect(mCreate).not.toHaveBeenCalled()
  })

  it('POSTs a valid test', async () => {
    mCreate.mockResolvedValueOnce({ data: { ok: true, ab_test_id: 'abt_1' } })
    const w = mount(CreateAbTestDialog, { props: { modelValue: true }, global: { stubs } })
    await flushPromises()
    await w.find('[data-testid="abt-name"]').setValue('Spin vs Scratch')
    await w.find('[data-testid="abt-a"]').setValue('c1')
    await w.find('[data-testid="abt-b"]').setValue('c2')
    await w.find('[data-testid="abt-save"]').trigger('click')
    await flushPromises()
    expect(mCreate).toHaveBeenCalledWith({
      name: 'Spin vs Scratch',
      campaign_a_id: 'c1',
      campaign_b_id: 'c2',
      metric: 'CTR'
    })
    expect(w.emitted('created')).toBeTruthy()
  })
})

// --- Rules inline toggle -------------------------------------------------
vi.mock('@/api/portal-admin/rules', () => ({ listRules: vi.fn(), setRuleState: vi.fn() }))

import Rules from '../Rules.vue'
import { listRules, setRuleState } from '@/api/portal-admin/rules'
import { defineComponent, h } from 'vue'

const mList = listRules as unknown as ReturnType<typeof vi.fn>
const mSetState = setRuleState as unknown as ReturnType<typeof vi.fn>

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

// ArtTable stub that actually invokes the state-column formatter so the
// ElSwitch renders and we can drive its update.
const ArtTableStub = defineComponent({
  name: 'ArtTable',
  props: ['data', 'columns'],
  setup(props) {
    return () =>
      h(
        'div',
        { 'data-testid': 'art-table' },
        (props.data ?? []).map((row: Record<string, unknown>) => {
          const stateCol = (props.columns ?? []).find((c: { prop: string }) => c.prop === 'state')
          return h('div', { 'data-testid': `row-${row.id}` }, [stateCol?.formatter?.(row)])
        })
      )
  }
})

describe('Rules · inline toggle', () => {
  beforeEach(() => vi.clearAllMocks())

  it('PATCHes state when the row switch flips', async () => {
    mList.mockResolvedValueOnce({
      data: { rules: [{ id: 'r1', name: 'Pause overspend', state: 'on' }] }
    })
    mSetState.mockResolvedValueOnce({ data: { automation: { state: 'off' } } })
    const w = mount(Rules, {
      global: {
        // NOTE: ElSwitch is NOT stubbed — Rules renders it via h(ElSwitch)
        // (direct import), which global.stubs cannot intercept. We drive the
        // real switch by clicking its root `.el-switch`.
        stubs: {
          ArtTable: ArtTableStub,
          ArtSvgIcon: { template: '<i />' },
          ElCard: { template: '<div><slot /></div>' },
          ElInput: { props: ['modelValue'], template: '<input />' },
          ElButton: { template: '<button><slot /></button>' },
          StatusBadge: { props: ['status'], template: '<span>{{ status }}</span>' }
        }
      }
    })
    await flushPromises()
    await w.find('.el-switch').trigger('click')
    await flushPromises()
    expect(mSetState).toHaveBeenCalledWith('r1', 'off')
  })
})
