/**
 * Rewards tab sub-components — wiring tests. Pure logic is covered in
 * rewardsTabsModel.spec.ts; these verify each tab loads/saves the right
 * endpoint and renders state.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/rewards', () => ({
  fetchGameLinks: vi.fn(),
  saveGameBinding: vi.fn(),
  fetchIssuanceSummary: vi.fn(),
  lookupVoucher: vi.fn(),
  redeemVoucher: vi.fn(),
  createRewardTemplate: vi.fn()
}))
vi.mock('@/utils/kix/resolveBrandId', () => ({ resolveBrandId: () => '42' }))

import GameLinksTab from '../GameLinksTab.vue'
import IssuanceTab from '../IssuanceTab.vue'
import RedemptionTab from '../RedemptionTab.vue'
import NewTemplateDialog from '../NewTemplateDialog.vue'
import {
  fetchGameLinks,
  saveGameBinding,
  fetchIssuanceSummary,
  lookupVoucher,
  redeemVoucher,
  createRewardTemplate
} from '@/api/portal-admin/rewards'

const mGameLinks = fetchGameLinks as unknown as ReturnType<typeof vi.fn>
const mSaveBind = saveGameBinding as unknown as ReturnType<typeof vi.fn>
const mIssuance = fetchIssuanceSummary as unknown as ReturnType<typeof vi.fn>
const mLookup = lookupVoucher as unknown as ReturnType<typeof vi.fn>
const mRedeem = redeemVoucher as unknown as ReturnType<typeof vi.fn>
const mCreate = createRewardTemplate as unknown as ReturnType<typeof vi.fn>

const selectStub = {
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:
    '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>'
}
const stubs = {
  ElSelect: selectStub,
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
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
  },
  ElDialog: {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
  },
  StatusBadge: { props: ['status'], template: '<span>{{ status }}</span>' }
}

beforeEach(() => vi.clearAllMocks())

describe('GameLinksTab', () => {
  it('loads links and saves a binding', async () => {
    mGameLinks.mockResolvedValueOnce({
      data: { games: [{ game_id: 7, name: 'Spin', game_slug: 'spin', distribution_rule: 'none' }] }
    })
    mSaveBind.mockResolvedValueOnce({ data: { ok: true } })
    const w = mount(GameLinksTab, {
      props: { templates: [{ prize_id: '3', name: 'S$5 off' }] },
      global: { stubs }
    })
    await flushPromises()
    expect(w.findAll('[data-testid="game-link-row"]')).toHaveLength(1)
    await w.find('[data-testid="gl-save-7"]').trigger('click')
    await flushPromises()
    expect(mSaveBind).toHaveBeenCalledWith(
      7,
      '42',
      expect.objectContaining({ distribution_rule: 'none' })
    )
  })
})

describe('IssuanceTab', () => {
  it('renders a row per template', async () => {
    mIssuance.mockResolvedValueOnce({
      data: { summary: [{ template_name: 'Free drink', issued: 120, claimed: 80, redeemed: 42 }] }
    })
    const w = mount(IssuanceTab, { global: { stubs } })
    await flushPromises()
    expect(w.findAll('[data-testid="issuance-row"]')).toHaveLength(1)
    expect(w.text()).toContain('Free drink')
    expect(w.text()).toContain('42')
  })
})

describe('RedemptionTab', () => {
  it('looks up then redeems an active voucher', async () => {
    mLookup.mockResolvedValueOnce({
      data: { voucher_id: 'v1', code: 'ABC', status: 'active', title: 'Free drink' }
    })
    mRedeem.mockResolvedValueOnce({ data: { ok: true } })
    const w = mount(RedemptionTab, { global: { stubs } })
    await w.find('[data-testid="redeem-code"]').setValue('ABC')
    await w.find('[data-testid="redeem-lookup"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="voucher-card"]').exists()).toBe(true)
    await w.find('[data-testid="redeem-now"]').trigger('click')
    await flushPromises()
    expect(mRedeem).toHaveBeenCalledWith({ code: 'ABC', voucher_id: 'v1' })
    expect(w.find('[data-testid="redeem-result"]').text()).toContain('Redeemed')
  })

  it('disables redeem for a non-active voucher', async () => {
    mLookup.mockResolvedValueOnce({ data: { voucher_id: 'v2', code: 'OLD', status: 'redeemed' } })
    const w = mount(RedemptionTab, { global: { stubs } })
    await w.find('[data-testid="redeem-code"]').setValue('OLD')
    await w.find('[data-testid="redeem-lookup"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="redeem-now"]').attributes('disabled')).toBeDefined()
  })
})

describe('NewTemplateDialog', () => {
  it('blocks on validation and submits a valid template', async () => {
    const w = mount(NewTemplateDialog, { props: { modelValue: true }, global: { stubs } })
    // empty name → validation error, no API call
    await w.find('[data-testid="tpl-submit"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="tpl-errors"]').exists()).toBe(true)
    expect(mCreate).not.toHaveBeenCalled()

    // fill name → submits
    mCreate.mockResolvedValueOnce({ data: { ok: true } })
    await w.find('[data-testid="tpl-name"]').setValue('Free coffee')
    await w.find('[data-testid="tpl-submit"]').trigger('click')
    await flushPromises()
    expect(mCreate).toHaveBeenCalled()
    expect(w.emitted('created')).toBeTruthy()
  })
})
