import { describe, it, expect, beforeEach } from 'vitest'
import { resolveBrandId } from '../resolveBrandId'

describe('resolveBrandId', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, search: '' }
    })
  })

  it('prefers ?brand= query param', () => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...window.location, search: '?brand=acme' }
    })
    localStorage.setItem('kix_brand_id', 'persisted')
    expect(resolveBrandId()).toBe('acme')
  })

  it('falls back to localStorage.kix_brand_id', () => {
    localStorage.setItem('kix_brand_id', 'persisted')
    expect(resolveBrandId()).toBe('persisted')
  })

  it('returns demo_brand fallback when nothing set', () => {
    expect(resolveBrandId()).toBe('demo_brand')
  })

  it('accepts a custom fallback', () => {
    expect(resolveBrandId('custom_default')).toBe('custom_default')
  })
})
