import { describe, it, expect } from 'vitest'
import {
  normalizeAbTests,
  abTestKpis,
  filterAbTests,
  liftLabel,
  pValueLabel
} from '../abTestsModel'
import type { AbTest } from '@/api/portal-admin/types'

const sample: AbTest[] = [
  { id: 't1', name: 'CTR test', status: 'running', lift_pct: 4.2, p_value: 0.21 },
  { id: 't2', name: 'Copy test', status: 'significant', lift_pct: 12.8, p_value: 0.03 },
  { id: 't3', name: 'Reward test', status: 'shipped', lift_pct: 8.1, p_value: 0.04 }
]

describe('normalizeAbTests', () => {
  it('passes bare array; unwraps items / abtests / ab_tests', () => {
    expect(normalizeAbTests(sample)).toHaveLength(3)
    expect(normalizeAbTests({ items: sample })).toHaveLength(3)
    expect(normalizeAbTests({ abtests: sample })).toHaveLength(3)
    expect(normalizeAbTests({ ab_tests: sample })).toHaveLength(3)
  })
  it('returns [] for null / unexpected', () => {
    expect(normalizeAbTests(null as never)).toEqual([])
    expect(normalizeAbTests({} as never)).toEqual([])
  })
})

describe('abTestKpis', () => {
  it('counts total / running / significant / shipped', () => {
    const k = abTestKpis(sample)
    expect(k).toEqual({ total: 3, running: 1, significant: 1, shipped: 1 })
  })
  it('safe on empty', () => {
    expect(abTestKpis([])).toEqual({ total: 0, running: 0, significant: 0, shipped: 0 })
  })
})

describe('filterAbTests', () => {
  it('all + empty query → everything', () => {
    expect(filterAbTests(sample, { status: 'all', query: '' })).toHaveLength(3)
  })
  it('filters by status', () => {
    expect(filterAbTests(sample, { status: 'running', query: '' }).map((t) => t.id)).toEqual(['t1'])
  })
  it('filters by name substring (case-insensitive)', () => {
    expect(filterAbTests(sample, { status: 'all', query: 'copy' }).map((t) => t.id)).toEqual(['t2'])
  })
})

describe('liftLabel / pValueLabel', () => {
  it('liftLabel: signed percent, em-dash when null', () => {
    expect(liftLabel({ id: 'a', lift_pct: 4.2 })).toBe('+4.2%')
    expect(liftLabel({ id: 'b', lift_pct: -1.5 })).toBe('-1.5%')
    expect(liftLabel({ id: 'c' })).toBe('—')
  })
  it('pValueLabel: 2-dp, em-dash when null', () => {
    expect(pValueLabel({ id: 'a', p_value: 0.034 })).toBe('0.03')
    expect(pValueLabel({ id: 'b' })).toBe('—')
  })
})
