import { http } from './http'
import type { BillingResponse, Invoice } from './types'

/**
 * Portal admin · Billing API.
 *
 * Two related endpoints, but Plan 5 T5 leans on the FIRST one for both
 * the wallet card AND the invoices table — one round-trip, matching
 * the legacy `view-billing` fetch:
 *
 *   GET /api/v1/portal-admin/billing
 *     → { balance_str, burn7_str, burn_daily_str, days_runway,
 *         invoices, per_brand } (every field optional)
 *
 * Backend handler: app/routers/portal_admin.py (the legacy fetcher
 * `kixLoadBilling()` at portal.html line 5267 calls this single
 * endpoint, then renders the wallet stat cards + invoices table +
 * per-brand spend table off the merged response). Brand inferred
 * from the JWT — no `?brand=` param.
 *
 * The audit calls out `view-invoices` as a duplicate surface served
 * by the SETTINGS-router endpoint:
 *
 *   GET /api/v1/portal/settings/billing/<brand_id>
 *     → { invoices: { items: Invoice[] }, ... } (cents-based fields)
 *
 * Plan 5 T5 absorbs the invoices view into Billing.vue, so the
 * settings-router endpoint is NOT exercised here. We expose a thin
 * `listInvoices()` helper anyway for symmetry with the rest of the
 * portal-admin surface — it normalises the response to a flat
 * `Invoice[]` and is unused by the Billing.vue first-cut (which
 * reads `invoices` directly off the wallet payload). Future slices
 * (richer invoice detail / billing-history filters) can layer onto
 * `listInvoices()` without re-shaping the wallet path.
 *
 * Plan 5 T5 deferred items (still served by the legacy view):
 *   - Payment-method management — `kixSwitchView('settings')` →
 *     payment tab. The settings-router payment-method endpoints
 *     exist but require a full form for card / bank / PayNow setup.
 *   - Recharge / top-up CTAs (`kixTopupWallet(amount)` at portal.html
 *     line 2615-2617). The POST flow exists; deferred behind the
 *     payment-method editor.
 *   - Billing-history filters — date range, status filter, search.
 *     Not present in the legacy view either; future work.
 *   - "Export CSV" button (`kixExportInvoicesCsv()` at portal.html
 *     line 5302-5318). The CSV endpoint exists
 *     (`/api/v1/portal/settings/billing/<bid>/export.csv`) but the
 *     authenticated blob download dance is deferred to a later slice.
 *   - Per-brand spend table (`per_brand` field on the response).
 *     Typed in `types.ts`; future slice can render it without
 *     re-shaping the response.
 *   - Auto-recharge pill ("Auto-recharge on" badge in the wallet
 *     card header) — tied to the deferred payment-method editor.
 *
 * @see src/views/kix/Billing.vue
 */
export const fetchWallet = () => http.get<BillingResponse>('/api/v1/portal-admin/billing')

/**
 * Normalised invoices list helper. Pulled off the same
 * `/api/v1/portal-admin/billing` payload — the legacy view-billing
 * does this implicitly, and the view-invoices view does it via the
 * settings-router endpoint. We expose it here so future slices that
 * only need the invoices list (without the wallet stat cards) can
 * fetch + normalise in one place.
 *
 * Tolerates a missing / null `invoices` field (V2.16 sweep fix at
 * portal.html line 5278-5282 — backend may omit the array entirely).
 */
export const listInvoices = async (): Promise<Invoice[]> => {
  const res = await fetchWallet()
  const data = res.data
  if (data && Array.isArray(data.invoices)) return data.invoices
  return []
}

/**
 * POST /portal-admin/wallet/topup — add funds (deferred feature, now shipped;
 * kixTopupWallet ~3722). 402 → { detail: { error: 'payment_method_required',
 * next } } when no card on file. amount_sgd 0–10000.
 */
export const topupWallet = (amountSgd: number) =>
  http.post('/api/v1/portal-admin/wallet/topup', { amount_sgd: amountSgd })

/**
 * POST /portal/settings/payment-methods/{brand} — add a card
 * (kixAddPaymentMethod ~6215). brand in the path.
 */
export const addPaymentMethod = (
  brandId: string,
  body: {
    type: string
    brand: string
    last4: string
    holder_name: string
    exp_month: number
    exp_year: number
    set_default?: boolean
  }
) => http.post(`/api/v1/portal/settings/payment-methods/${encodeURIComponent(brandId)}`, body)
