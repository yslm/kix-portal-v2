/**
 * VipTiers.vue render test — exercises the four state branches of the
 * tier ladder (canonical `{ tiers }` wrapper, bare-array fallback,
 * error, empty) plus the distribution card's independent failure /
 * empty branches. Mirrors the legacy `kixLoadVipTiers()` two-fetch
 * dance at portal.html line 4088-4091.
 *
 * Same fixture / stubbing shape as Cases.spec.ts — `t(key) => key`
 * stub, no brand-id stub needed because both loyalty-tiers routes infer
 * brand from the JWT (`get_current_brand` dependency, no `?brand=`
 * param). The actual translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/vip-tiers', () => ({
  listLoyaltyTiers: vi.fn(),
  listLoyaltyTierDistribution: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import VipTiers from '../VipTiers.vue'
import { listLoyaltyTiers, listLoyaltyTierDistribution } from '@/api/portal-admin/vip-tiers'

// Schema mirrors `_DEFAULT_TIERS` at portal_admin.py line 3520-3524 —
// the server-emitted fallback when the merchant hasn't saved their own.
const sampleTiers = [
  { name: 'Bronze', min_xp: 0, perk: 'Welcome reward on first visit' },
  { name: 'Silver', min_xp: 500, perk: 'Priority prizes · +1 daily play' },
  { name: 'Gold', min_xp: 2000, perk: 'VIP-only vouchers · birthday double' }
]

const sampleDistribution = [
  { name: 'Bronze', min_xp: 0, perk: 'Welcome reward on first visit', members: 42 },
  { name: 'Silver', min_xp: 500, perk: 'Priority prizes · +1 daily play', members: 17 },
  { name: 'Gold', min_xp: 2000, perk: 'VIP-only vouchers · birthday double', members: 3 }
]

const mockTiers = listLoyaltyTiers as unknown as ReturnType<typeof vi.fn>
const mockDist = listLoyaltyTierDistribution as unknown as ReturnType<typeof vi.fn>

describe('VipTiers.vue · tier ladder + member distribution', () => {
  beforeEach(() => {
    // Reset (not just clear) so any unused `mockResolvedValueOnce` /
    // `mockRejectedValueOnce` queue entries from a previous test are
    // dropped before the next test stages its own queue. `clearAllMocks`
    // only clears call records, not queued implementations.
    mockTiers.mockReset()
    mockDist.mockReset()
  })

  it('renders the page header, tier ladder, and distribution graph after both fetches resolve', async () => {
    mockTiers.mockResolvedValueOnce({
      data: { brand_id: 'demo', tiers: sampleTiers, custom: false }
    })
    mockDist.mockResolvedValueOnce({
      data: { brand_id: 'demo', sampled_members: 62, distribution: sampleDistribution }
    })

    const wrapper = mount(VipTiers)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.vip.title')
    expect(wrapper.text()).toContain('portal.vip.subtitle')

    // Data branch visible; loading / error / empty hidden.
    expect(wrapper.find('[data-testid="vip-tiers-ladder"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="vip-tiers-distribution"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="vip-tiers-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="vip-tiers-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="vip-tiers-empty"]').exists()).toBe(false)

    const rows = wrapper.findAll('[data-testid="vip-tier-row"]')
    expect(rows).toHaveLength(3)

    // Bronze row · name + min_xp=0 + perk.
    expect(rows[0].text()).toContain('Bronze')
    expect(rows[0].text()).toContain('0')
    expect(rows[0].text()).toContain('Welcome reward on first visit')

    // Silver row.
    expect(rows[1].text()).toContain('Silver')
    expect(rows[1].text()).toContain('500')

    // Gold row.
    expect(rows[2].text()).toContain('Gold')
    expect(rows[2].text()).toContain('2000')

    // Distribution bars rendered, one per tier.
    const distRows = wrapper.findAll('[data-testid="vip-tier-dist-row"]')
    expect(distRows).toHaveLength(3)
    expect(distRows[0].text()).toContain('Bronze')
    expect(distRows[0].text()).toContain('42')

    // Sampled-members subscript.
    expect(wrapper.text()).toContain('Sampled 62 members')
  })

  it('normalises a bare-array tiers response (defensive fallback)', async () => {
    mockTiers.mockResolvedValueOnce({ data: sampleTiers })
    mockDist.mockResolvedValueOnce({
      data: { sampled_members: 0, distribution: [] }
    })

    const wrapper = mount(VipTiers)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="vip-tier-row"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('Bronze')
  })

  it('shows the error branch when the tier ladder fetch rejects', async () => {
    mockTiers.mockRejectedValueOnce(new Error('network down'))
    mockDist.mockResolvedValueOnce({
      data: { sampled_members: 0, distribution: [] }
    })

    const wrapper = mount(VipTiers)
    await flushPromises()

    expect(wrapper.find('[data-testid="vip-tiers-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="vip-tiers-ladder"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="vip-tiers-distribution"]').exists()).toBe(false)
  })

  it('shows the empty-state placeholder when the tier ladder returns no tiers', async () => {
    mockTiers.mockResolvedValueOnce({
      data: { brand_id: 'demo', tiers: [], custom: false }
    })
    // Distribution endpoint not exercised here — ladder empty short-
    // circuits the empty branch before the distribution decision.
    mockDist.mockResolvedValueOnce({
      data: { sampled_members: 0, distribution: [] }
    })

    const wrapper = mount(VipTiers)
    await flushPromises()

    expect(wrapper.find('[data-testid="vip-tiers-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No tiers configured')
    expect(wrapper.find('[data-testid="vip-tiers-ladder"]').exists()).toBe(false)
  })

  it('still renders the ladder when the distribution fetch rejects (independent failure)', async () => {
    // Mirrors the legacy `.catch(() => null)` swallow at portal.html
    // line 4090 — the 503 (Redis down) for the distribution endpoint
    // must not break the read of the tier ladder.
    mockTiers.mockResolvedValueOnce({
      data: { brand_id: 'demo', tiers: sampleTiers, custom: false }
    })
    mockDist.mockRejectedValueOnce(new Error('Redis unavailable'))

    const wrapper = mount(VipTiers)
    await flushPromises()

    // Ladder still rendered.
    expect(wrapper.find('[data-testid="vip-tiers-ladder"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="vip-tier-row"]')).toHaveLength(3)

    // Distribution shows the inline fallback copy, not the page error.
    expect(wrapper.find('[data-testid="vip-tiers-distribution"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="vip-tiers-dist-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="vip-tiers-error"]').exists()).toBe(false)
  })
})
