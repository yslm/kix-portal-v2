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

// Response interceptor: pass through on success; redirect on 401
kixHttp.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const nextUrl = encodeURIComponent(
        window.location.pathname + window.location.search + window.location.hash
      )
      window.location.replace('/landing/signin.html?next=' + nextUrl)
    }
    return Promise.reject(error)
  }
)
