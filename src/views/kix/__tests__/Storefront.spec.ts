/**
 * Storefront.vue render test — exercises the three state branches of
 * the preview card (data | error | empty/404 fallback) plus the
 * always-rendered Public URL + Embed snippet blocks.
 *
 * The storefront fetch is mocked; `resolveBrandId` is stubbed to a
 * constant so the URL + embed snippet computeds resolve to known
 * values. `window.location.origin` is the JSDOM default
 * `http://localhost:3000` for these assertions.
 *
 * The `t(key) => key` stub matches the convention used in
 * Templates.spec.ts / Cases.spec.ts / VipTiers.spec.ts — the real
 * translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/storefront', () => ({
  fetchStorefront: vi.fn()
}))

vi.mock('@/utils/kix/resolveBrandId', () => ({
  resolveBrandId: () => 'acme'
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Storefront from '../Storefront.vue'
import { fetchStorefront } from '@/api/portal-admin/storefront'

// Schema mirrors the merged shape `get_storefront` returns
// (storefront.py line 479-484): `_profile_from_hash` fields +
// follower_count + avg_rating + rating_count.
const sampleProfile = {
  brand_id: 'acme',
  display_name: 'Acme Coffee',
  bio: 'Best espresso in town · since 1998',
  hero_image_url: null,
  logo_url: null,
  brand_color: '#FF6600',
  contact: {},
  featured_games: ['bubble-pop'],
  featured_vouchers: [],
  show_stores: true,
  socials: {},
  custom_sections: [],
  country: 'SG',
  category: 'food',
  created_at: 1700000000,
  updated_at: 1700000000,
  public_url: '/landing/storefront.html?b=acme',
  follower_count: 142,
  avg_rating: 4.6,
  rating_count: 38
}

const mockFetch = fetchStorefront as unknown as ReturnType<typeof vi.fn>

describe('Storefront.vue · preview + public URL + embed', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders the page header, preview card, public URL, and embed snippet after a successful fetch', async () => {
    mockFetch.mockResolvedValueOnce({ data: sampleProfile })

    const wrapper = mount(Storefront)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.storefront.title')
    expect(wrapper.text()).toContain('portal.storefront.subtitle')

    // Preview branch visible; loading / error hidden.
    expect(wrapper.find('[data-testid="storefront-preview"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="storefront-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="storefront-error"]').exists()).toBe(false)

    // Display name + bio come from the server payload.
    expect(wrapper.find('[data-testid="storefront-display-name"]').text()).toBe('Acme Coffee')
    expect(wrapper.find('[data-testid="storefront-bio"]').text()).toBe(
      'Best espresso in town · since 1998'
    )
    // Avatar letter = first char of display_name, uppercased.
    expect(wrapper.find('[data-testid="storefront-avatar"]').text()).toBe('A')
    // Brand color applied as inline style. JSDOM normalises the
    // `#FF6600` hex into `rgb(255, 102, 0)` when it serialises the
    // style attribute back out, so we assert against the rgb form.
    expect(wrapper.find('[data-testid="storefront-avatar"]').attributes('style')).toContain(
      'rgb(255, 102, 0)'
    )

    // Default-profile hint NOT shown when is_default is absent/false.
    expect(wrapper.find('[data-testid="storefront-default-hint"]').exists()).toBe(false)

    // Public URL uses `/sf/{brandId}` short form.
    const url = wrapper.find('[data-testid="storefront-public-url"]').text()
    expect(url).toContain('/sf/acme')

    // Embed snippet contains the brand id in the iframe src.
    const snippet = wrapper
      .find('[data-testid="storefront-embed-snippet"]')
      .attributes('value') as string
    expect(snippet).toContain('<iframe')
    expect(snippet).toContain('brand=acme')
    expect(snippet).toContain('embed=1')
    expect(snippet).toContain('channel=website')

    // Open-public-page CTA always rendered in the header.
    expect(wrapper.find('[data-testid="storefront-open-public"]').exists()).toBe(true)
  })

  it('surfaces the `is_default` hint when the profile is server-synthesised', async () => {
    mockFetch.mockResolvedValueOnce({
      data: { ...sampleProfile, is_default: true }
    })

    const wrapper = mount(Storefront)
    await flushPromises()

    expect(wrapper.find('[data-testid="storefront-default-hint"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Default profile')
  })

  it('shows the error branch when the fetch rejects with a non-404 error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))

    const wrapper = mount(Storefront)
    await flushPromises()

    expect(wrapper.find('[data-testid="storefront-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="storefront-preview"]').exists()).toBe(false)
  })

  it('still renders the preview + URL + embed when the fetch 404s (genuinely unknown brand fallback)', async () => {
    // Mirrors the storefront.py line 195 "genuinely unknown brand"
    // path. `_load_profile()` returns None, FastAPI raises 404 — we
    // detect that and fall back to a preview keyed on the brand id
    // alone so the merchant still gets a copy-able URL + embed.
    mockFetch.mockRejectedValueOnce(new Error('Request failed with status code 404'))

    const wrapper = mount(Storefront)
    await flushPromises()

    // Error branch NOT shown — 404 routes to fallback, not error.
    expect(wrapper.find('[data-testid="storefront-error"]').exists()).toBe(false)
    // Preview still renders (with fallback display name = brand id).
    expect(wrapper.find('[data-testid="storefront-preview"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="storefront-display-name"]').text()).toBe('acme')
    // Empty-hint copy surfaced so the merchant knows it's a fallback.
    expect(wrapper.find('[data-testid="storefront-empty-hint"]').exists()).toBe(true)

    // URL + embed still rendered, keyed on brand id.
    expect(wrapper.find('[data-testid="storefront-public-url"]').text()).toContain('/sf/acme')
    const snippet = wrapper
      .find('[data-testid="storefront-embed-snippet"]')
      .attributes('value') as string
    expect(snippet).toContain('brand=acme')
  })

  it('falls back to the legacy tagline when the profile has no bio', async () => {
    mockFetch.mockResolvedValueOnce({
      data: { ...sampleProfile, bio: '' }
    })

    const wrapper = mount(Storefront)
    await flushPromises()

    // The fallback string matches portal.html line 2680.
    expect(wrapper.find('[data-testid="storefront-bio"]').text()).toContain(
      'Earn rewards every time you visit'
    )
  })
})
