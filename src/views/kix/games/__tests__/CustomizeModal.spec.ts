/**
 * CustomizeModal — embeds the gamification IDE for a build order_id and
 * closes + emits `saved` on the editor's `kix-editor-saved` postMessage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/utils/kix/resolveBrandId', () => ({
  resolveBrandId: () => '42'
}))

import CustomizeModal from '../CustomizeModal.vue'

function mountModal(props: { modelValue: boolean; orderId: string | null }) {
  return mount(CustomizeModal, { props, attachTo: document.body })
}

describe('CustomizeModal', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders nothing when closed', () => {
    mountModal({ modelValue: false, orderId: 'ord-1' })
    expect(document.querySelector('[data-testid="customize-modal"]')).toBeNull()
  })

  it('builds the IDE iframe src with order_id + brand', () => {
    mountModal({ modelValue: true, orderId: 'ord-1' })
    const frame = document.querySelector('[data-testid="customize-frame"]') as HTMLIFrameElement
    expect(frame).not.toBeNull()
    expect(frame.getAttribute('src')).toBe('/kix-gamification-ide/?order_id=ord-1&brand=42')
  })

  it('closes + emits saved on the kix-editor-saved message', async () => {
    const wrapper = mountModal({ modelValue: true, orderId: 'ord-1' })
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'kix-editor-saved' } }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('saved')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })

  it('ignores unrelated messages', async () => {
    const wrapper = mountModal({ modelValue: true, orderId: 'ord-1' })
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'something-else' } }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('saved')).toBeFalsy()
  })
})
