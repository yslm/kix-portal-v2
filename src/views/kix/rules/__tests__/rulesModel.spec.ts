import { describe, it, expect } from 'vitest'
import { normalizeRules, ruleKpis, filterRules } from '../rulesModel'
import type { Rule } from '@/api/portal-admin/types'

const sample: Rule[] = [
  {
    id: 'r1',
    name: 'Pause overspend',
    state: 'on',
    condition: 'spend>100',
    action: 'pause',
    scope: 'All'
  },
  {
    id: 'r2',
    name: 'Scale winners',
    state: 'on',
    condition: 'ROAS>4',
    action: 'scale',
    scope: 'Active'
  },
  {
    id: 'r3',
    name: 'Low balance',
    state: 'notify_only',
    condition: 'runway<7',
    action: 'notify',
    scope: 'Wallet'
  },
  {
    id: 'r4',
    name: 'Stop high CPA',
    state: 'off',
    condition: 'CPA>10',
    action: 'pause',
    scope: 'All'
  }
]

describe('normalizeRules', () => {
  it('passes bare array; unwraps items / rules / automations', () => {
    expect(normalizeRules(sample)).toHaveLength(4)
    expect(normalizeRules({ items: sample })).toHaveLength(4)
    expect(normalizeRules({ rules: sample })).toHaveLength(4)
    expect(normalizeRules({ automations: sample })).toHaveLength(4)
  })
  it('returns [] for null / unexpected', () => {
    expect(normalizeRules(null as never)).toEqual([])
    expect(normalizeRules({} as never)).toEqual([])
  })
})

describe('ruleKpis', () => {
  it('counts total / on / off / notifyOnly', () => {
    expect(ruleKpis(sample)).toEqual({ total: 4, on: 2, off: 1, notifyOnly: 1 })
  })
  it('safe on empty', () => {
    expect(ruleKpis([])).toEqual({ total: 0, on: 0, off: 0, notifyOnly: 0 })
  })
})

describe('filterRules', () => {
  it('all + empty query → everything', () => {
    expect(filterRules(sample, { state: 'all', query: '' })).toHaveLength(4)
  })
  it('filters by state', () => {
    expect(filterRules(sample, { state: 'on', query: '' }).map((r) => r.id)).toEqual(['r1', 'r2'])
    expect(filterRules(sample, { state: 'notify_only', query: '' }).map((r) => r.id)).toEqual([
      'r3'
    ])
  })
  it('filters by name substring (case-insensitive)', () => {
    expect(filterRules(sample, { state: 'all', query: 'SCALE' }).map((r) => r.id)).toEqual(['r2'])
  })
})
