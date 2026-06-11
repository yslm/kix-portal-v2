/**
 * Rewards.vue render test — exercises the four state branches of the
 * Templates tab (data | empty | error | loading) plus the tab-switch
 * UX into each of the three stub tabs (Game links / Issuance /
 * Redemption).
 *
 * Same fixture / stubbing shape as Creatives.spec.ts — `t(key) => key`
 * stub. No explicit brand-id stub needed: `listRewardTemplates()`
 * falls back to `resolveBrandId()` which falls back to `'demo_brand'`
 * when called without an arg (matches the legacy `_t44Bid()` default
 * when `kix_brand_id` is unset in localStorage), and the test mocks
 * the module-level fetcher anyway. The actual translation pipeline
 * is covered by `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/rewards', () => ({
  listRewardTemplates: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Rewards from '../Rewards.vue'
import { listRewardTemplates } from '@/api/portal-admin/rewards'

// Schema mirrors the per-row fields the legacy renderer reads at
// portal.html line 5733-5746 (name · offer_type · image_url ·
// inventory_count · original_price_cents · prize_id). The third row
// deliberately omits `original_price_cents` AND uses `inventory_count: null`
// so the defensive fallbacks are exercised:
//   - original_price_cents missing → no value paragraph rendered
//   - inventory_count null → 'unlimited' (legacy `== null` ternary)
const sampleTemplates = [
  {
    prize_id: 'prz_kopi_free',
    name: 'Free Americano',
    type: 'voucher',
    original_price_cents: 580,
    inventory_count: 100,
    status: 'active'
  },
  {
    prize_id: 'prz_50_off',
    name: '50% off lunch combo',
    offer_type: 'percent_off',
    original_price_cents: 1290,
    inventory_count: 50,
    status: 'paused'
  },
  {
    // Bare-bones row — value absent → no price line; inventory_count
    // null → 'unlimited'; no status → StatusBadge falls back to gray.
    prize_id: 'prz_legacy',
    name: 'Legacy unlimited prize',
    inventory_count: null
  }
]

const mockFetch = listRewardTemplates as unknown as ReturnType<typeof vi.fn>

describe('Rewards.vue · consolidated 4-tab view', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders all 4 tabs and the Templates tab is active by default', async () => {
    mockFetch.mockResolvedValueOnce({ data: { prizes: sampleTemplates } })

    const wrapper = mount(Rewards)
    await flushPromises()

    // Page header (i18n stub returns key)
    expect(wrapper.text()).toContain('portal.rewards.title')
    expect(wrapper.text()).toContain('portal.rewards.subtitle')

    // All 4 tab buttons present
    expect(wrapper.find('[data-testid="rewards-tab-templates"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rewards-tab-game-links"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rewards-tab-issuance"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rewards-tab-redemption"]').exists()).toBe(true)

    // Templates panel visible by default
    expect(wrapper.find('[data-testid="rewards-panel-templates"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rewards-panel-game-links"]').exists()).toBe(false)
  })

  it('renders the templates grid after a successful fetch (canonical `{ prizes }` wrapper)', async () => {
    mockFetch.mockResolvedValueOnce({ data: { prizes: sampleTemplates } })

    const wrapper = mount(Rewards)
    await flushPromises()

    // Data branch visible; loading / error / empty hidden.
    expect(wrapper.find('[data-testid="rewards-templates-grid"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rewards-templates-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="rewards-templates-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="rewards-templates-empty"]').exists()).toBe(false)

    const cards = wrapper.findAll('[data-testid="rewards-template-card"]')
    expect(cards).toHaveLength(3)

    // Card 1 · explicit `type` + price (580 cents → S$5.8; fmtSgd
    // trims trailing zeros per src/utils/format/currency.ts) +
    // inventory.
    expect(cards[0].text()).toContain('Free Americano')
    expect(cards[0].text()).toContain('voucher')
    expect(cards[0].text()).toContain('S$5.8')
    expect(cards[0].text()).toContain('Inventory: 100')

    // Card 2 · falls through to `offer_type` when `type` absent.
    expect(cards[1].text()).toContain('50% off lunch combo')
    expect(cards[1].text()).toContain('percent_off')
    expect(cards[1].text()).toContain('S$12.9')

    // Card 3 · null inventory → 'unlimited'; no price line.
    expect(cards[2].text()).toContain('Legacy unlimited prize')
    expect(cards[2].text()).toContain('Inventory: unlimited')
    expect(cards[2].text()).not.toContain('S$')
  })

  it('normalises a bare-array response (defensive fallback)', async () => {
    mockFetch.mockResolvedValueOnce({ data: sampleTemplates })

    const wrapper = mount(Rewards)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="rewards-template-card"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('Free Americano')
  })

  it('normalises a `{ templates }` response shape (defensive fallback)', async () => {
    mockFetch.mockResolvedValueOnce({ data: { templates: sampleTemplates } })

    const wrapper = mount(Rewards)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="rewards-template-card"]')).toHaveLength(3)
  })

  it('shows the empty-state placeholder when the merchant has no templates', async () => {
    mockFetch.mockResolvedValueOnce({ data: { prizes: [] } })

    const wrapper = mount(Rewards)
    await flushPromises()

    expect(wrapper.find('[data-testid="rewards-templates-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No reward templates yet')
    expect(wrapper.find('[data-testid="rewards-templates-grid"]').exists()).toBe(false)
  })

  it('shows the error branch when fetch rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))

    const wrapper = mount(Rewards)
    await flushPromises()

    expect(wrapper.find('[data-testid="rewards-templates-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="rewards-templates-grid"]').exists()).toBe(false)
  })

  it('switches to the Game links stub on tab click', async () => {
    mockFetch.mockResolvedValueOnce({ data: { prizes: sampleTemplates } })

    const wrapper = mount(Rewards)
    await flushPromises()

    await wrapper.find('[data-testid="rewards-tab-game-links"]').trigger('click')

    expect(wrapper.find('[data-testid="rewards-panel-game-links"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rewards-panel-templates"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Game-link bindings coming soon')
  })

  it('switches to the Issuance stub on tab click', async () => {
    mockFetch.mockResolvedValueOnce({ data: { prizes: sampleTemplates } })

    const wrapper = mount(Rewards)
    await flushPromises()

    await wrapper.find('[data-testid="rewards-tab-issuance"]').trigger('click')

    expect(wrapper.find('[data-testid="rewards-panel-issuance"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Issuance history coming soon')
  })

  it('switches to the Redemption stub on tab click', async () => {
    mockFetch.mockResolvedValueOnce({ data: { prizes: sampleTemplates } })

    const wrapper = mount(Rewards)
    await flushPromises()

    await wrapper.find('[data-testid="rewards-tab-redemption"]').trigger('click')

    expect(wrapper.find('[data-testid="rewards-panel-redemption"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Redemption tracking coming soon')
  })
})
