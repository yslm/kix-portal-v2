/**
 * NbaCard.vue render test — covers the four meaningful render branches
 * for the V2.16 "Suggested next move" card:
 *
 *   1. One or more KNOWN actions → card renders the eyebrow + a row per
 *                                  action with the right body copy + CTA.
 *   2. CTA click                 → navigates to the mapped v2 route.
 *   3. Empty actions array       → card hidden (legacy line 4184 short-
 *                                  circuit at portal.html when actions.length
 *                                  is 0 after the KIX_NBA_COPY filter).
 *   4. Fetch error               → card hidden (legacy line 4196
 *                                  `catch (_) { card.style.display = 'none' }`).
 *
 * Element Plus components (el-card, el-button) are stubbed locally so the
 * test doesn't need the full art-design-pro plugin chain. vue-router's
 * `useRouter` is stubbed to a noop push spy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/overview', () => ({
  fetchNextBestAction: vi.fn()
}))

const pushSpy = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushSpy })
}))

import NbaCard from '../NbaCard.vue'
import { fetchNextBestAction } from '@/api/portal-admin/overview'

const stubs = {
  'el-card': {
    template: '<div data-stub="el-card"><slot name="header" /><slot /></div>'
  },
  'el-button': {
    template: '<button data-stub="el-button" @click="$emit(\'click\')"><slot /></button>',
    emits: ['click']
  }
}

describe('NbaCard.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the eyebrow + a row per known action with the right copy + CTA', async () => {
    ;(fetchNextBestAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        brand_id: 'demo_brand',
        actions: [
          // Variable interpolation path (count) — winback
          { id: 'winback_at_risk', view: 'messages', count: 7, signal: '7 idle 14-45d' },
          // Variable interpolation path (tier + save) — upgrade
          {
            id: 'upgrade_break_even',
            view: 'billing',
            to_tier: 'growth',
            save_cents: 12_300,
            signal: 'spend=…'
          },
          // No-variable path — finish_setup
          { id: 'finish_setup', view: 'overview', signal: 'games=0 prizes=0' }
        ]
      }
    })

    const wrapper = mount(NbaCard, { global: { stubs } })
    await flushPromises()

    // Eyebrow copy mirrors portal.html line 1321
    expect(wrapper.text()).toContain('Suggested next move')

    // Body copy verbatim from KIX_NBA_COPY (portal.html line 4159-4169),
    // with {count} interpolated to 7
    expect(wrapper.text()).toContain("7 customers haven't been back")

    // Upgrade row: tier upper-cased, save_cents → ¥123 (cents → integer ¥)
    expect(wrapper.text()).toContain('GROWTH')
    expect(wrapper.text()).toContain('123')
    expect(wrapper.text()).toContain('saves')

    // finish_setup: no count interpolation, raw copy
    expect(wrapper.text()).toContain('Finish your shop setup')

    // One CTA per row (3 actions → 3 buttons)
    const buttons = wrapper.findAll('[data-stub="el-button"]')
    expect(buttons).toHaveLength(3)

    // First button is the winback row (action[0])
    expect(buttons[0].text()).toContain('Send a win-back')
    await buttons[0].trigger('click')
    expect(pushSpy).toHaveBeenCalledWith('/messages')
  })

  it('drops unknown action ids and renders only the recognised ones', async () => {
    ;(fetchNextBestAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        brand_id: 'demo_brand',
        actions: [
          { id: 'finish_setup', view: 'overview' },
          // Unknown id — must be dropped (mirrors legacy KIX_NBA_COPY filter
          // at portal.html line 4183)
          { id: 'totally_made_up', view: 'overview' }
        ]
      }
    })

    const wrapper = mount(NbaCard, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="nba-card"]').exists()).toBe(true)
    const buttons = wrapper.findAll('[data-stub="el-button"]')
    expect(buttons).toHaveLength(1)
    expect(wrapper.text()).toContain('Finish your shop setup')
  })

  it('hides the card when the action list is empty', async () => {
    ;(fetchNextBestAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        brand_id: 'demo_brand',
        actions: []
      }
    })

    const wrapper = mount(NbaCard, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="nba-card"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Suggested next move')
  })

  it('hides the card when every action id is unknown (post-filter empty)', async () => {
    ;(fetchNextBestAction as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        brand_id: 'demo_brand',
        actions: [{ id: 'mystery_action_1' }, { id: 'mystery_action_2' }]
      }
    })

    const wrapper = mount(NbaCard, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="nba-card"]').exists()).toBe(false)
  })

  it('hides the card when the fetch errors (non-critical UI)', async () => {
    ;(fetchNextBestAction as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom')
    )

    const wrapper = mount(NbaCard, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="nba-card"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Suggested next move')
  })
})
