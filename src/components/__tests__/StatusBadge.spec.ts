import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '../StatusBadge.vue'

describe('StatusBadge', () => {
  it('renders status label', () => {
    const w = mount(StatusBadge, { props: { status: 'active' } })
    expect(w.text()).toContain('active')
  })
  it('applies green colors for active', () => {
    const w = mount(StatusBadge, { props: { status: 'active' } })
    expect(w.html()).toContain('bg-green-50')
  })
  it('applies amber colors for paused', () => {
    const w = mount(StatusBadge, { props: { status: 'paused' } })
    expect(w.html()).toContain('bg-amber-50')
  })
  it('applies gray colors for draft', () => {
    const w = mount(StatusBadge, { props: { status: 'draft' } })
    expect(w.html()).toContain('bg-gray-50')
  })
  it('applies red colors for ended/failed', () => {
    const w = mount(StatusBadge, { props: { status: 'ended' } })
    expect(w.html()).toContain('bg-red-50')
  })
  it('falls back to gray for unknown status', () => {
    const w = mount(StatusBadge, { props: { status: 'mystery' } })
    expect(w.html()).toContain('bg-gray-50')
  })
  it('renders em-dash when status is undefined', () => {
    const w = mount(StatusBadge, { props: { status: undefined } })
    expect(w.text()).toBe('—')
  })
})
