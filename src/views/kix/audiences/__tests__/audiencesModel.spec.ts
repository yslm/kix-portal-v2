/**
 * audiencesModel — pure logic for the Audiences view.
 *
 * Real fields (v2 Audience type, verified at original migration):
 * id / name / type / size_estimate / geofence_m / created_at /
 * last_used_at. KPIs + filter derive only from these — nothing invented.
 */
import { describe, it, expect } from 'vitest'
import { normalizeAudiences, audienceKpis, filterAudiences, sizeLabel } from '../audiencesModel'
import type { Audience } from '@/api/portal-admin/types'

const sample: Audience[] = [
  { id: 'a1', name: 'Lunch crowd', type: 'geofence', size_estimate: 1200, geofence_m: 200 },
  { id: 'a2', name: 'Loyalty VIPs', type: 'retargeting', size_estimate: 340 },
  { id: 'a3', name: 'Lookalike A', type: 'lookalike', size_estimate: 5400 }
]

describe('normalizeAudiences', () => {
  it('passes a bare array; unwraps { audiences } and { items }', () => {
    expect(normalizeAudiences(sample)).toHaveLength(3)
    expect(normalizeAudiences({ audiences: sample })).toHaveLength(3)
    expect(normalizeAudiences({ items: sample })).toHaveLength(3)
  })
  it('returns [] for null / unexpected shapes', () => {
    expect(normalizeAudiences(null as never)).toEqual([])
    expect(normalizeAudiences({} as never)).toEqual([])
  })
})

describe('audienceKpis', () => {
  it('counts total / geofenced and sums reach', () => {
    const k = audienceKpis(sample)
    expect(k.total).toBe(3)
    expect(k.geofenced).toBe(1) // only a1 has geofence_m
    expect(k.totalReach).toBe(6940) // 1200 + 340 + 5400
    expect(k.types).toBe(3) // 3 distinct types
  })
  it('is safe on empty', () => {
    expect(audienceKpis([])).toEqual({ total: 0, geofenced: 0, totalReach: 0, types: 0 })
  })
})

describe('filterAudiences', () => {
  it('returns all for type "all" + empty query', () => {
    expect(filterAudiences(sample, { type: 'all', query: '' })).toHaveLength(3)
  })
  it('filters by type', () => {
    expect(filterAudiences(sample, { type: 'geofence', query: '' }).map((a) => a.id)).toEqual([
      'a1'
    ])
  })
  it('filters by case-insensitive name substring', () => {
    expect(filterAudiences(sample, { type: 'all', query: 'vip' }).map((a) => a.id)).toEqual(['a2'])
  })
})

describe('sizeLabel', () => {
  it('formats size_estimate with thousands separators, em-dash when absent', () => {
    expect(sizeLabel({ id: 'x', name: 'X', size_estimate: 5400 })).toBe('5,400')
    expect(sizeLabel({ id: 'y', name: 'Y' })).toBe('—')
  })
})
