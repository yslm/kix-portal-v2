/**
 * Small editor dialogs (batch B) — TopUpDialog / PaymentMethodDialog /
 * StorefrontEditorDialog / UploadAssetDialog. Wiring + validation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/billing', () => ({ topupWallet: vi.fn(), addPaymentMethod: vi.fn() }))
vi.mock('@/api/portal-admin/storefront', () => ({ configureStorefront: vi.fn() }))
vi.mock('@/api/portal-admin/creatives', () => ({ uploadAsset: vi.fn() }))
vi.mock('@/utils/kix/resolveBrandId', () => ({ resolveBrandId: () => '42' }))

import TopUpDialog from '../billing/TopUpDialog.vue'
import PaymentMethodDialog from '../billing/PaymentMethodDialog.vue'
import StorefrontEditorDialog from '../storefront/StorefrontEditorDialog.vue'
import UploadAssetDialog from '../creatives/UploadAssetDialog.vue'
import { topupWallet, addPaymentMethod } from '@/api/portal-admin/billing'
import { configureStorefront } from '@/api/portal-admin/storefront'
import { uploadAsset } from '@/api/portal-admin/creatives'

const mTopup = topupWallet as unknown as ReturnType<typeof vi.fn>
const mPay = addPaymentMethod as unknown as ReturnType<typeof vi.fn>
const mSf = configureStorefront as unknown as ReturnType<typeof vi.fn>
const mUpload = uploadAsset as unknown as ReturnType<typeof vi.fn>

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
  ElButton: {
    props: ['loading'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>'
  }
}

beforeEach(() => vi.clearAllMocks())

describe('TopUpDialog', () => {
  it('rejects an out-of-range amount', async () => {
    const w = mount(TopUpDialog, { props: { modelValue: true }, global: { stubs } })
    await w.find('[data-testid="topup-amount"]').setValue('0')
    await w.find('[data-testid="topup-confirm"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="topup-error"]').exists()).toBe(true)
    expect(mTopup).not.toHaveBeenCalled()
  })
  it('tops up a valid amount', async () => {
    mTopup.mockResolvedValueOnce({ data: { balance_sgd: 200 } })
    const w = mount(TopUpDialog, { props: { modelValue: true }, global: { stubs } })
    await w.find('[data-testid="topup-preset-250"]').trigger('click')
    await w.find('[data-testid="topup-confirm"]').trigger('click')
    await flushPromises()
    expect(mTopup).toHaveBeenCalledWith(250)
    expect(w.emitted('done')).toBeTruthy()
  })
  it('surfaces the 402 KYC gate', async () => {
    mTopup.mockRejectedValueOnce({
      response: { status: 402, data: { detail: { error: 'payment_method_required' } } }
    })
    const w = mount(TopUpDialog, { props: { modelValue: true }, global: { stubs } })
    await w.find('[data-testid="topup-confirm"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="topup-result"]').text()).toContain('payment method')
  })
})

describe('PaymentMethodDialog', () => {
  it('requires last4 + holder', async () => {
    const w = mount(PaymentMethodDialog, { props: { modelValue: true }, global: { stubs } })
    await w.find('[data-testid="pay-save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="pay-error"]').exists()).toBe(true)
    expect(mPay).not.toHaveBeenCalled()
  })
  it('adds a valid card', async () => {
    mPay.mockResolvedValueOnce({ data: { ok: true } })
    const w = mount(PaymentMethodDialog, { props: { modelValue: true }, global: { stubs } })
    await w.find('[data-testid="pay-last4"]').setValue('4242')
    await w.find('[data-testid="pay-holder"]').setValue('A Tan')
    await w.find('[data-testid="pay-save"]').trigger('click')
    await flushPromises()
    expect(mPay).toHaveBeenCalledWith(
      '42',
      expect.objectContaining({ last4: '4242', holder_name: 'A Tan' })
    )
    expect(w.emitted('added')).toBeTruthy()
  })
})

describe('StorefrontEditorDialog', () => {
  it('prefills + saves the profile', async () => {
    mSf.mockResolvedValueOnce({ data: { ok: true } })
    const w = mount(StorefrontEditorDialog, {
      props: {
        modelValue: true,
        profile: {
          display_name: 'Toast',
          bio: 'hi',
          brand_color: '#F59E0B',
          featured_games: ['a', 'b']
        }
      },
      global: { stubs }
    })
    await w.find('[data-testid="sf-save"]').trigger('click')
    await flushPromises()
    expect(mSf).toHaveBeenCalledWith(
      '42',
      expect.objectContaining({ display_name: 'Toast', featured_games: ['a', 'b'] })
    )
    expect(w.emitted('saved')).toBeTruthy()
  })
  it('requires a display name', async () => {
    const w = mount(StorefrontEditorDialog, {
      props: { modelValue: true, profile: { display_name: '' } },
      global: { stubs }
    })
    await w.find('[data-testid="sf-save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="sf-error"]').exists()).toBe(true)
    expect(mSf).not.toHaveBeenCalled()
  })
})

describe('UploadAssetDialog', () => {
  it('blocks upload without a file', async () => {
    const w = mount(UploadAssetDialog, { props: { modelValue: true }, global: { stubs } })
    await w.find('[data-testid="upload-submit"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="upload-error"]').exists()).toBe(true)
    expect(mUpload).not.toHaveBeenCalled()
  })
  it('uploads a selected file as multipart FormData', async () => {
    mUpload.mockResolvedValueOnce({ data: { asset_id: 'ast_1', cdn_url: '/x.png' } })
    const w = mount(UploadAssetDialog, { props: { modelValue: true }, global: { stubs } })
    const input = w.find('[data-testid="upload-file"]').element as HTMLInputElement
    const file = new File(['data'], 'logo.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    await w.find('[data-testid="upload-file"]').trigger('change')
    await w.find('[data-testid="upload-submit"]').trigger('click')
    await flushPromises()
    expect(mUpload).toHaveBeenCalled()
    expect(mUpload.mock.calls[0][0]).toBeInstanceOf(FormData)
    expect(w.emitted('uploaded')).toBeTruthy()
  })
})
