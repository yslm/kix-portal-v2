/**
 * VipTiers.vue render test — rebuilt view (art-design-pro, Week 8k).
 * KPI strip + ArtTable ladder (members joined) + distribution bars. Heavy
 * logic unit-tested in vip-tiers/__tests__/vipTiersModel.spec.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

vi.mock('@/api/portal-admin/vip-tiers', () => ({
  listLoyaltyTiers: vi.fn(),
  listLoyaltyTierDistribution: vi.fn()
}))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import VipTiers from '../VipTiers.vue'
import { listLoyaltyTiers, listLoyaltyTierDistribution } from '@/api/portal-admin/vip-tiers'

const ArtTableStub = defineComponent({
  name: 'ArtTable',
  props: ['data', 'columns', 'loading', 'pagination'],
  setup(props) {
    return () =>
      h(
        'div',
        { 'data-testid': 'art-table', 'data-row-count': (props.data ?? []).length },
        (props.data ?? []).map((r: { name: string; members: number | null }) =>
          h('div', { 'data-testid': `row-${r.name}` }, String(r.members))
        )
      )
  }
})
const ElCardStub = defineComponent({
  name: 'ElCard',
  setup(_, { slots }) {
    return () => h('div', { class: 'el-card' }, [slots.header?.(), slots.default?.()])
  }
})
const stubs = {
  ArtTable: ArtTableStub,
  ElCard: ElCardStub,
  ArtSvgIcon: { template: '<i />', props: ['icon'] }
}

const tiers = [
  { name: 'Bronze', min_xp: 0, perk: '5% off' },
  { name: 'Silver', min_xp: 500, perk: 'Free drink' },
  { name: 'Gold', min_xp: 2000, perk: '' }
]
const dist = {
  sampled_members: 168,
  distribution: [
    { name: 'Bronze', min_xp: 0, perk: '5% off', members: 120 },
    { name: 'Silver', min_xp: 500, perk: 'Free drink', members: 40 },
    { name: 'Gold', min_xp: 2000, perk: '', members: 8 }
  ]
}
const mockTiers = listLoyaltyTiers as unknown as ReturnType<typeof vi.fn>
const mockDist = listLoyaltyTierDistribution as unknown as ReturnType<typeof vi.fn>
const mountView = () => mount(VipTiers, { global: { stubs } })

describe('VipTiers.vue · rebuilt view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders KPI strip + ladder with members joined from distribution', async () => {
    mockTiers.mockResolvedValueOnce({ data: { tiers } })
    mockDist.mockResolvedValueOnce({ data: dist })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('portal.vip.title')
    const k = w.find('[data-testid="vip-kpis"]')
    expect(k.text()).toContain('3') // total tiers
    expect(k.text()).toContain('168') // members sampled
    expect(k.text()).toContain('2,000 pts') // top threshold
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('3')
    expect(w.find('[data-testid="row-Bronze"]').text()).toBe('120') // joined member count
  })

  it('renders distribution bars + sampled subscript', async () => {
    mockTiers.mockResolvedValueOnce({ data: { tiers } })
    mockDist.mockResolvedValueOnce({ data: dist })
    const w = mountView()
    await flushPromises()
    expect(w.findAll('[data-testid="vip-tier-dist-row"]')).toHaveLength(3)
  })

  it('ladder still renders when distribution 503s (members → em-dash)', async () => {
    mockTiers.mockResolvedValueOnce({ data: { tiers } })
    mockDist.mockRejectedValueOnce(new Error('503'))
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="art-table"]').attributes('data-row-count')).toBe('3')
    expect(w.find('[data-testid="row-Bronze"]').text()).toBe('null') // model emits null → view em-dash
    expect(w.find('[data-testid="vip-tiers-dist-empty"]').exists()).toBe(true)
  })

  it('shows error + empty states for the ladder', async () => {
    mockTiers.mockRejectedValueOnce(new Error('boom'))
    const w1 = mountView()
    await flushPromises()
    expect(w1.find('[data-testid="vip-tiers-error"]').exists()).toBe(true)

    mockTiers.mockResolvedValueOnce({ data: { tiers: [] } })
    mockDist.mockResolvedValueOnce({ data: { sampled_members: 0, distribution: [] } })
    const w2 = mountView()
    await flushPromises()
    expect(w2.find('[data-testid="vip-tiers-empty"]').exists()).toBe(true)
  })
})
