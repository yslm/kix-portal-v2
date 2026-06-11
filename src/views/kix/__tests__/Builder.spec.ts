/**
 * Builder.vue render test — covers the three state branches of the
 * opportunity-score card (loading → loaded / error) plus the static
 * 6-button module gallery.
 *
 * Plan 3 Task 5 ports the Builder ENTRY VIEW ONLY. Sub-forms are out of
 * scope; the module buttons surface a "coming soon" alert via
 * `window.alert`, stubbed here so jsdom doesn't choke.
 *
 * Uses the same bare `t(key) => key` stub as the Games / Campaigns /
 * Settings / Overview specs — the real i18n pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/builder', () => ({
  fetchOpportunityScore: vi.fn(),
  defaultEmptyConfig: {
    game: {},
    voucher: {},
    rule: {},
    schedule: {},
    safety: {},
    audience: { type: 'recent_visitors_7d' }
  }
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Builder from '../Builder.vue'
import { fetchOpportunityScore } from '@/api/portal-admin/builder'

const MODULE_KEYS = [
  'portal.builder.mod.game.label',
  'portal.builder.mod.voucher.label',
  'portal.builder.mod.rule.label',
  'portal.builder.mod.schedule.label',
  'portal.builder.mod.safety.label',
  'portal.builder.mod.tournament.label'
] as const

describe('Builder.vue · entry view (opp-score + module gallery)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress the "coming soon" alert during click tests
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('renders the page header, opp-score card, and all 6 module buttons after a successful fetch', async () => {
    ;(fetchOpportunityScore as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        score: 78,
        hints: [
          { points: 5, label: 'Add a tournament' },
          { points: 3, label: 'Tighten geofence' }
        ]
      }
    })

    const wrapper = mount(Builder)
    await flushPromises()

    // Page header
    expect(wrapper.text()).toContain('portal.builder.title')
    expect(wrapper.text()).toContain('portal.builder.sub')

    // Opp-score card
    expect(wrapper.find('[data-testid="opp-score-card"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="opp-score-val"]').text()).toBe('78')
    expect(wrapper.text()).toContain('Add a tournament')
    expect(wrapper.text()).toContain('Tighten geofence')
    expect(wrapper.text()).toContain('+5')
    expect(wrapper.text()).toContain('+3')

    // 6 module buttons present
    expect(wrapper.find('[data-testid="module-gallery"]').exists()).toBe(true)
    for (const key of MODULE_KEYS) {
      expect(wrapper.text()).toContain(key)
    }
    expect(
      wrapper
        .findAll('[data-testid^="module-"]')
        .filter((w) => w.attributes('data-testid') !== 'module-gallery')
    ).toHaveLength(6)
  })

  it('renders the "looking good" branch when the API returns no hints', async () => {
    ;(fetchOpportunityScore as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { score: 95, hints: [] }
    })

    const wrapper = mount(Builder)
    await flushPromises()

    expect(wrapper.find('[data-testid="opp-score-good"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('portal.builder.opp.good')
    expect(wrapper.find('[data-testid="opp-score-hints"]').exists()).toBe(false)
  })

  it('shows the error branch when the opp-score fetch rejects (gallery still rendered)', async () => {
    ;(fetchOpportunityScore as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom')
    )

    const wrapper = mount(Builder)
    await flushPromises()

    expect(wrapper.find('[data-testid="opp-score-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load opportunity score')
    expect(wrapper.text()).toContain('boom')
    expect(wrapper.find('[data-testid="opp-score-card"]').exists()).toBe(false)
    // Module gallery is static UI — must still render even if opp-score fails.
    expect(
      wrapper
        .findAll('[data-testid^="module-"]')
        .filter((w) => w.attributes('data-testid') !== 'module-gallery')
    ).toHaveLength(6)
  })

  it('module buttons are clickable and trigger the coming-soon stub', async () => {
    ;(fetchOpportunityScore as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { score: 50, hints: [] }
    })

    const wrapper = mount(Builder)
    await flushPromises()

    const gameBtn = wrapper.find('[data-testid="module-game"]')
    expect(gameBtn.exists()).toBe(true)
    await gameBtn.trigger('click')
    expect(window.alert).toHaveBeenCalledWith('Coming soon: game form')
  })
})
