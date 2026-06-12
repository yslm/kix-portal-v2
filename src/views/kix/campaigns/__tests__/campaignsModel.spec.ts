/**
 * campaignsModel — pure logic for the Campaigns view.
 *
 * Field reconciliation against the REAL backend Campaign model
 * (portal_admin.py · class Campaign ~line 168): the list endpoint returns
 * `spend_sgd` / `new_customers` / `cpa_sgd` / `ctr_pct` (raw), while the
 * demo mock + Overview table historically used the `spend_str` /
 * `conversions` / `cpa_str` aliases. These helpers prefer the REAL field
 * and fall back to the alias, so both shapes render correctly — and never
 * fabricate a missing one (em-dash instead).
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeCampaigns,
  campaignKpis,
  filterCampaigns,
  spendLabel,
  cpaLabel,
  conversionsOf,
  ctrLabel
} from '../campaignsModel'
import type { Campaign } from '@/api/portal-admin/types'

const realShape: Campaign[] = [
  {
    id: 'c1',
    name: 'Lunch spin',
    status: 'live',
    objective: 'NEW',
    game_type: 'spin',
    spend_sgd: 378,
    impressions: 7420,
    plays: 2103,
    new_customers: 87,
    cpa_sgd: 4.2,
    ctr_pct: 28.3
  },
  {
    id: 'c2',
    name: 'Scratch & win',
    status: 'paused',
    objective: 'REPEAT',
    spend_sgd: 214,
    impressions: 4180,
    plays: 1142,
    new_customers: 42,
    cpa_sgd: 5.1,
    ctr_pct: 27.3
  },
  {
    id: 'c3',
    name: 'Mystery box',
    status: 'review',
    spend_sgd: 0,
    impressions: 0,
    plays: 0,
    new_customers: 0,
    cpa_sgd: 0,
    ctr_pct: 0
  }
]

describe('normalizeCampaigns', () => {
  it('passes through a bare array', () => {
    expect(normalizeCampaigns(realShape)).toHaveLength(3)
  })
  it('unwraps { campaigns } and { items }', () => {
    expect(normalizeCampaigns({ campaigns: realShape })).toHaveLength(3)
    expect(normalizeCampaigns({ items: realShape })).toHaveLength(3)
  })
  it('returns [] for null / unexpected shapes', () => {
    expect(normalizeCampaigns(null as never)).toEqual([])
    expect(normalizeCampaigns({} as never)).toEqual([])
  })
})

describe('campaignKpis', () => {
  it('counts total + active and sums real spend / new customers', () => {
    const k = campaignKpis(realShape)
    expect(k.total).toBe(3)
    expect(k.active).toBe(1) // only "live" counts as active
    expect(k.totalSpendSgd).toBe(592) // 378 + 214 + 0
    expect(k.totalNewCustomers).toBe(129) // 87 + 42 + 0
  })

  it('falls back to the `conversions` alias when new_customers is absent', () => {
    const k = campaignKpis([{ id: 'x', name: 'X', status: 'active', conversions: 10 }])
    expect(k.active).toBe(1) // "active" also counts as active
    expect(k.totalNewCustomers).toBe(10)
  })

  it('is safe on an empty list', () => {
    expect(campaignKpis([])).toEqual({
      total: 0,
      active: 0,
      totalSpendSgd: 0,
      totalNewCustomers: 0
    })
  })
})

describe('filterCampaigns', () => {
  it('returns everything for status "all" and empty query', () => {
    expect(filterCampaigns(realShape, { status: 'all', query: '' })).toHaveLength(3)
  })

  it('maps "active" → live/active, "pending" → review/pending', () => {
    expect(filterCampaigns(realShape, { status: 'active', query: '' }).map((c) => c.id)).toEqual([
      'c1'
    ])
    expect(filterCampaigns(realShape, { status: 'pending', query: '' }).map((c) => c.id)).toEqual([
      'c3'
    ])
    expect(filterCampaigns(realShape, { status: 'paused', query: '' }).map((c) => c.id)).toEqual([
      'c2'
    ])
  })

  it('filters by case-insensitive name substring', () => {
    expect(filterCampaigns(realShape, { status: 'all', query: 'spin' }).map((c) => c.id)).toEqual([
      'c1'
    ])
    expect(filterCampaigns(realShape, { status: 'all', query: 'WIN' }).map((c) => c.id)).toEqual([
      'c2'
    ])
  })

  it('combines status + query', () => {
    expect(filterCampaigns(realShape, { status: 'active', query: 'mystery' })).toHaveLength(0)
  })
})

describe('field accessors prefer the real backend field, fall back to alias', () => {
  it('spendLabel: spend_sgd via fmtSgd, else spend_str, else em-dash', () => {
    expect(spendLabel({ id: 'a', name: 'A', spend_sgd: 378 })).toBe('S$378')
    expect(spendLabel({ id: 'b', name: 'B', spend_str: 'S$99' })).toBe('S$99')
    expect(spendLabel({ id: 'c', name: 'C' })).toBe('—')
  })

  it('cpaLabel: cpa_sgd via fmtSgd, else cpa_str, else em-dash', () => {
    expect(cpaLabel({ id: 'a', name: 'A', cpa_sgd: 4.2 })).toBe('S$4.2')
    expect(cpaLabel({ id: 'b', name: 'B', cpa_str: 'S$5.00' })).toBe('S$5.00')
    expect(cpaLabel({ id: 'c', name: 'C' })).toBe('—')
  })

  it('conversionsOf: new_customers preferred, conversions fallback, null when absent', () => {
    expect(conversionsOf({ id: 'a', name: 'A', new_customers: 87, conversions: 1 })).toBe(87)
    expect(conversionsOf({ id: 'b', name: 'B', conversions: 9 })).toBe(9)
    expect(conversionsOf({ id: 'c', name: 'C' })).toBeNull()
  })

  it('ctrLabel: number → "x%", string passthrough, null → em-dash', () => {
    expect(ctrLabel({ id: 'a', name: 'A', ctr_pct: 28.3 })).toBe('28.3%')
    expect(ctrLabel({ id: 'b', name: 'B', ctr_pct: '2.1%' })).toBe('2.1%')
    expect(ctrLabel({ id: 'c', name: 'C' })).toBe('—')
  })
})
