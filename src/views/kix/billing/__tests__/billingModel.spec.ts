/**
 * billingModel — pure logic for the Billing view.
 *
 * Real fields (v2 BillingResponse): wallet stats + invoices[] + per_brand[].
 * Each display prefers raw SGD (fmtSgd) then the pre-formatted string.
 */
import { describe, it, expect } from 'vitest'
import {
  splitBilling,
  balanceDisplay,
  burn7Display,
  burnDailyDisplay,
  runwayDisplay,
  invoiceAmount,
  spend7Display,
  spend30Display,
  isEmpty
} from '../billingModel'

const full = {
  balance_sgd: 1842.5,
  burn7_sgd: 311,
  burn_daily_sgd: 44.4,
  days_runway: 41,
  invoices: [
    {
      number: 'INV-2026-0312',
      date: '2026-06-01',
      total_sgd: 500,
      status: 'paid',
      pdf_url: '/x.pdf'
    }
  ],
  per_brand: [{ brand: 'demo', spend7_sgd: 311, spend30_sgd: 1280 }]
}

describe('splitBilling', () => {
  it('splits wallet / invoices / per_brand', () => {
    const s = splitBilling(full)
    expect(s.wallet?.balance_sgd).toBe(1842.5)
    expect(s.invoices).toHaveLength(1)
    expect(s.perBrand).toHaveLength(1)
  })
  it('treats null invoices/per_brand as empty arrays; safe on undefined', () => {
    const s = splitBilling({ balance_sgd: 10, invoices: null, per_brand: null })
    expect(s.invoices).toEqual([])
    expect(s.perBrand).toEqual([])
    expect(splitBilling(undefined)).toEqual({ wallet: null, invoices: [], perBrand: [] })
  })
})

describe('wallet displays', () => {
  it('prefers raw SGD via fmtSgd, falls back to pre-formatted string then em-dash', () => {
    const w = splitBilling(full).wallet
    expect(balanceDisplay(w)).toBe('S$1,842.5')
    expect(burn7Display(w)).toBe('S$311')
    expect(burnDailyDisplay(w)).toBe('S$44.4')
    expect(runwayDisplay(w)).toBe('41')
    expect(balanceDisplay(null)).toBe('—')
    expect(burn7Display({ burn7_str: 'S$99' })).toBe('S$99')
    expect(runwayDisplay({})).toBe('—')
  })
})

describe('invoiceAmount', () => {
  it('total_sgd > total_cents/100 > amount_str > em-dash', () => {
    expect(invoiceAmount({ total_sgd: 500 })).toBe('S$500')
    expect(invoiceAmount({ total_cents: 12345 })).toBe('S$123.45')
    expect(invoiceAmount({ amount_str: 'S$9' })).toBe('S$9')
    expect(invoiceAmount({})).toBe('—')
  })
})

describe('per-brand spend displays', () => {
  it('formats spend7 / spend30', () => {
    const b = splitBilling(full).perBrand[0]
    expect(spend7Display(b)).toBe('S$311')
    expect(spend30Display(b)).toBe('S$1,280')
    expect(spend7Display({ brand: 'x', spend7_str: 'S$5' })).toBe('S$5')
    expect(spend30Display({ brand: 'x' })).toBe('—')
  })
})

describe('isEmpty', () => {
  it('false when wallet has data or invoices present; true otherwise', () => {
    expect(isEmpty({ balance_sgd: 10 }, [])).toBe(false)
    expect(isEmpty(null, [{ number: 'x' }])).toBe(false)
    expect(isEmpty(null, [])).toBe(true)
    expect(isEmpty({}, [])).toBe(true)
  })
})
