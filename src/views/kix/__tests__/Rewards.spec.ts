/**
 * Rewards.vue render test — rebuilt view (art-design-pro, Week 8m).
 * KPI strip + ElTabs + Templates card gallery + type filter. Heavy logic
 * unit-tested in rewards/__tests__/rewardsModel.spec.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'

vi.mock('@/api/portal-admin/rewards', () => ({
  listRewardTemplates: vi.fn(),
  deleteRewardTemplate: vi.fn()
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import Rewards from '../Rewards.vue'
import { listRewardTemplates } from '@/api/portal-admin/rewards'

const SlotStub = (name: string) =>
  defineComponent({
    name,
    setup:
      (_, { slots }) =>
      () =>
        slots.default?.()
  })
const stubs = {
  ElCard: SlotStub('ElCard'),
  ElTabs: SlotStub('ElTabs'),
  ElTabPane: SlotStub('ElTabPane'),
  ArtSvgIcon: { template: '<i />', props: ['icon'] },
  StatusBadge: { template: '<span />', props: ['status'] },
  ElButton: { emits: ['click'], template: '<button @click="$emit(\'click\')"><slot /></button>' },
  ElInput: {
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue']
  },
  GameLinksTab: { props: ['templates'], template: '<div data-testid="game-links-tab" />' },
  IssuanceTab: { template: '<div data-testid="issuance-tab" />' },
  RedemptionTab: { template: '<div data-testid="redemption-tab" />' },
  NewTemplateDialog: {
    props: ['modelValue'],
    template: '<div data-testid="new-template-stub" :data-open="modelValue" />'
  }
}

const sample = [
  {
    prize_id: 'p1',
    name: '10% off',
    type: 'voucher',
    original_price_cents: 0,
    status: 'active',
    inventory_count: 100
  },
  {
    prize_id: 'p2',
    name: 'Free tote',
    type: 'prize',
    original_price_cents: 1500,
    status: 'active'
  },
  {
    prize_id: 'p3',
    name: 'S$5 cashback',
    type: 'cashback',
    original_price_cents: 500,
    status: 'inactive'
  }
]
const mockList = listRewardTemplates as unknown as ReturnType<typeof vi.fn>
const mountView = () => mount(Rewards, { global: { stubs } })

describe('Rewards.vue · rebuilt view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders KPI strip + a card per template ({ prizes } shape)', async () => {
    mockList.mockResolvedValueOnce({ data: { prizes: sample } })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('portal.rewards.title')
    const k = w.find('[data-testid="rewards-kpis"]')
    expect(k.text()).toContain('3') // total
    expect(k.text()).toContain('S$20') // catalog value (0+1500+500)/100
    expect(w.findAll('[data-testid="rewards-template-card"]')).toHaveLength(3)
  })

  it('type filter narrows the grid', async () => {
    mockList.mockResolvedValueOnce({ data: { prizes: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="reward-voucher"]').trigger('click')
    await flushPromises()
    expect(w.findAll('[data-testid="rewards-template-card"]')).toHaveLength(1)
  })

  it('search narrows the grid by name', async () => {
    mockList.mockResolvedValueOnce({ data: { prizes: sample } })
    const w = mountView()
    await flushPromises()
    await w.find('[data-testid="rewards-search"]').setValue('tote')
    await flushPromises()
    expect(w.findAll('[data-testid="rewards-template-card"]')).toHaveLength(1)
  })

  it('+ New template opens the create dialog', async () => {
    mockList.mockResolvedValueOnce({ data: { prizes: sample } })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="new-template-stub"]').attributes('data-open')).toBe('false')
    await w.find('[data-testid="rewards-new-template"]').trigger('click')
    expect(w.find('[data-testid="new-template-stub"]').attributes('data-open')).toBe('true')
  })

  it('renders a delete control per template card', async () => {
    mockList.mockResolvedValueOnce({ data: { prizes: sample } })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="tpl-delete-p1"]').exists()).toBe(true)
  })

  it('shows empty + error states', async () => {
    mockList.mockResolvedValueOnce({ data: { prizes: [] } })
    const w1 = mountView()
    await flushPromises()
    expect(w1.find('[data-testid="rewards-templates-empty"]').exists()).toBe(true)

    mockList.mockRejectedValueOnce(new Error('boom'))
    const w2 = mountView()
    await flushPromises()
    expect(w2.find('[data-testid="rewards-templates-error"]').exists()).toBe(true)
  })
})
