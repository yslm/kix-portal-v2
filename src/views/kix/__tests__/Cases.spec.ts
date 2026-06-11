/**
 * Cases.vue render test — exercises the four state branches of the Case
 * Studio prospects grid: loaded (canonical `{ prospects }` wrapper — the
 * shape `/api/v1/portal-admin/case-studio/prospects` actually returns
 * per portal.html line 8466 and `app/routers/case_studio.py` line 91),
 * bare-array defensive fallback, error, and empty.
 *
 * Same fixture / stubbing shape as Templates.spec.ts — `t(key) => key`
 * stub, no brand-id stub needed because Case Studio is platform-internal
 * (no `?brand=` param, no `get_current_brand` dependency). The actual
 * translation pipeline is covered by
 * `src/locales/__tests__/i18n-smoke.spec.ts`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/cases', () => ({
  listCases: vi.fn()
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import Cases from '../Cases.vue'
import { listCases } from '@/api/portal-admin/cases'

// Schema mirrors the per-prospect fields the legacy renderer reads at
// portal.html line 8479-8487 (prospect_id · company_name · primary_url ·
// tagline · research_status).
const sampleProspects = [
  {
    prospect_id: 'nana',
    company_name: 'Nana',
    primary_url: 'https://nana.sa',
    tagline: 'Saudi q-commerce leader · 600+ SKUs · 30-min delivery',
    research_status: 'complete'
  },
  {
    prospect_id: 'starbucks_sg',
    company_name: 'Starbucks SG',
    primary_url: 'https://starbucks.com.sg',
    tagline: '',
    // research_status='draft' → 'draft' StatusBadge mapping (gray pill).
    research_status: 'draft'
  },
  {
    // Bare-bones entry — name falls back to prospect_id per the
    // defensive fallback chain in displayName().
    prospect_id: 'unknown_co'
  }
]

describe('Cases.vue · prospects grid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the page header and the prospects grid after a successful fetch (canonical `{ prospects }` wrapper)', async () => {
    ;(listCases as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { prospects: sampleProspects }
    })

    const wrapper = mount(Cases)
    await flushPromises()

    expect(wrapper.text()).toContain('portal.cases.title')
    expect(wrapper.text()).toContain('portal.cases.subtitle')

    // Data branch visible; loading / error / empty hidden.
    expect(wrapper.find('[data-testid="cases-grid"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="cases-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cases-error"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cases-empty"]').exists()).toBe(false)

    const cards = wrapper.findAll('[data-testid="case-card"]')
    expect(cards).toHaveLength(3)

    // Card 1: complete research → 'active' badge mapping (green pill).
    expect(cards[0].text()).toContain('Nana')
    expect(cards[0].text()).toContain('https://nana.sa')
    expect(cards[0].text()).toContain('Saudi q-commerce leader')
    expect(cards[0].text()).toContain('active')

    // Card 2: draft research → 'draft' badge mapping; empty tagline
    // not rendered (v-if).
    expect(cards[1].text()).toContain('Starbucks SG')
    expect(cards[1].text()).toContain('draft')
    expect(cards[1].text()).not.toContain('Saudi q-commerce leader')

    // Card 3: bare prospect_id — title falls back to prospect_id; no
    // research_status → no badge (v-if suppresses it).
    expect(cards[2].text()).toContain('unknown_co')
    expect(cards[2].text()).not.toContain('active')
    expect(cards[2].text()).not.toContain('draft')
    expect(cards[2].text()).not.toContain('pending')
  })

  it('normalises a bare-array response (defensive fallback)', async () => {
    ;(listCases as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleProspects
    })

    const wrapper = mount(Cases)
    await flushPromises()

    expect(wrapper.findAll('[data-testid="case-card"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('Nana')
  })

  it('shows the error branch when fetch rejects', async () => {
    ;(listCases as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('network down')
    )

    const wrapper = mount(Cases)
    await flushPromises()

    expect(wrapper.find('[data-testid="cases-error"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.text()).toContain('network down')
    expect(wrapper.find('[data-testid="cases-grid"]').exists()).toBe(false)
  })

  it('shows the empty-state placeholder when the catalog has no prospects', async () => {
    ;(listCases as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { prospects: [] }
    })

    const wrapper = mount(Cases)
    await flushPromises()

    expect(wrapper.find('[data-testid="cases-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No prospects yet')
    expect(wrapper.find('[data-testid="cases-grid"]').exists()).toBe(false)
  })
})
