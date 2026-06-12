import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

/**
 * Dedicated axios instance for KiX API calls.
 *
 * Diverges from art-design-pro's `http` (src/utils/http/index.ts) in ONE crucial way:
 * it does NOT enforce the `BaseResponse<T> = { code, msg, data }` envelope. KiX backend
 * returns raw JSON; trying to unwrap it via art-design-pro's interceptor would
 * incorrectly fail every successful response.
 *
 * Shared behavior with art-design-pro's http (Plan 1 Task 6):
 * - Reads token from localStorage (kix_token || kix_portal_token), sets `Authorization: Bearer <t>`
 * - On 401, redirects to /landing/signin.html?next=<current url> (mirrors portal.html behavior)
 *
 * Use this instance for any call under /api/v1/portal-admin/* or other KiX endpoints.
 */
export const kixHttp: AxiosInstance = axios.create({
  baseURL: '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

// Request interceptor: inject Bearer token
kixHttp.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('kix_token') || localStorage.getItem('kix_portal_token')
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

/**
 * Response interceptor: pass through on success; redirect on 401.
 *
 * Symmetric with the route-level demo bypass in `src/router/guards/tokenGuard.ts`
 * (see the `hasBrand` line). The route guard lets anonymous traffic through when
 * `?brand=` is present in `location.search`; without the same check here, any 401
 * from a demo-reachable view (e.g. /overview → /api/v1/portal-admin/setup-guide)
 * would slam the user back to /landing/signin.html before the calling component
 * could swallow the error, silently breaking the demo gate.
 *
 * Rule: redirect on 401 unless the caller is anonymous AND the demo brand bypass
 * is active. Token-expired (token present + 401) still redirects regardless of
 * the brand bypass — that path is a real session expiry, not a demo visit.
 */
kixHttp.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const hasToken = !!(
        localStorage.getItem('kix_token') || localStorage.getItem('kix_portal_token')
      )
      const hasBrandBypass = new URLSearchParams(window.location.search).has('brand')
      if (hasToken || !hasBrandBypass) {
        const nextUrl = encodeURIComponent(
          window.location.pathname + window.location.search + window.location.hash
        )
        window.location.replace('/landing/signin.html?next=' + nextUrl)
      }
    }
    return Promise.reject(error)
  }
)
