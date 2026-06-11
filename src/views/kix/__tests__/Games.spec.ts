/**
 * Games.vue render test — exercises the four state branches of the
 * My Games grid: loaded (legacy `{ games }` wrapper), bare array,
 * error, and empty (hero placeholder).
 *
 * Uses a bare `t(key) => key` stub instead of the full vue-i18n setup;
 * the actual translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 *
 * `resolveBrandId` is stubbed so the test doesn't depend on the live
 * `window.location.search` / localStorage state — we only care that the
 * fetcher is called once.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/games', () => ({
  listBrandGames: vi.fn()
}))

vi.mock('@/utils/kix/resolveBrandId', () => ({
  resolveBrandId: () => 'demo_brand'
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Games from '../Games.vue'
import { listBrandGames } from '@/api/portal-admin/games'

const sampleGames = [
  {
    id: 'g-001',
    name: 'Spin the Wheel',
    game_slug: 'spin-the-wheel',
    status: 'active'
  },
  {
    id: 'g-002',
    // No `name` — should fall through to brand_game_name then game_slug.
    brand_game_name: 'Scratch Card Friday',
    game_slug: 'scratch-card',
    status: 'paused'
  },
  {
    id: 'g-003',
    // Only game_slug present — final fallback before "Untitled".
    game_slug: 'mystery-box'
  }
]

describe('Games.vue · my-games grid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header and the games grid after a successful fetch (legacy `{ games }` shape)', async () => {
    ;(listBrandGames as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { games: sampleGames }
    })

    const wrapper = mount(Games)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.games.title')
    expect(wrapper.text()).toContain('portal.games.subtitle')

    expect(wrapper.find('[data-testid="games-grid"]').exists()).toBe(true)
    const cards = wrapper.findAll('[data-testid="game-card"]')
    expect(cards).toHaveLength(3)

    // Card 1: explicit name wins
    expect(cards[0].text()).toContain('Spin the Wheel')
    expect(cards[0].text()).toContain('spin-the-wheel')
    expect(cards[0].text()).toContain('active')

    // Card 2: name is missing → brand_game_name fallback
    expect(cards[1].text()).toContain('Scratch Card Friday')
    expect(cards[1].text()).toContain('paused')

    // Card 3: only slug → slug is the display name
    expect(cards[2].text()).toContain('mystery-box')

    // Empty hero is not shown when there are games.
    expect(wrapper.find('[data-testid="games-empty-hero"]').exists()).toBe(false)
  })

  it('normalises a bare-array response', async () => {
    ;(listBrandGames as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleGames
    })

    const wrapper = mount(Games)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="game-card"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('Spin the Wheel')
  })

  it('shows the error branch when fetch rejects', async () => {
    ;(listBrandGames as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('network down')
    )

    const wrapper = mount(Games)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="games-grid"]').exists()).toBe(false)
  })

  it('shows the empty-state hero placeholder when the brand has no games', async () => {
    ;(listBrandGames as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { games: [] }
    })

    const wrapper = mount(Games)
    await flushPromises()

    expect(wrapper.find('[data-testid="games-empty-hero"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No games yet')
    expect(wrapper.find('[data-testid="games-grid"]').exists()).toBe(false)
  })
})
