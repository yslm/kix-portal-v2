/**
 * TopCampaignsTable.vue render test — Reports · Performance · "Top
 * campaigns by ROAS".
 *
 * Backend contract (GET /api/v1/portal-admin/reports/top-campaigns):
 *   { items: [{ name, spend_str?, spend_sgd?, conversions?, roas?,
 *               status? }], source, updated_at, empty_state_hint }
 *
 * Branches covered:
 *   1. { items: [...] } wrapper       → one row per campaign, ROAS column
 *   2. bare array (defensive)         → normalised to rows
 *   3. fetch error                    → card hidden (non-critical fail-soft)
 *   4. empty items                    → card hidden (isReady gate)
 *   5. null roas / conversions / spend → em-dash placeholders
 *
 * Mirrors the ElTable/ElTableColumn local-stub strategy used by the
 * Overview CampaignTable spec — ElTable iterates `data` rows and threads
 * the scoped-slot `{ row }` down to ElTableColumn via provide/inject.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/reports', () => ({
  fetchTopCampaigns: vi.fn()
}))

import { defineComponent, provide, inject, h } from 'vue'
import TopCampaignsTable from '../TopCampaignsTable.vue'
import { fetchTopCampaigns } from '@/api/portal-admin/reports'

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
                  h(
                    'div',
                    { 'data-testid': `top-campaign-row-${idx}` },
                    innerSlots.default?.() ?? []
                  )
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
  ElTableColumn: ElTableColumnStub
}

const sampleItems = [
  {
    name: 'Lunch spin · 200m geofence',
    spend_str: 'S$378',
    spend_sgd: 378.0,
    conversions: 87,
    roas: 6.4
  },
  {
    name: 'Scratch & win · breakfast',
    spend_str: 'S$214',
    spend_sgd: 214.0,
    conversions: 42,
    roas: 5.9
  }
]

const mockFetch = fetchTopCampaigns as unknown as ReturnType<typeof vi.fn>

describe('TopCampaignsTable.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a row per campaign with name / spend / conversions / ROAS ({ items } shape)', async () => {
    mockFetch.mockResolvedValueOnce({ data: { items: sampleItems } })

    const wrapper = mount(TopCampaignsTable, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="top-campaigns-card"]').exists()).toBe(true)

    const text = wrapper.text()
    expect(text).toContain('Lunch spin · 200m geofence')
    expect(text).toContain('S$378')
    expect(text).toContain('87')
    expect(text).toContain('6.4×')

    expect(text).toContain('Scratch & win · breakfast')
    expect(text).toContain('5.9×')
  })

  it('tolerates a bare array response', async () => {
    mockFetch.mockResolvedValueOnce({ data: sampleItems })

    const wrapper = mount(TopCampaignsTable, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="top-campaigns-card"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Lunch spin · 200m geofence')
  })

  it('hides the card when the fetch rejects (non-critical UI)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'))

    const wrapper = mount(TopCampaignsTable, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="top-campaigns-card"]').exists()).toBe(false)
  })

  it('hides the card when items is empty', async () => {
    mockFetch.mockResolvedValueOnce({ data: { items: [] } })

    const wrapper = mount(TopCampaignsTable, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="top-campaigns-card"]').exists()).toBe(false)
  })

  it('renders "—" for null roas / conversions / spend (real-brand honest nulls)', async () => {
    mockFetch.mockResolvedValueOnce({
      data: {
        items: [
          {
            name: 'Published, no attribution yet',
            spend_str: '—',
            spend_sgd: null,
            conversions: null,
            roas: null,
            status: 'live'
          }
        ]
      }
    })

    const wrapper = mount(TopCampaignsTable, { global: { stubs } })
    await flushPromises()

    const text = wrapper.text()
    expect(text).toContain('Published, no attribution yet')
    // spend "—" + conversions "—" + roas "—" → at least 3 placeholders
    expect((text.match(/—/g) ?? []).length).toBeGreaterThanOrEqual(3)
  })
})
