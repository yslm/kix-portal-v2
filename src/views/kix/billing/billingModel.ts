/**
 * billingModel — pure (UI-free) logic for the Billing view.
 *
 * Real fields (v2 BillingResponse extends WalletBalance): balance_sgd/_str,
 * burn7_sgd/_str, burn_daily_sgd/_str, days_runway, invoices[], per_brand[].
 * Each display prefers the raw SGD number (fmtSgd) and falls back to the
 * server's pre-formatted string — nothing invented.
 */
import type {
  BillingResponse,
  BillingBrandSpend,
  Invoice,
  WalletBalance
} from '@/api/portal-admin/types'
import { fmtSgd } from '@/utils/format/currency'

export interface SplitBilling {
  wallet: WalletBalance | null
  invoices: Invoice[]
  perBrand: BillingBrandSpend[]
}

export function splitBilling(data: BillingResponse | undefined): SplitBilling {
  if (!data || typeof data !== 'object') return { wallet: null, invoices: [], perBrand: [] }
  const wallet: WalletBalance = {
    balance_str: data.balance_str,
    balance_sgd: data.balance_sgd,
    burn7_str: data.burn7_str,
    burn7_sgd: data.burn7_sgd,
    burn_daily_str: data.burn_daily_str,
    burn_daily_sgd: data.burn_daily_sgd,
    days_runway: data.days_runway
  }
  return {
    wallet,
    invoices: Array.isArray(data.invoices) ? data.invoices : [],
    perBrand: Array.isArray(data.per_brand) ? data.per_brand : []
  }
}

/** Prefer raw SGD (fmtSgd), fall back to the pre-formatted string, then `—`. */
function money(raw: number | undefined, str: string | undefined): string {
  if (typeof raw === 'number') return fmtSgd(raw)
  return str || '—'
}

export function balanceDisplay(w: WalletBalance | null): string {
  return w ? money(w.balance_sgd, w.balance_str) : '—'
}
export function burn7Display(w: WalletBalance | null): string {
  return w ? money(w.burn7_sgd, w.burn7_str) : '—'
}
export function burnDailyDisplay(w: WalletBalance | null): string {
  return w ? money(w.burn_daily_sgd, w.burn_daily_str) : '—'
}
export function runwayDisplay(w: WalletBalance | null): string {
  return w && typeof w.days_runway === 'number' ? String(w.days_runway) : '—'
}

export function invoiceAmount(inv: Invoice): string {
  if (typeof inv.total_sgd === 'number') return fmtSgd(inv.total_sgd)
  if (typeof inv.total_cents === 'number') return fmtSgd(inv.total_cents / 100)
  return inv.amount_str || '—'
}

export function spend7Display(b: BillingBrandSpend): string {
  return money(b.spend7_sgd, b.spend7_str)
}
export function spend30Display(b: BillingBrandSpend): string {
  return money(b.spend30_sgd, b.spend30_str)
}

/** Defensive cover — true when neither wallet stats nor invoices yielded data. */
export function isEmpty(wallet: WalletBalance | null, invoices: Invoice[]): boolean {
  const hasWallet =
    !!wallet &&
    (typeof wallet.balance_sgd === 'number' ||
      typeof wallet.burn7_sgd === 'number' ||
      typeof wallet.days_runway === 'number' ||
      !!wallet.balance_str ||
      !!wallet.burn7_str)
  return !hasWallet && invoices.length === 0
}
