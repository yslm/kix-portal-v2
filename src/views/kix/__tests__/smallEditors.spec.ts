/**
 * Small editor dialogs — TierEditorDialog / AddStoreDialog / NewCaseDialog.
 * Wiring + validation tests; the PUT/POST bodies are asserted here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/vip-tiers', () => ({ saveLoyaltyTiers: vi.fn() }))
vi.mock('@/api/portal-admin/geofences', () => ({ registerStore: vi.fn() }))
vi.mock('@/api/portal-admin/cases', () => ({ createProspect: vi.fn() }))
vi.mock('@/utils/kix/resolveBrandId', () => ({ resolveBrandId: () => '42' }))

import TierEditorDialog from '../vip-tiers/TierEditorDialog.vue'
import AddStoreDialog from '../geofences/AddStoreDialog.vue'
import NewCaseDialog from '../cases/NewCaseDialog.vue'
import { saveLoyaltyTiers } from '@/api/portal-admin/vip-tiers'
import { registerStore } from '@/api/portal-admin/geofences'
import { createProspect } from '@/api/portal-admin/cases'

const mSave = saveLoyaltyTiers as unknown as ReturnType<typeof vi.fn>
const mStore = registerStore as unknown as ReturnType<typeof vi.fn>
const mCase = createProspect as unknown as ReturnType<typeof vi.fn>

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
  ElInputNumber: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<input type="number" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />'
  },
  ElSelect: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>'
  },
  ElOption: { props: ['label', 'value'], template: '<option :value="value">{{ label }}</option>' },
  ElSlider: { props: ['modelValue'], template: '<input type="range" :value="modelValue" />' },
  ElButton: {
    props: ['loading'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>'
  }
}

beforeEach(() => vi.clearAllMocks())

describe('TierEditorDialog', () => {
  const tiers = [
    { name: 'Bronze', min_xp: 0, perk: '5% off' },
    { name: 'Silver', min_xp: 500, perk: 'free drink' }
  ]
  it('blocks an invalid ladder (first tier not at 0)', async () => {
    const bad = [{ name: 'A', min_xp: 100, perk: '' }]
    const w = mount(TierEditorDialog, {
      props: { modelValue: true, tiers: bad },
      global: { stubs }
    })
    await w.find('[data-testid="tier-save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="tier-errors"]').exists()).toBe(true)
    expect(mSave).not.toHaveBeenCalled()
  })
  it('PUTs a valid ladder', async () => {
    mSave.mockResolvedValueOnce({ data: {} })
    const w = mount(TierEditorDialog, { props: { modelValue: true, tiers }, global: { stubs } })
    await w.find('[data-testid="tier-save"]').trigger('click')
    await flushPromises()
    expect(mSave).toHaveBeenCalledWith([
      { name: 'Bronze', min_xp: 0, perk: '5% off' },
      { name: 'Silver', min_xp: 500, perk: 'free drink' }
    ])
    expect(w.emitted('saved')).toBeTruthy()
  })
  it('add/remove rows mutate the ladder', async () => {
    const w = mount(TierEditorDialog, { props: { modelValue: true, tiers }, global: { stubs } })
    await w.find('[data-testid="tier-add"]').trigger('click')
    expect(w.findAll('[data-testid="tier-row"]')).toHaveLength(3)
    await w.find('[data-testid="tier-remove-2"]').trigger('click')
    expect(w.findAll('[data-testid="tier-row"]')).toHaveLength(2)
  })
})

describe('AddStoreDialog', () => {
  it('requires name + address before POST', async () => {
    const w = mount(AddStoreDialog, { props: { modelValue: true }, global: { stubs } })
    await w.find('[data-testid="store-save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="store-error"]').exists()).toBe(true)
    expect(mStore).not.toHaveBeenCalled()
  })
  it('POSTs name + geocoded_address + radius', async () => {
    mStore.mockResolvedValueOnce({ data: { ok: true, store_id: 'loc_1' } })
    const w = mount(AddStoreDialog, { props: { modelValue: true }, global: { stubs } })
    await w.find('[data-testid="store-name"]').setValue('Orchard')
    await w.find('[data-testid="store-address"]').setValue('391 Orchard Rd')
    await w.find('[data-testid="store-save"]').trigger('click')
    await flushPromises()
    expect(mStore).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Orchard', geocoded_address: '391 Orchard Rd' })
    )
    expect(w.emitted('saved')).toBeTruthy()
  })
})

describe('NewCaseDialog', () => {
  it('requires a valid http URL', async () => {
    const w = mount(NewCaseDialog, { props: { modelValue: true }, global: { stubs } })
    await w.find('[data-testid="case-company"]').setValue('Acme')
    await w.find('[data-testid="case-url"]').setValue('not-a-url')
    await w.find('[data-testid="case-save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="case-error"]').exists()).toBe(true)
    expect(mCase).not.toHaveBeenCalled()
  })
  it('POSTs a valid prospect', async () => {
    mCase.mockResolvedValueOnce({ data: { prospect_id: 'p1' } })
    const w = mount(NewCaseDialog, { props: { modelValue: true }, global: { stubs } })
    await w.find('[data-testid="case-company"]').setValue('Acme')
    await w.find('[data-testid="case-url"]').setValue('https://acme.com')
    await w.find('[data-testid="case-save"]').trigger('click')
    await flushPromises()
    expect(mCase).toHaveBeenCalledWith(
      expect.objectContaining({ company_name: 'Acme', primary_url: 'https://acme.com' })
    )
    expect(w.emitted('created')).toBeTruthy()
  })
})
