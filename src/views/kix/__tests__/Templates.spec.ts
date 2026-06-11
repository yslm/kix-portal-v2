/**
 * Templates.vue render test — exercises the four state branches of the
 * template catalog grid: loaded (canonical `{ games, total, ... }`
 * wrapper — the shape `/api/v1/portal-admin/games/templates` actually
 * returns per portal.html line 8246-8252), bare-array defensive
 * fallback, error, and empty.
 *
 * Same fixture / stubbing shape as Rules.spec.ts — `t(key) => key`
 * stub, no brand-id stub needed because `listTemplates()` infers brand
 * from the JWT (no explicit `?brand=` param, mirroring listRules() /
 * listAbTests() / listAudiences()). The actual translation pipeline
 * is covered by `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/templates', () => ({
  listTemplates: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Templates from '../Templates.vue'
import { listTemplates } from '@/api/portal-admin/templates'

// Schema mirrors the per-template fields the legacy renderer reads at
// portal.html line 8192-8199 (slug · name · cover_url · reskinable).
const sampleTemplates = [
  {
    slug: 'scratch_v1',
    name: 'Scratch & Win',
    cover_url: 'https://cdn.example/scratch.jpg',
    reskinable: true
  },
  {
    slug: 'wheel_spin',
    name: 'Lucky Wheel',
    cover_url: '',
    // reskinable=false → no badge (StatusBadge v-if suppresses it).
    reskinable: false
  },
  {
    // Bare-bones entry — name falls back to slug per the legacy
    // renderer's `t.name || t.slug || 'Template'` chain.
    slug: 'memory_match'
  }
]

describe('Templates.vue · catalog grid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header and the template grid after a successful fetch (canonical `{ games, ... }` wrapper)', async () => {
    ;(listTemplates as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        games: sampleTemplates,
        total: 3,
        reskin_count: 1,
        catalog_only_count: 2
      }
    })

    const wrapper = mount(Templates)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.templates.title')
    expect(wrapper.text()).toContain('portal.templates.subtitle')

    // Data branch visible; loading / error / empty hidden.
    expect(wrapper.find('[data-testid="templates-grid"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="templates-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="templates-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="templates-empty"]').exists()).toBe(false)

    const cards = wrapper.findAll('[data-testid="template-card"]')
    expect(cards).toHaveLength(3)

    // Card 1: reskinable template with cover; StatusBadge maps true → 'active'.
    expect(cards[0].text()).toContain('Scratch & Win')
    expect(cards[0].text()).toContain('scratch_v1')
    expect(cards[0].text()).toContain('active')
    expect(cards[0].find('img').exists()).toBe(true)
    expect(cards[0].find('img').attributes('src')).toBe('https://cdn.example/scratch.jpg')

    // Card 2: not-reskinable + empty cover → no badge, no <img>.
    expect(cards[1].text()).toContain('Lucky Wheel')
    expect(cards[1].text()).toContain('wheel_spin')
    expect(cards[1].text()).not.toContain('active')
    expect(cards[1].find('img').exists()).toBe(false)

    // Card 3: bare slug — name falls back to slug.
    expect(cards[2].text()).toContain('memory_match')
  })

  it('normalises a bare-array response (defensive fallback)', async () => {
    ;(listTemplates as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleTemplates
    })

    const wrapper = mount(Templates)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="template-card"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('Scratch & Win')
  })

  it('shows the error branch when fetch rejects', async () => {
    ;(listTemplates as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('network down')
    )

    const wrapper = mount(Templates)
    await flushPromises()

    expect(wrapper.find('[data-testid="templates-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="templates-grid"]').exists()).toBe(false)
  })

  it('shows the empty-state placeholder when the catalog has no templates', async () => {
    ;(listTemplates as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { games: [], total: 0 }
    })

    const wrapper = mount(Templates)
    await flushPromises()

    expect(wrapper.find('[data-testid="templates-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No templates available')
    expect(wrapper.find('[data-testid="templates-grid"]').exists()).toBe(false)
  })
})
