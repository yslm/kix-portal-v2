/**
 * Storefront.vue render test — rebuilt view (art-design-pro, Week 8n).
 * Analytics KPI strip + preview card + share/embed card. Heavy logic
 * unit-tested in storefront/__tests__/storefrontModel.spec.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'

vi.mock('@/api/portal-admin/storefront', () => ({ fetchStorefront: vi.fn() }))
vi.mock('@/utils/kix/resolveBrandId', () => ({ resolveBrandId: () => 'demo' }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import Storefront from '../Storefront.vue'
import { fetchStorefront } from '@/api/portal-admin/storefront'

const ElCardStub = defineComponent({
  name: 'ElCard',
  setup:
    (_, { slots }) =>
    () => [slots.header?.(), slots.default?.()]
})
const stubs = {
  ElCard: ElCardStub,
  ArtSvgIcon: { template: '<i />', props: ['icon'] },
  ElButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' }
}

const profile = {
  display_name: 'Toast Box',
  bio: 'Best kaya toast in town',
  brand_color: '#FF8800',
  follower_count: 1240,
  avg_rating: 4.67,
  rating_count: 89,
  featured_games: ['g1', 'g2']
}
const mockFetch = fetchStorefront as unknown as ReturnType<typeof vi.fn>
const mountView = () => mount(Storefront, { global: { stubs } })

describe('Storefront.vue · rebuilt view', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the analytics KPI strip from real fields', async () => {
    mockFetch.mockResolvedValueOnce({ data: profile })
    const w = mountView()
    await flushPromises()
    expect(w.text()).toContain('portal.storefront.title')
    const k = w.find('[data-testid="storefront-kpis"]')
    expect(k.text()).toContain('1,240') // followers
    expect(k.text()).toContain('4.7') // avg rating
    expect(k.text()).toContain('89') // ratings
  })

  it('renders preview (name/bio/avatar) + share blocks', async () => {
    mockFetch.mockResolvedValueOnce({ data: profile })
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="storefront-display-name"]').text()).toBe('Toast Box')
    expect(w.find('[data-testid="storefront-avatar"]').text()).toBe('T')
    expect(w.find('[data-testid="storefront-public-url"]').text()).toContain('/sf/demo')
    expect(w.find('[data-testid="storefront-embed-snippet"]').exists()).toBe(true)
  })

  it('shows the not-configured hint when profile is null (404)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('404 not found'))
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="storefront-empty-hint"]').exists()).toBe(true)
    // still renders the share URL keyed on the brand id alone
    expect(w.find('[data-testid="storefront-public-url"]').text()).toContain('/sf/demo')
  })

  it('shows the error state for a non-404 failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('500 server error'))
    const w = mountView()
    await flushPromises()
    expect(w.find('[data-testid="storefront-error"]').exists()).toBe(true)
  })
})
