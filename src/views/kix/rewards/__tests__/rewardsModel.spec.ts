/**
 * rewardsModel — pure logic for the Rewards Templates tab.
 *
 * Real fields (v2 RewardTemplate): name / type / offer_type /
 * inventory_count / original_price_cents / status. KPIs + filter derive
 * only from these.
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeTemplates,
  valueFor,
  inventoryFor,
  subtypeFor,
  rewardKpis,
  filterTemplates
} from '../rewardsModel'
import type { RewardTemplate } from '@/api/portal-admin/types'

const sample: RewardTemplate[] = [
  {
    prize_id: 'p1',
    name: '10% off',
    type: 'voucher',
    original_price_cents: 0,
    status: 'active',
    inventory_count: 100
  },
  {
    prize_id: 'p2',
    name: 'Free tote',
    type: 'prize',
    original_price_cents: 1500,
    status: 'active'
  },
  {
    prize_id: 'p3',
    name: 'S$5 cashback',
    type: 'cashback',
    original_price_cents: 500,
    status: 'inactive',
    inventory_count: 50
  }
]

describe('normalizeTemplates', () => {
  it('unwraps { prizes } / { templates } / { items }, tolerates bare array', () => {
    expect(normalizeTemplates(sample)).toHaveLength(3)
    expect(normalizeTemplates({ prizes: sample })).toHaveLength(3)
    expect(normalizeTemplates({ templates: sample })).toHaveLength(3)
    expect(normalizeTemplates({ items: sample })).toHaveLength(3)
  })
  it('returns [] for undefined / unexpected shapes', () => {
    expect(normalizeTemplates(undefined)).toEqual([])
    expect(normalizeTemplates({} as never)).toEqual([])
  })
})

describe('valueFor', () => {
  it('fmtSgd of cents/100, null when absent', () => {
    expect(valueFor({ name: 'x', original_price_cents: 1500 })).toBe('S$15')
    expect(valueFor({ name: 'y' })).toBeNull()
  })
})

describe('inventoryFor', () => {
  it('"unlimited" when null/undefined, else the count', () => {
    expect(inventoryFor({ name: 'x', inventory_count: 50 })).toBe('50')
    expect(inventoryFor({ name: 'y', inventory_count: null })).toBe('unlimited')
    expect(inventoryFor({ name: 'z' })).toBe('unlimited')
  })
})

describe('subtypeFor', () => {
  it('prefers type over offer_type, null when neither', () => {
    expect(subtypeFor({ name: 'x', type: 'voucher', offer_type: 'percent_off' })).toBe('voucher')
    expect(subtypeFor({ name: 'y', offer_type: 'free' })).toBe('free')
    expect(subtypeFor({ name: 'z' })).toBeNull()
  })
})

describe('rewardKpis', () => {
  it('counts total / active / limited and sums value', () => {
    const k = rewardKpis(sample)
    expect(k.total).toBe(3)
    expect(k.active).toBe(2)
    expect(k.limited).toBe(2) // p1 + p3 have inventory_count
    expect(k.totalValue).toBe('S$20') // (0 + 1500 + 500)/100
  })
  it('is safe on empty', () => {
    expect(rewardKpis([])).toEqual({ total: 0, active: 0, totalValue: 'S$0', limited: 0 })
  })
})

describe('filterTemplates', () => {
  it('returns all for filter "all" + empty query', () => {
    expect(filterTemplates(sample, { filter: 'all', query: '' })).toHaveLength(3)
  })
  it('filters by type', () => {
    expect(
      filterTemplates(sample, { filter: 'voucher', query: '' }).map((t) => t.prize_id)
    ).toEqual(['p1'])
    expect(
      filterTemplates(sample, { filter: 'cashback', query: '' }).map((t) => t.prize_id)
    ).toEqual(['p3'])
  })
  it('searches name, case-insensitive', () => {
    expect(
      filterTemplates(sample, { filter: 'all', query: 'TOTE' }).map((t) => t.prize_id)
    ).toEqual(['p2'])
  })
})
