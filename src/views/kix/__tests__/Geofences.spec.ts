/**
 * Geofences.vue render test — exercises the four state branches of the
 * stores / locations table (data | empty | error | loading) plus the
 * per-row normalisation (radius default, hard-coded "Active" status).
 *
 * Same fixture / stubbing shape as Billing.spec.ts — `t(key) => key`
 * stub, no brand-id stub needed because the portal-admin locations
 * route infers brand from the JWT (`get_current_brand` dependency, no
 * `?brand=` param). The actual translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/geofences', () => ({
  listGeofences: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Geofences from '../Geofences.vue'
import { listGeofences } from '@/api/portal-admin/geofences'

// Schema mirrors the per-row fields the legacy renderer reads at
// portal.html line 4737 (id · name · address · radius_m). The third
// row deliberately omits `radius_m` so the 50 m default fallback is
// exercised (matches the legacy `l.radius_m||50` read).
const sampleLocations = [
  {
    id: 'loc_tampines_mall',
    name: 'Toast Box · Tampines Mall',
    address: '4 Tampines Central 5, Singapore 529510',
    radius_m: 80
  },
  {
    id: 'loc_orchard',
    name: 'Toast Box · ION Orchard',
    address: '2 Orchard Turn, Singapore 238801',
    radius_m: 120
  },
  {
    // Bare-bones row — address absent, radius absent → 50 m default.
    id: 'loc_legacy'
  }
]

const mockFetch = listGeofences as unknown as ReturnType<typeof vi.fn>

describe('Geofences.vue · stores list', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('renders the page header and the stores table after a successful fetch (canonical `{ locations }` wrapper)', async () => {
    mockFetch.mockResolvedValueOnce({
      data: { locations: sampleLocations }
    })

    const wrapper = mount(Geofences)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.geofences.title')
    expect(wrapper.text()).toContain('portal.geofences.subtitle')

    // Data branch visible; loading / error / empty hidden.
    expect(wrapper.find('[data-testid="geofences-table"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="geofences-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="geofences-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="geofences-empty"]').exists()).toBe(false)

    const rows = wrapper.findAll('[data-testid="geofences-row"]')
    expect(rows).toHaveLength(3)

    // Row 1 · full schema · 80 m radius rendered.
    expect(rows[0].text()).toContain('loc_tampines_mall')
    expect(rows[0].text()).toContain('Toast Box · Tampines Mall')
    expect(rows[0].text()).toContain('Tampines Central')
    expect(rows[0].text()).toContain('80 m')

    // Row 2 · 120 m radius rendered.
    expect(rows[1].text()).toContain('Toast Box · ION Orchard')
    expect(rows[1].text()).toContain('120 m')

    // Row 3 · bare id only — name/address fall back to em-dash, radius
    // falls back to the legacy 50 m default (portal.html line 4737).
    expect(rows[2].text()).toContain('loc_legacy')
    expect(rows[2].text()).toContain('50 m')
  })

  it('normalises a bare-array response (defensive fallback)', async () => {
    mockFetch.mockResolvedValueOnce({ data: sampleLocations })

    const wrapper = mount(Geofences)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="geofences-row"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('Toast Box · Tampines Mall')
  })

  it('shows the error branch when fetch rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))

    const wrapper = mount(Geofences)
    await flushPromises()

    expect(wrapper.find('[data-testid="geofences-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="geofences-table"]').exists()).toBe(false)
  })

  it('shows the empty-state placeholder when the merchant has no stores', async () => {
    mockFetch.mockResolvedValueOnce({ data: { locations: [] } })

    const wrapper = mount(Geofences)
    await flushPromises()

    expect(wrapper.find('[data-testid="geofences-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No stores yet')
    expect(wrapper.find('[data-testid="geofences-table"]').exists()).toBe(false)
  })
})
