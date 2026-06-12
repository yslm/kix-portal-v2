/**
 * CampaignTable.vue render test — covers the four meaningful branches:
 *
 *   1. Bare-array response       → card renders with one row per campaign
 *   2. Wrapper-shape response    → { campaigns: [...] } normalised to rows
 *   3. Fetch error               → card hidden (non-critical fail-soft)
 *   4. Empty array response      → card hidden (isReady gate)
 *
 * ElTable + ElTableColumn + RouterLink are stubbed locally so the test
 * doesn't need the full art-design-pro / vue-router plugin chain. The
 * stub renders each row's slot content as text, which is what we assert.
 *
 * Note: ElTable renders rows via scoped slots internally. In the stub we
 * simulate this by rendering a <div> per data row and invoking the
 * ElTableColumn default slot with { row } — enough to assert that the
 * normalised Campaign fields reach the rendered output.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/campaigns', () => ({
  listCampaigns: vi.fn()
}))

vi.mock('vue-router', () => ({
  RouterLink: {
    template: '<a data-stub="router-link" :href="to"><slot /></a>',
    props: ['to']
  },
  useRouter: () => ({ push: vi.fn() })
}))

import CampaignTable from '../CampaignTable.vue'
import { listCampaigns } from '@/api/portal-admin/campaigns'

/**
 * Stub strategy: ElTable iterates `data` rows and for each row renders a
 * dedicated wrapper. Inside each wrapper we provide `row` via Vue's provide
 * so that ElTableColumn stubs can inject it — this is the cleanest way to
 * thread the scoped-slot `{ row }` down without the full Element Plus render
 * tree.
 */
import { defineComponent, provide, inject, h } from 'vue'

const ROW_KEY = Symbol('el-table-row')

const ElTableStub = defineComponent({
  name: 'ElTable',
  props: ['data', 'border', 'stripe', 'headerCellStyle', 'showHeader', 'style'],
  setup(props, { slots }) {
    return () =>
      h('div', { 'data-stub': 'el-table' }, [
        (props.data ?? []).map((row: unknown, idx: number) =>
          h(
            defineComponent({
              setup(_, { slots: innerSlots }) {
                provide(ROW_KEY, row)
                return () =>
                  h('div', { 'data-testid': `campaign-row-${idx}` }, innerSlots.default?.() ?? [])
              }
            }),
            null,
            slots
          )
        )
      ])
  }
})

const ElTableColumnStub = defineComponent({
  name: 'ElTableColumn',
  props: ['label', 'prop', 'width', 'minWidth', 'align', 'headerCellStyle'],
  setup(_, { slots }) {
    const row = inject(ROW_KEY)
    return () => h('div', { 'data-stub': 'el-table-column' }, slots.default?.({ row }) ?? [])
  }
})

const stubs = {
  ElTable: ElTableStub,
  ElTableColumn: ElTableColumnStub,
  StatusBadge: {
    template: '<span data-stub="status-badge" :data-status="status">{{ status }}</span>',
    props: ['status']
  },
  RouterLink: {
    template: '<a data-stub="router-link" :data-to="to"><slot /></a>',
    props: ['to']
  }
}

const sampleCampaigns = [
  {
    id: 'c-001',
    name: '茶物语·周末拉新',
    status: 'active',
    objective: 'Acquisition',
    spend_str: 'S$28.5',
    impressions: 3200,
    conversions: 18,
    cpa_str: 'S$1.58',
    ctr_pct: 3.2
  },
  {
    id: 'c-002',
    name: 'Lunch spin',
    status: 'paused',
    objective: 'Retention',
    spend_sgd: 45.0,
    impressions: 1500,
    conversions: 9,
    cpa_str: 'S$5.00',
    ctr_pct: '2.1%'
  }
]

describe('CampaignTable.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a row per campaign with name / spend / impressions / conversions / cpa / ctr on resolve (bare array)', async () => {
    ;(listCampaigns as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleCampaigns
    })

    const wrapper = mount(CampaignTable, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="campaign-table-card"]').exists()).toBe(true)

    const text = wrapper.text()

    // Row 1
    expect(text).toContain('茶物语·周末拉新')
    expect(text).toContain('Acquisition')
    expect(text).toContain('S$28.5')
    expect(text).toContain('3200')
    expect(text).toContain('18')
    expect(text).toContain('S$1.58')
    expect(text).toContain('3.2%')

    // Row 2: spend_sgd formatted via fmtSgd
    expect(text).toContain('Lunch spin')
    expect(text).toContain('S$45')
    expect(text).toContain('1500')
    expect(text).toContain('S$5.00')
    // ctr_pct is already a string "2.1%" — passed through directly
    expect(text).toContain('2.1%')

    // Status badge rendered for row 1
    const badges = wrapper.findAll('[data-stub="status-badge"]')
    expect(badges.length).toBeGreaterThanOrEqual(1)
    expect(badges[0].attributes('data-status')).toBe('active')
  })

  it('normalises the { campaigns: [...] } wrapper shape', async () => {
    ;(listCampaigns as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { campaigns: sampleCampaigns }
    })

    const wrapper = mount(CampaignTable, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="campaign-table-card"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('茶物语·周末拉新')
    expect(wrapper.text()).toContain('Lunch spin')
  })

  it('normalises the { items: [...] } wrapper shape', async () => {
    ;(listCampaigns as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { items: sampleCampaigns }
    })

    const wrapper = mount(CampaignTable, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="campaign-table-card"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('茶物语·周末拉新')
    expect(wrapper.text()).toContain('Lunch spin')
  })

  it('hides the card when the fetch rejects (non-critical UI)', async () => {
    ;(listCampaigns as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('network error')
    )

    const wrapper = mount(CampaignTable, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="campaign-table-card"]').exists()).toBe(false)
  })

  it('hides the card when the resolved array is empty', async () => {
    ;(listCampaigns as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: []
    })

    const wrapper = mount(CampaignTable, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="campaign-table-card"]').exists()).toBe(false)
  })

  it('renders "View all →" link pointing to /campaigns', async () => {
    ;(listCampaigns as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: sampleCampaigns
    })

    const wrapper = mount(CampaignTable, { global: { stubs } })
    await flushPromises()

    const link = wrapper.find('[data-testid="campaign-table-view-all"]')
    expect(link.exists()).toBe(true)
    expect(link.text()).toContain('View all')
    expect(link.attributes('data-to')).toBe('/campaigns')
  })

  it('renders "—" for missing optional fields', async () => {
    ;(listCampaigns as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: [{ id: 'c-003', name: 'Bare minimum', status: 'draft' }]
    })

    const wrapper = mount(CampaignTable, { global: { stubs } })
    await flushPromises()

    // spend, impressions, conversions, cpa, ctr all absent → '—'
    const text = wrapper.text()
    expect(text).toContain('Bare minimum')
    // At least some '—' placeholders rendered
    expect((text.match(/—/g) ?? []).length).toBeGreaterThanOrEqual(4)
  })
})
