/**
 * vipTiersModel — pure logic for the VIP tiers view.
 *
 * Real fields (v2 LoyaltyTier): name / min_xp / perk; distribution adds
 * members + sampled_members. KPIs + joins derive only from these.
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeTiers,
  normalizeDistribution,
  mergeMembers,
  tierKpis,
  maxBucket,
  barPct
} from '../vipTiersModel'
import type { LoyaltyTier, LoyaltyTierDistribution } from '@/api/portal-admin/types'

const tiers: LoyaltyTier[] = [
  { name: 'Bronze', min_xp: 0, perk: '5% off' },
  { name: 'Silver', min_xp: 500, perk: 'Free drink' },
  { name: 'Gold', min_xp: 2000, perk: '' }
]
const dist: LoyaltyTierDistribution[] = [
  { name: 'Bronze', min_xp: 0, perk: '5% off', members: 120 },
  { name: 'Silver', min_xp: 500, perk: 'Free drink', members: 40 },
  { name: 'Gold', min_xp: 2000, perk: '', members: 8 }
]

describe('normalizeTiers', () => {
  it('unwraps { tiers }, tolerates a bare array, empty otherwise', () => {
    expect(normalizeTiers({ tiers })).toHaveLength(3)
    expect(normalizeTiers(tiers)).toHaveLength(3)
    expect(normalizeTiers(undefined)).toEqual([])
    expect(normalizeTiers({} as never)).toEqual([])
  })
})

describe('normalizeDistribution', () => {
  it('extracts rows + sampled_members; safe on undefined', () => {
    const r = normalizeDistribution({ sampled_members: 168, distribution: dist })
    expect(r.rows).toHaveLength(3)
    expect(r.sampled).toBe(168)
    expect(normalizeDistribution(undefined)).toEqual({ rows: [], sampled: 0 })
  })
})

describe('mergeMembers', () => {
  it('joins member counts by case-insensitive name', () => {
    const rows = mergeMembers(tiers, dist)
    expect(rows.map((r) => r.members)).toEqual([120, 40, 8])
  })
  it('members=null when distribution unavailable (503)', () => {
    expect(mergeMembers(tiers, []).map((r) => r.members)).toEqual([null, null, null])
  })
  it('members=0 for a tier absent from the distribution', () => {
    const rows = mergeMembers([{ name: 'Platinum', min_xp: 5000, perk: 'x' }], dist)
    expect(rows[0].members).toBe(0)
  })
})

describe('tierKpis', () => {
  it('counts total / threshold / perks and carries sampled', () => {
    const k = tierKpis(tiers, 168)
    expect(k.total).toBe(3)
    expect(k.sampledMembers).toBe(168)
    expect(k.topThreshold).toBe(2000)
    expect(k.withPerks).toBe(2) // Gold has empty perk
  })
  it('is safe on empty', () => {
    expect(tierKpis([], 0)).toEqual({ total: 0, sampledMembers: 0, topThreshold: 0, withPerks: 0 })
  })
})

describe('maxBucket / barPct', () => {
  it('normalises bars to the max bucket, floored at 1', () => {
    expect(maxBucket(dist)).toBe(120)
    expect(barPct(120, dist)).toBe(100)
    expect(barPct(60, dist)).toBe(50)
    expect(maxBucket([])).toBe(1) // floor guards divide-by-zero
  })
})
