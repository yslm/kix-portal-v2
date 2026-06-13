/**
 * customersModel — pure logic for the CustomerList view.
 *
 * Real backend row (portal_admin.py · _real_customer_rows ~line 1990):
 * handle / channel / first_seen / plays / redeems / last_active. The
 * RFM-ish `segment()` mirrors the legacy `_seg()` (portal.html ~line
 * 5118) EXACTLY — derived only from real plays/redeems, never invented.
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeCustomers,
  customerKpis,
  displayName,
  segment,
  filterCustomers
} from '../customersModel'
import type { Customer } from '@/api/portal-admin/types'

const sample: Customer[] = [
  { handle: 'aisha_t', name: 'Aisha Tan', channel: 'phone', plays: 8, redeems: 2 }, // regular
  { handle: 'bobby88', channel: 'email', plays: 3, redeems: 0 }, // returning
  { handle: 'cara', channel: 'qr', plays: 1, redeems: 0 } // new
]

describe('normalizeCustomers', () => {
  it('passes a bare array; unwraps { customers } and { items }', () => {
    expect(normalizeCustomers(sample)).toHaveLength(3)
    expect(normalizeCustomers({ customers: sample })).toHaveLength(3)
    expect(normalizeCustomers({ items: sample })).toHaveLength(3)
  })
  it('returns [] for null / unexpected shapes', () => {
    expect(normalizeCustomers(null as never)).toEqual([])
    expect(normalizeCustomers({} as never)).toEqual([])
  })
})

describe('displayName — name → handle → em-dash', () => {
  it('prefers name, falls back to handle', () => {
    expect(displayName(sample[0])).toBe('Aisha Tan')
    expect(displayName(sample[1])).toBe('bobby88')
    expect(displayName({})).toBe('—')
  })
})

describe('segment — mirrors legacy _seg() from real plays/redeems', () => {
  it('regular: redeems > 0 AND plays >= 5', () => {
    expect(segment(sample[0]).key).toBe('regular')
  })
  it('returning: plays >= 2 (and not regular)', () => {
    expect(segment(sample[1]).key).toBe('returning')
    // plays >= 5 but no redeem → not regular → returning
    expect(segment({ plays: 6, redeems: 0 }).key).toBe('returning')
  })
  it('new: everything else', () => {
    expect(segment(sample[2]).key).toBe('new')
    expect(segment({}).key).toBe('new')
  })
  it('carries a label + emoji for the badge', () => {
    expect(segment(sample[0]).label).toMatch(/Regular/)
    expect(segment(sample[0]).emoji).toBe('⭐')
  })
})

describe('customerKpis', () => {
  it('counts total / regulars and sums plays / redeems', () => {
    const k = customerKpis(sample)
    expect(k.total).toBe(3)
    expect(k.regulars).toBe(1) // only aisha
    expect(k.totalPlays).toBe(12) // 8 + 3 + 1
    expect(k.totalRedeems).toBe(2) // 2 + 0 + 0
  })
  it('is safe on empty', () => {
    expect(customerKpis([])).toEqual({ total: 0, regulars: 0, totalPlays: 0, totalRedeems: 0 })
  })
})

describe('filterCustomers', () => {
  it('returns all for segment "all" + empty query', () => {
    expect(filterCustomers(sample, { segment: 'all', query: '' })).toHaveLength(3)
  })
  it('filters by segment key', () => {
    expect(filterCustomers(sample, { segment: 'regular', query: '' }).map((c) => c.handle)).toEqual(
      ['aisha_t']
    )
    expect(filterCustomers(sample, { segment: 'new', query: '' }).map((c) => c.handle)).toEqual([
      'cara'
    ])
  })
  it('filters by case-insensitive name/handle substring', () => {
    expect(
      filterCustomers(sample, { segment: 'all', query: 'AISHA' }).map((c) => c.handle)
    ).toEqual(['aisha_t'])
    expect(filterCustomers(sample, { segment: 'all', query: 'bob' }).map((c) => c.handle)).toEqual([
      'bobby88'
    ])
  })
})
