/**
 * Creatives.vue render test — exercises the four state branches of the
 * asset library grid (data | empty | error | loading) plus the per-card
 * normalisation (kind default, size formatting, uploaded-at wrapper
 * unwrap).
 *
 * Same fixture / stubbing shape as Geofences.spec.ts — `t(key) => key`
 * stub. No explicit brand-id stub needed: `listCreatives()` falls back
 * to `'demo_brand'` when called without an arg (matches the legacy
 * `_t44Bid()` default when `kix_brand_id` is unset in localStorage),
 * and the test mocks the module-level fetcher anyway. The actual
 * translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/creatives', () => ({
  listCreatives: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Creatives from '../Creatives.vue'
import { listCreatives } from '@/api/portal-admin/creatives'

// Schema mirrors the per-row fields the legacy renderer reads at
// portal.html line 6893-6901 (filename · kind · bytes · uploaded_at).
// The third row deliberately omits `kind` AND `bytes` AND uses a raw
// ISO string for `uploaded_at` so the defensive fallbacks are
// exercised:
//   - kind missing → 'image' default (line 6894)
//   - bytes missing → '—' fallback (matches legacy ternary line 6895)
//   - uploaded_at as raw string → accepted alongside the wrapper shape
const sampleAssets = [
  {
    asset_id: 'asset_logo_v3',
    filename: 'brand-logo-v3.png',
    kind: 'image',
    bytes: 48_512,
    uploaded_at: { formatted_display: 'Mar 12, 2025' }
  },
  {
    asset_id: 'asset_hero_reel',
    filename: 'launch-reel.mp4',
    kind: 'video',
    bytes: 4_194_304,
    uploaded_at: { formatted_display: 'Mar 10, 2025' }
  },
  {
    // Bare-bones row — kind absent → 'image' default; bytes absent → '—';
    // uploaded_at as raw string → accepted alongside the wrapper shape.
    filename: 'legacy-asset.png',
    uploaded_at: '2025-02-01'
  }
]

const mockFetch = listCreatives as unknown as ReturnType<typeof vi.fn>

describe('Creatives.vue · asset library grid', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders the page header and the asset grid after a successful fetch (canonical `{ items }` wrapper)', async () => {
    mockFetch.mockResolvedValueOnce({
      data: { items: sampleAssets }
    })

    const wrapper = mount(Creatives)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.creatives.title')
    expect(wrapper.text()).toContain('portal.creatives.subtitle')

    // Data branch visible; loading / error / empty hidden.
    expect(wrapper.find('[data-testid="creatives-grid"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="creatives-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="creatives-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="creatives-empty"]').exists()).toBe(false)

    const cards = wrapper.findAll('[data-testid="creatives-card"]')
    expect(cards).toHaveLength(3)

    // Card 1 · image · 48 KB · pre-formatted date.
    expect(cards[0].text()).toContain('image')
    expect(cards[0].text()).toContain('brand-logo-v3.png')
    expect(cards[0].text()).toContain('47 KB') // round(48512/1024) = 47
    expect(cards[0].text()).toContain('Mar 12, 2025')

    // Card 2 · video kind surfaces.
    expect(cards[1].text()).toContain('video')
    expect(cards[1].text()).toContain('launch-reel.mp4')
    expect(cards[1].text()).toContain('4096 KB') // round(4194304/1024) = 4096

    // Card 3 · bare row — kind falls back to 'image', size falls back
    // to em-dash, uploaded_at accepts raw ISO string.
    expect(cards[2].text()).toContain('image')
    expect(cards[2].text()).toContain('legacy-asset.png')
    expect(cards[2].text()).toContain('—')
    expect(cards[2].text()).toContain('2025-02-01')
  })

  it('normalises a bare-array response (defensive fallback)', async () => {
    mockFetch.mockResolvedValueOnce({ data: sampleAssets })

    const wrapper = mount(Creatives)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="creatives-card"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('brand-logo-v3.png')
  })

  it('shows the error branch when fetch rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))

    const wrapper = mount(Creatives)
    await flushPromises()

    expect(wrapper.find('[data-testid="creatives-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="creatives-grid"]').exists()).toBe(false)
  })

  it('shows the empty-state placeholder when the merchant has no uploads', async () => {
    mockFetch.mockResolvedValueOnce({ data: { items: [] } })

    const wrapper = mount(Creatives)
    await flushPromises()

    expect(wrapper.find('[data-testid="creatives-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No uploads yet')
    expect(wrapper.find('[data-testid="creatives-grid"]').exists()).toBe(false)
  })
})
