/**
 * Rules.vue render test — exercises the four state branches of the
 * rules list: loaded (canonical `{ items, ... }` wrapper — the shape
 * `/api/v1/portal-admin/automations` actually returns), bare-array
 * defensive fallback, error, and empty.
 *
 * Same fixture / stubbing shape as AbTests.spec.ts — `t(key) => key`
 * stub, no brand-id stub needed because `listRules()` infers brand
 * from the JWT (no explicit `?brand=` param, mirroring CustomerList +
 * Audiences + AbTests). The actual translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/rules', () => ({
  listRules: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Rules from '../Rules.vue'
import { listRules } from '@/api/portal-admin/rules'

// Schema mirrors the legacy demo rows at portal.html lines 1948-1951 +
// the real wire fields read by `kixLoadRules()` (line 7206-7232).
const sampleRules = [
  {
    id: 'rule_pause_low_ctr',
    name: 'Pause low-CTR campaigns',
    state: 'on',
    condition: 'spend > S$50 AND CTR < 0.5%',
    action: 'pause',
    scope: 'All campaigns',
    last_triggered_at: '2h ago'
  },
  {
    id: 'rule_low_voucher_alert',
    name: 'Low voucher inventory alert',
    // 'off' → StatusBadge maps to 'inactive' (gray pill).
    state: 'off',
    condition: 'Pool < 20% remaining',
    action: 'notify',
    scope: 'Voucher pools',
    last_triggered_at: null
  },
  {
    id: 'rule_notify_only',
    name: 'Wallet auto-recharge fail → SMS',
    // 'notify_only' → no mapping, falls through to gray pill default.
    state: 'notify_only',
    condition: 'SetupIntent declined',
    action: 'notify',
    scope: 'Account',
    last_triggered_at: '3d ago'
  }
]

describe('Rules.vue · rules list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header and the rules table after a successful fetch (canonical `{ items, ... }` wrapper)', async () => {
    ;(listRules as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        items: sampleRules,
        source: 'redis · automations:demo',
        updated_at: '2026-06-11T08:00:00+00:00',
        empty_state_hint: null
      }
    })

    const wrapper = mount(Rules)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.rules.title')
    expect(wrapper.text()).toContain('portal.rules.subtitle')

    // Data branch visible; loading / error / empty hidden.
    expect(wrapper.find('[data-testid="rules-list"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rules-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="rules-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="rules-empty"]').exists()).toBe(false)

    const rows = wrapper.findAll('[data-testid="rule-row"]')
    expect(rows).toHaveLength(3)

    // Row 1: on-state rule renders name + condition + action + scope +
    // last_triggered_at; StatusBadge maps 'on' → 'active' literal.
    expect(rows[0].text()).toContain('Pause low-CTR campaigns')
    expect(rows[0].text()).toContain('spend > S$50 AND CTR < 0.5%')
    expect(rows[0].text()).toContain('pause')
    expect(rows[0].text()).toContain('All campaigns')
    expect(rows[0].text()).toContain('2h ago')
    expect(rows[0].text()).toContain('active')

    // Row 2: off-state + null last_triggered_at → em-dash fallback.
    expect(rows[1].text()).toContain('Low voucher inventory alert')
    expect(rows[1].text()).toContain('inactive')
    expect(rows[1].text()).toContain('—')

    // Row 3: notify_only falls through to StatusBadge gray pill; the
    // literal 'notify_only' string still renders inside the badge.
    expect(rows[2].text()).toContain('Wallet auto-recharge fail → SMS')
    expect(rows[2].text()).toContain('notify_only')
  })

  it('normalises a bare-array response (defensive fallback)', async () => {
    ;(listRules as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleRules
    })

    const wrapper = mount(Rules)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="rule-row"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('Pause low-CTR campaigns')
  })

  it('shows the error branch when fetch rejects', async () => {
    ;(listRules as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('network down')
    )

    const wrapper = mount(Rules)
    await flushPromises()

    expect(wrapper.find('[data-testid="rules-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="rules-list"]').exists()).toBe(false)
  })

  it('shows the empty-state placeholder when the brand has no rules', async () => {
    ;(listRules as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { items: [], empty_state_hint: 'No automation rules yet.' }
    })

    const wrapper = mount(Rules)
    await flushPromises()

    expect(wrapper.find('[data-testid="rules-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No automation rules yet')
    expect(wrapper.find('[data-testid="rules-list"]').exists()).toBe(false)
  })
})
