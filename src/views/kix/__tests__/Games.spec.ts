/**
 * Games.vue render test — rebuilt gallery (art-design-pro look).
 *
 * Three regions:
 *   1. KPI summary strip — Total / Active / Playable / Customizable,
 *      computed from the loaded list (card-list anatomy).
 *   2. Header CTA — "+ Create game" → /builder (the Smart-Recommend
 *      creation wizard is deferred; the CTA routes to the build surface).
 *   3. Card gallery — one .art-card per game with cover (image or
 *      gradient+emoji fallback), name, slug, status badge, and Play /
 *      Customize actions gated on real fields.
 *
 * Heavy logic (KPIs, name fallback, playability, cover palette) is unit
 * tested in games/__tests__/gamesModel.spec.ts. This component test only
 * verifies wiring: KPIs render, cards render, action gating works, Play
 * opens the target, the CTA routes, and empty/error render.
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

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push })
}))

import Games from '../Games.vue'
import { listBrandGames } from '@/api/portal-admin/games'

const stubs = {
  ArtSvgIcon: { template: '<i />', props: ['icon'] },
  StatusBadge: { template: '<span>{{ status }}</span>', props: ['status'] },
  ElButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' }
}

const sample = [
  {
    id: 'g1',
    name: 'Bubble Tea Match',
    game_slug: 'bubbletea_match3',
    status: 'active',
    cover_url: 'https://cdn/x.png',
    play_url: '/play/demo/1',
    order_id: 'ord-1'
  },
  {
    id: 'g2',
    brand_game_name: 'Bakery Spin',
    game_slug: 'bakery_spin',
    status: 'paused',
    game_file: '/games/bakery/index.html'
  },
  {
    id: 'g3',
    game_slug: 'bookstore_gomoku'
  }
]

const mockList = listBrandGames as unknown as ReturnType<typeof vi.fn>

function mountView() {
  return mount(Games, { global: { stubs } })
}

describe('Games.vue · rebuilt gallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders header + KPI strip with computed totals (legacy { games } shape)', async () => {
    mockList.mockResolvedValueOnce({ data: { games: sample } })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('portal.games.title')

    const kpis = wrapper.find('[data-testid="game-kpis"]')
    expect(kpis.exists()).toBe(true)
    const kt = kpis.text()
    expect(kt).toContain('3') // total
    expect(kt).toContain('2') // playable
    expect(kt).toContain('1') // active / customizable
  })

  it('renders a card per game with name + slug + status', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const wrapper = mountView()
    await flushPromises()

    const cards = wrapper.findAll('[data-testid="game-card"]')
    expect(cards).toHaveLength(3)
    expect(cards[0].text()).toContain('Bubble Tea Match')
    expect(cards[0].text()).toContain('bubbletea_match3')
    expect(cards[0].text()).toContain('active')
    expect(cards[1].text()).toContain('Bakery Spin') // brand_game_name fallback
    expect(cards[2].text()).toContain('bookstore_gomoku') // slug fallback
  })

  it('gates Play on playability and Customize on order_id', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const wrapper = mountView()
    await flushPromises()

    // g1: playable + customizable
    expect(wrapper.find('[data-testid="play-g1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="customize-g1"]').exists()).toBe(true)
    // g2: playable, not customizable
    expect(wrapper.find('[data-testid="play-g2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="customize-g2"]').exists()).toBe(false)
    // g3: neither
    expect(wrapper.find('[data-testid="play-g3"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="customize-g3"]').exists()).toBe(false)
  })

  it('Play opens the play target in a new tab', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    mockList.mockResolvedValueOnce({ data: sample })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('[data-testid="play-g1"]').trigger('click')
    expect(openSpy).toHaveBeenCalledWith('/play/demo/1', '_blank')
    openSpy.mockRestore()
  })

  it('"+ Create game" CTA routes to /builder', async () => {
    mockList.mockResolvedValueOnce({ data: sample })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('[data-testid="create-game"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/builder')
  })

  it('shows the empty hero when the brand has no games', async () => {
    mockList.mockResolvedValueOnce({ data: { games: [] } })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('[data-testid="games-empty-hero"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="game-card"]').exists()).toBe(false)
  })

  it('shows the error state when the fetch rejects', async () => {
    mockList.mockRejectedValueOnce(new Error('network down'))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.find('[data-testid="games-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('network down')
  })
})
