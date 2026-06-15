/**
 * rewardsTabsModel — normalisers, voucher helpers, create-body assembly +
 * validation for the Rewards tabs/editor. No mounting.
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeGameLinks,
  normalizeIssuance,
  isRedeemable,
  voucherTitle,
  blankTemplateForm,
  expiryToTs,
  buildCreateBody,
  validateCreateTemplate
} from '../rewardsTabsModel'

describe('rewardsTabsModel · normalisers', () => {
  it('unwraps game links { games } / { items } / array', () => {
    const g = [{ game_id: 1 }]
    expect(normalizeGameLinks({ games: g })).toBe(g)
    expect(normalizeGameLinks({ items: g })).toBe(g)
    expect(normalizeGameLinks(g)).toBe(g)
  })
  it('unwraps issuance { summary }', () => {
    const s = [{ template_name: 'x' }]
    expect(normalizeIssuance({ summary: s })).toBe(s)
    expect(normalizeIssuance({} as never)).toEqual([])
  })
})

describe('rewardsTabsModel · voucher helpers', () => {
  it('isRedeemable only for active', () => {
    expect(isRedeemable({ status: 'active' })).toBe(true)
    expect(isRedeemable({ status: 'redeemed' })).toBe(false)
    expect(isRedeemable(null)).toBe(false)
  })
  it('voucherTitle prefers title > description > code > id', () => {
    expect(voucherTitle({ title: 'T', description: 'D', code: 'C' })).toBe('T')
    expect(voucherTitle({ description: 'D', code: 'C' })).toBe('D')
    expect(voucherTitle({ code: 'C' })).toBe('C')
    expect(voucherTitle(null)).toBe('')
  })
})

describe('rewardsTabsModel · create body', () => {
  it('expiryToTs converts ISO date to unix seconds (UTC midnight)', () => {
    expect(expiryToTs('2026-07-01')).toBe(Math.floor(Date.parse('2026-07-01T00:00:00Z') / 1000))
    expect(expiryToTs('')).toBeNull()
    expect(expiryToTs('nonsense')).toBeNull()
  })

  it('free offer: only base fields + original price (no discount/final)', () => {
    const f = { ...blankTemplateForm(), name: 'Free drink', original_price: '4.50' }
    const body = buildCreateBody(f, 42)
    expect(body).toMatchObject({
      brand_id: 42,
      name: 'Free drink',
      offer_type: 'free',
      original_price_cents: 450,
      inventory_count: 100
    })
    expect(body.discount_percent).toBeUndefined()
    expect(body.final_price_cents).toBeUndefined()
  })

  it('percent_off carries discount_percent', () => {
    const f = {
      ...blankTemplateForm(),
      name: '20% off',
      offer_type: 'percent_off' as const,
      discount_percent: '20'
    }
    expect(buildCreateBody(f, 'demo').discount_percent).toBe(20)
  })

  it('fixed_price carries final_price_cents', () => {
    const f = {
      ...blankTemplateForm(),
      name: 'Set meal',
      offer_type: 'fixed_price' as const,
      original_price: '12',
      final_price: '8.50'
    }
    expect(buildCreateBody(f, 1).final_price_cents).toBe(850)
  })
})

describe('rewardsTabsModel · validation', () => {
  it('requires a name', () => {
    expect(validateCreateTemplate(blankTemplateForm())).toContain('Name is required')
  })
  it('percent_off bounds 1–99', () => {
    const f = {
      ...blankTemplateForm(),
      name: 'x',
      offer_type: 'percent_off' as const,
      discount_percent: '0'
    }
    expect(validateCreateTemplate(f)).toContain('Discount must be 1–99%')
  })
  it('fixed_price final cannot exceed original', () => {
    const f = {
      ...blankTemplateForm(),
      name: 'x',
      offer_type: 'fixed_price' as const,
      original_price: '5',
      final_price: '9'
    }
    expect(validateCreateTemplate(f)).toContain('Final price cannot exceed the original price')
  })
  it('valid free template passes', () => {
    expect(validateCreateTemplate({ ...blankTemplateForm(), name: 'ok' })).toEqual([])
  })
})
