/**
 * NewAudienceDialog + AttributionCard wiring. Real contracts:
 * POST /portal/settings/audiences/{brand}, GET /reports/attribution.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/audiences', () => ({ createAudience: vi.fn() }))
vi.mock('@/api/portal-admin/reports', () => ({ fetchAttribution: vi.fn() }))

import NewAudienceDialog from '../audiences/NewAudienceDialog.vue'
import AttributionCard from '../reports/AttributionCard.vue'
import { createAudience } from '@/api/portal-admin/audiences'
import { fetchAttribution } from '@/api/portal-admin/reports'

const mCreate = createAudience as unknown as ReturnType<typeof vi.fn>
const mAttr = fetchAttribution as unknown as ReturnType<typeof vi.fn>

const stubs = {
  ElDialog: {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>'
  },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>'
  },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElButton: {
    props: ['loading'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>'
  },
  ElTable: {
    props: ['data'],
    template:
      '<table><tbody><tr v-for="(r,i) in data" :key="i" data-testid="attr-row"><td>{{ r.channel }}</td></tr></tbody><slot /></table>'
  },
  ElTableColumn: { template: '<span />' }
}

describe('NewAudienceDialog', () => {
  beforeEach(() => vi.clearAllMocks())
  it('requires a name', async () => {
    const w = mount(NewAudienceDialog, { props: { modelValue: true }, global: { stubs } })
    await w.find('[data-testid="aud-save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="aud-error"]').exists()).toBe(true)
    expect(mCreate).not.toHaveBeenCalled()
  })
  it('POSTs a valid audience', async () => {
    mCreate.mockResolvedValueOnce({ data: { ok: true, audience_id: 'aud_1' } })
    const w = mount(NewAudienceDialog, { props: { modelValue: true }, global: { stubs } })
    await w.find('[data-testid="aud-name"]').setValue('Weekend walk-ins')
    await w.find('[data-testid="aud-save"]').trigger('click')
    await flushPromises()
    expect(mCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Weekend walk-ins', source: 'custom' })
    )
    expect(w.emitted('created')).toBeTruthy()
  })
})

describe('AttributionCard', () => {
  beforeEach(() => vi.clearAllMocks())
  it('renders rows + refetches on window change', async () => {
    mAttr.mockResolvedValue({
      data: { window: '7d_click', items: [{ channel: 'QR', last_click: 100, linear: 80 }] }
    })
    const w = mount(AttributionCard, { global: { stubs } })
    await flushPromises()
    expect(w.find('[data-testid="attribution-card"]').exists()).toBe(true)
    expect(w.findAll('[data-testid="attr-row"]')).toHaveLength(1)
    expect(mAttr).toHaveBeenCalledWith('7d_click')
    // change window → refetch
    await w.find('[data-testid="attr-window"]').setValue('28d_click')
    await flushPromises()
    expect(mAttr).toHaveBeenCalledWith('28d_click')
  })
  it('self-hides when empty', async () => {
    mAttr.mockResolvedValue({ data: { items: [] } })
    const w = mount(AttributionCard, { global: { stubs } })
    await flushPromises()
    expect(w.find('[data-testid="attribution-card"]').exists()).toBe(false)
  })
})
