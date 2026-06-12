import { describe, it, expect, vi, beforeEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { kixHttp } from '../kixHttp'

describe('kixHttp', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(kixHttp)
    localStorage.clear()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { pathname: '/', search: '', hash: '', replace: vi.fn() }
    })
  })

  it('attaches Bearer token from kix_token', async () => {
    localStorage.setItem('kix_token', 'tk-1')
    mock.onGet('/api/v1/x').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer tk-1')
      return [200, { items: [] }]
    })
    await kixHttp.get('/api/v1/x')
  })

  it('attaches Bearer token from kix_portal_token fallback', async () => {
    localStorage.setItem('kix_portal_token', 'tk-2')
    mock.onGet('/api/v1/x').reply((config) => {
      expect(config.headers?.Authorization).toBe('Bearer tk-2')
      return [200, { items: [] }]
    })
    await kixHttp.get('/api/v1/x')
  })

  it('returns raw JSON without envelope unwrapping', async () => {
    localStorage.setItem('kix_token', 'tk-1')
    const payload = { items: [{ id: '1', name: 'Game 1' }], total: 1 }
    mock.onGet('/api/v1/games').reply(200, payload)
    const res = await kixHttp.get('/api/v1/games')
    expect(res.data).toEqual(payload)
  })

  it('propagates 4xx errors so callers can handle', async () => {
    localStorage.setItem('kix_token', 'tk-1')
    mock.onGet('/api/v1/x').reply(422, { detail: 'bad' })
    await expect(kixHttp.get('/api/v1/x')).rejects.toThrow()
  })

  it('on 401, redirects to signin and rejects', async () => {
    localStorage.setItem('kix_token', 'expired')
    const replaceSpy = window.location.replace as ReturnType<typeof vi.fn>
    mock.onGet('/api/v1/secret').reply(401, { detail: 'expired' })
    await expect(kixHttp.get('/api/v1/secret')).rejects.toThrow()
    expect(replaceSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\/landing\/signin\.html\?next=/)
    )
  })

  it('on 401 with no token and ?brand= in location.search, rejects without redirecting (demo mode)', async () => {
    const replaceSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { pathname: '/portal/', search: '?brand=demo', hash: '', replace: replaceSpy }
    })
    mock.onGet('/api/v1/portal-admin/setup-guide').reply(401, { detail: 'unauthorized' })
    await expect(kixHttp.get('/api/v1/portal-admin/setup-guide')).rejects.toThrow()
    expect(replaceSpy).not.toHaveBeenCalled()
  })

  it('on 401 with token expired, still redirects even if ?brand= present', async () => {
    localStorage.setItem('kix_token', 'expired')
    const replaceSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { pathname: '/portal/', search: '?brand=demo', hash: '', replace: replaceSpy }
    })
    mock.onGet('/api/v1/secret').reply(401, { detail: 'expired' })
    await expect(kixHttp.get('/api/v1/secret')).rejects.toThrow()
    expect(replaceSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\/landing\/signin\.html\?next=/)
    )
  })

  it('on 401 with no token and no brand bypass, redirects (anonymous, no escape hatch)', async () => {
    const replaceSpy = window.location.replace as ReturnType<typeof vi.fn>
    mock.onGet('/api/v1/secret').reply(401, { detail: 'unauthorized' })
    await expect(kixHttp.get('/api/v1/secret')).rejects.toThrow()
    expect(replaceSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\/landing\/signin\.html\?next=/)
    )
  })
})
