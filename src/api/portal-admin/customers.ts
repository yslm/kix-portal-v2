import { http } from './http'
import type { CustomersListResponse } from './types'

/**
 * Portal admin · CustomerList view API.
 *
 * Mirrors the legacy `kixLoadCustomers()` fetcher in
 * `kix-platform/landing/portal.html` (~line 7303), which calls
 *   `fetch('/api/v1/portal-admin/customers', { headers: { Authorization } })`
 * and reads rows from `(d && d.customers) || []`.
 *
 * Brand identity is inferred from the JWT by the portal-admin router
 * (`get_current_brand` dependency), so this caller takes NO brand
 * argument — same shape as `fetchStatusStrip()` in reports.ts. Unlike
 * `listFlows()` which forwards an explicit `?brand=` param.
 *
 * Plan 4 T3 deferred items (still using the legacy view):
 *  - Paginated variant `/customers/page?page=&page_size=&search=`
 *    (legacy `kixLoadCustomersPaged()` at line 5099)
 *  - Search debounce (line 5148-5155)
 *  - RFM-segment per-row badge derivation (legacy `_seg()` at line 5118)
 *  - Export CSV (`kixExportCustomersCsv()` at line 7320)
 *  - Prev / Next page buttons + page-info copy
 *
 * @see src/views/kix/CustomerList.vue
 */
export const listCustomers = () => http.get<CustomersListResponse>('/api/v1/portal-admin/customers')
