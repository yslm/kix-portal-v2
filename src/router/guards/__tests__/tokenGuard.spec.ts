import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tokenGuard } from '../tokenGuard'

describe('tokenGuard', () => {
  beforeEach(() => {
    localStorage.clear()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { pathname: '/portal/', search: '', hash: '', replace: vi.fn() }
    })
  })

  it('redirects to signin when no token and no brand query', () => {
    const next = vi.fn()
    tokenGuard({ fullPath: '/overview', query: {} } as any, {} as any, next)
    expect(window.location.replace as any).toHaveBeenCalledWith(
      expect.stringMatching(/^\/landing\/signin\.html\?next=/)
    )
  })

  it('passes when kix_token present', () => {
    localStorage.setItem('kix_token', 'abc')
    const next = vi.fn()
    tokenGuard({ fullPath: '/overview', query: {} } as any, {} as any, next)
    expect(next).toHaveBeenCalledWith()
    expect(window.location.replace as any).not.toHaveBeenCalled()
  })

  it('passes when kix_portal_token present', () => {
    localStorage.setItem('kix_portal_token', 'abc')
    const next = vi.fn()
    tokenGuard({ fullPath: '/overview', query: {} } as any, {} as any, next)
    expect(next).toHaveBeenCalledWith()
  })

  it('passes anonymous when ?brand= is in query (demo mode)', () => {
    const next = vi.fn()
    tokenGuard(
      { fullPath: '/overview?brand=demo', query: { brand: 'demo' } } as any,
      {} as any,
      next
    )
    expect(next).toHaveBeenCalledWith()
  })
})
