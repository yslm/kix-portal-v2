/**
 * casesModel — pure logic for the Case Studio prospects grid.
 *
 * Real fields (v2 CaseStudy): prospect_id / company_name / primary_url /
 * tagline / research_status. KPIs + filter derive only from these.
 */
import { describe, it, expect } from 'vitest'
import { normalizeCases, displayName, statusBadge, caseKpis, filterCases } from '../casesModel'
import type { CaseStudy } from '@/api/portal-admin/types'

const sample: CaseStudy[] = [
  {
    prospect_id: 'nana',
    company_name: 'Nana',
    tagline: 'Saudi q-commerce',
    research_status: 'complete'
  },
  { prospect_id: 'starbucks_sg', company_name: 'Starbucks SG', research_status: 'in_progress' },
  { prospect_id: 'draft_co', company_name: 'Draft Co', research_status: 'draft' },
  { prospect_id: 'no_status' } // missing status
]

describe('normalizeCases', () => {
  it('passes a bare array; unwraps { prospects } and { items }', () => {
    expect(normalizeCases(sample)).toHaveLength(4)
    expect(normalizeCases({ prospects: sample })).toHaveLength(4)
    expect(normalizeCases({ items: sample })).toHaveLength(4)
  })
  it('returns [] for null / unexpected shapes', () => {
    expect(normalizeCases(null as never)).toEqual([])
    expect(normalizeCases({} as never)).toEqual([])
  })
})

describe('displayName', () => {
  it('prefers company_name, falls back to prospect_id then "Prospect"', () => {
    expect(displayName({ prospect_id: 'x', company_name: 'Acme' })).toBe('Acme')
    expect(displayName({ prospect_id: 'just-id' })).toBe('just-id')
    expect(displayName({ prospect_id: '' })).toBe('Prospect')
  })
})

describe('statusBadge', () => {
  it('maps the legacy binary colour intent', () => {
    expect(statusBadge({ prospect_id: 'a', research_status: 'complete' })).toBe('active')
    expect(statusBadge({ prospect_id: 'b', research_status: 'draft' })).toBe('draft')
    expect(statusBadge({ prospect_id: 'c', research_status: 'in_progress' })).toBe('pending')
    expect(statusBadge({ prospect_id: 'd' })).toBeUndefined()
  })
})

describe('caseKpis', () => {
  it('buckets by research_status', () => {
    const k = caseKpis(sample)
    expect(k.total).toBe(4)
    expect(k.complete).toBe(1)
    expect(k.inProgress).toBe(1)
    expect(k.draft).toBe(1)
  })
  it('is safe on empty', () => {
    expect(caseKpis([])).toEqual({ total: 0, complete: 0, inProgress: 0, draft: 0 })
  })
})

describe('filterCases', () => {
  it('returns all for filter "all" + empty query', () => {
    expect(filterCases(sample, { filter: 'all', query: '' })).toHaveLength(4)
  })
  it('filters by status bucket', () => {
    expect(
      filterCases(sample, { filter: 'complete', query: '' }).map((c) => c.prospect_id)
    ).toEqual(['nana'])
    expect(
      filterCases(sample, { filter: 'in_progress', query: '' }).map((c) => c.prospect_id)
    ).toEqual(['starbucks_sg'])
    expect(filterCases(sample, { filter: 'draft', query: '' }).map((c) => c.prospect_id)).toEqual([
      'draft_co'
    ])
  })
  it('searches name / url / tagline, case-insensitive', () => {
    expect(
      filterCases(sample, { filter: 'all', query: 'q-commerce' }).map((c) => c.prospect_id)
    ).toEqual(['nana'])
    expect(
      filterCases(sample, { filter: 'all', query: 'STARBUCKS' }).map((c) => c.prospect_id)
    ).toEqual(['starbucks_sg'])
  })
})
