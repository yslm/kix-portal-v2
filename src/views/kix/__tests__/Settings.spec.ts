/**
 * Settings.vue render test — exercises the loaded/error branches of the
 * brand-profile sub-section. Uses bare `t(key) => key` to avoid spinning up
 * the full vue-i18n setup; the actual translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/settings', () => ({
  fetchBrandProfile: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Settings from '../Settings.vue'
import { fetchBrandProfile } from '@/api/portal-admin/settings'

const sampleProfile = {
  brand_name: 'Test Brand',
  business_type: 'company',
  contact_email: 'ops@test-brand.com',
  contact_phone: '+65 6555 0001',
  tax_id: '201912345R',
  country: 'SG',
  city: 'Singapore',
  website_url: 'https://test-brand.com',
  logo_url: 'https://cdn.example.com/logo.png'
}

describe('Settings.vue · brand-profile section', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header and the brand profile after a successful fetch', async () => {
    ;(fetchBrandProfile as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { profile: sampleProfile }
    })

    const wrapper = mount(Settings)
    await flushPromises()

    // page header uses i18n keys; our t-stub returns the key
    expect(wrapper.text()).toContain('portal.settings.title')
    expect(wrapper.text()).toContain('portal.settings.subtitle')
    expect(wrapper.text()).toContain('portal.settings.profile.brand')

    // profile data renders
    expect(wrapper.text()).toContain('Test Brand')
    expect(wrapper.text()).toContain('company')
    expect(wrapper.text()).toContain('ops@test-brand.com')
    expect(wrapper.text()).toContain('+65 6555 0001')
    expect(wrapper.text()).toContain('201912345R')
    expect(wrapper.text()).toContain('SG')
    expect(wrapper.text()).toContain('Singapore')
    expect(wrapper.text()).toContain('https://test-brand.com')
    expect(wrapper.find('[data-testid="brand-profile-card"]').exists()).toBe(true)
  })

  it('shows the error branch when fetch rejects', async () => {
    ;(fetchBrandProfile as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom')
    )

    const wrapper = mount(Settings)
    await flushPromises()

    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('boom')
    expect(wrapper.find('[data-testid="brand-profile-card"]').exists()).toBe(false)
  })

  it('shows the empty branch when profile object is empty', async () => {
    ;(fetchBrandProfile as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { profile: {} }
    })

    const wrapper = mount(Settings)
    await flushPromises()

    expect(wrapper.text()).toContain('No brand profile data yet.')
    expect(wrapper.find('[data-testid="brand-profile-card"]').exists()).toBe(false)
  })
})
