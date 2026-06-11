import { describe, it, expect, vi, beforeEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { kixHttp } from '../kixHttp'

describe('kixHttp', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(kixHttp)
    localStorage.clear()
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
    const replaceSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { pathname: '/portal/', search: '', hash: '', replace: replaceSpy }
    })
    mock.onGet('/api/v1/secret').reply(401, { detail: 'expired' })
    await expect(kixHttp.get('/api/v1/secret')).rejects.toThrow()
    expect(replaceSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\/landing\/signin\.html\?next=/)
    )
  })
})
