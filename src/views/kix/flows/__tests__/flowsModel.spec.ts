/**
 * flowsModel — pure logic for the Flows view.
 *
 * Real fields (v2 AutomationFlow): flow_id / name / status / start_date /
 * end_date / steps_count / template_id. KPIs + filter derive only from
 * these — nothing invented.
 */
import { describe, it, expect } from 'vitest'
import { normalizeFlows, flowKpis, filterFlows, templateLabel, dateWindow } from '../flowsModel'
import type { AutomationFlow } from '@/api/portal-admin/types'

const sample: AutomationFlow[] = [
  {
    flow_id: 'f1',
    name: 'Ramadan 2026',
    status: 'active',
    start_date: '2026-03-01',
    end_date: '2026-03-30',
    steps_count: 5,
    template_id: 'ramadan_30d'
  },
  { flow_id: 'f2', name: 'Welcome series', status: 'active', steps_count: 3 },
  { flow_id: 'f3', name: 'Win-back lapsed', status: 'paused', steps_count: 4 },
  { flow_id: 'f4', name: 'Payday blast', status: 'draft', steps_count: 2 }
]

describe('normalizeFlows', () => {
  it('passes a bare array; unwraps { flows } and { items }', () => {
    expect(normalizeFlows(sample)).toHaveLength(4)
    expect(normalizeFlows({ flows: sample })).toHaveLength(4)
    expect(normalizeFlows({ items: sample })).toHaveLength(4)
  })
  it('returns [] for null / unexpected shapes', () => {
    expect(normalizeFlows(null as never)).toEqual([])
    expect(normalizeFlows({} as never)).toEqual([])
  })
})

describe('flowKpis', () => {
  it('counts total / active / paused and sums steps', () => {
    const k = flowKpis(sample)
    expect(k.total).toBe(4)
    expect(k.active).toBe(2) // f1, f2
    expect(k.paused).toBe(1) // f3
    expect(k.totalSteps).toBe(14) // 5 + 3 + 4 + 2
  })
  it('treats status case-insensitively', () => {
    expect(flowKpis([{ flow_id: 'x', status: 'ACTIVE' }]).active).toBe(1)
  })
  it('is safe on empty', () => {
    expect(flowKpis([])).toEqual({ total: 0, active: 0, paused: 0, totalSteps: 0 })
  })
})

describe('filterFlows', () => {
  it('returns all for status "all" + empty query', () => {
    expect(filterFlows(sample, { status: 'all', query: '' })).toHaveLength(4)
  })
  it('filters by status (case-insensitive)', () => {
    expect(filterFlows(sample, { status: 'active', query: '' }).map((f) => f.flow_id)).toEqual([
      'f1',
      'f2'
    ])
    expect(filterFlows(sample, { status: 'paused', query: '' }).map((f) => f.flow_id)).toEqual([
      'f3'
    ])
  })
  it('filters by case-insensitive name substring', () => {
    expect(filterFlows(sample, { status: 'all', query: 'win' }).map((f) => f.flow_id)).toEqual([
      'f3'
    ])
  })
  it('combines status + query', () => {
    expect(
      filterFlows(sample, { status: 'active', query: 'ramadan' }).map((f) => f.flow_id)
    ).toEqual(['f1'])
  })
})

describe('templateLabel', () => {
  it('prints template_id, falls back to literal "custom"', () => {
    expect(templateLabel({ flow_id: 'a', template_id: 'ramadan_30d' })).toBe('ramadan_30d')
    expect(templateLabel({ flow_id: 'b' })).toBe('custom')
  })
})

describe('dateWindow', () => {
  it('joins start → end, em-dash when a side is absent', () => {
    expect(dateWindow({ flow_id: 'a', start_date: '2026-03-01', end_date: '2026-03-30' })).toBe(
      '2026-03-01 → 2026-03-30'
    )
    expect(dateWindow({ flow_id: 'b', start_date: '2026-05-15' })).toBe('2026-05-15 → —')
    expect(dateWindow({ flow_id: 'c' })).toBe('— → —')
  })
})
