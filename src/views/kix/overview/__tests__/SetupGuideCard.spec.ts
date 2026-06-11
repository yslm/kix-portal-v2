/**
 * SetupGuideCard.vue render test — covers the three meaningful render
 * branches for the Shopify-style onboarding checklist:
 *
 *   1. Some steps incomplete  → card renders with header + progress + rows
 *   2. All steps done         → card hidden (legacy "fade-out" behaviour at
 *                               portal.html line 4207)
 *   3. Fetch error            → card hidden (legacy non-critical "additive"
 *                               handling at portal.html line 4222)
 *
 * Element Plus components (el-card, el-progress, el-button) are stubbed
 * locally so the test doesn't need the full art-design-pro plugin chain.
 * vue-router's `useRouter` is stubbed to a noop push spy — Task 1 doesn't
 * assert click-through navigation; the existence of the CTA is enough.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/overview', () => ({
  fetchSetupGuide: vi.fn()
}))

const pushSpy = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushSpy })
}))

import SetupGuideCard from '../SetupGuideCard.vue'
import { fetchSetupGuide } from '@/api/portal-admin/overview'

const stubs = {
  'el-card': {
    template: '<div data-stub="el-card"><slot name="header" /><slot /></div>'
  },
  'el-progress': {
    template: '<div data-stub="el-progress" />',
    props: ['percentage', 'showText']
  },
  'el-button': {
    template: '<button data-stub="el-button" @click="$emit(\'click\')"><slot /></button>',
    emits: ['click']
  }
}

describe('SetupGuideCard.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders header, progress count, step labels, and per-step CTAs', async () => {
    ;(fetchSetupGuide as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        brand_id: 'demo_brand',
        steps: [
          { key: 'build_game', done: true, view: 'games' },
          { key: 'set_prize', done: false, view: 'prizes' },
          { key: 'add_store_qr', done: false, view: 'geofences' }
        ],
        done: 1,
        total: 3,
        complete: false,
        source: 'test'
      }
    })

    const wrapper = mount(SetupGuideCard, { global: { stubs } })
    await flushPromises()

    // Header copy mirrors the legacy portal.html line 1326
    expect(wrapper.text()).toContain('Set up your shop')
    expect(wrapper.text()).toContain('3 steps to your first redemption')

    // Progress counter reads wire `done` / `total`
    expect(wrapper.find('[data-testid="setup-guide-progress"]').text()).toBe('1 / 3')
    expect(wrapper.find('[data-testid="setup-guide-bar"]').exists()).toBe(true)

    // English labels resolved from STEP_LABELS (verbatim from
    // KIX_SETUP_STEPS at portal.html line 4151-4156)
    expect(wrapper.text()).toContain('Create your first game')
    expect(wrapper.text()).toContain('Set the prize (voucher codes auto-generate)')
    expect(wrapper.text()).toContain('Add your store & print the QR poster')

    // Done step gets a check glyph; not-done steps get a CTA
    const buttons = wrapper.findAll('[data-stub="el-button"]')
    expect(buttons).toHaveLength(2)
    expect(buttons[0].text()).toContain('Continue')

    // Click the first CTA → router.push fired with the mapped v2 route
    await buttons[0].trigger('click')
    expect(pushSpy).toHaveBeenCalledWith('/prizes')
  })

  it('hides the card when all steps are done (complete=true)', async () => {
    ;(fetchSetupGuide as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {
        brand_id: 'demo_brand',
        steps: [{ key: 'build_game', done: true, view: 'games' }],
        done: 1,
        total: 1,
        complete: true
      }
    })

    const wrapper = mount(SetupGuideCard, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="setup-guide-card"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Set up your shop')
  })

  it('hides the card when the fetch errors (non-critical UI)', async () => {
    ;(fetchSetupGuide as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('boom')
    )

    const wrapper = mount(SetupGuideCard, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="setup-guide-card"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Set up your shop')
  })
})
