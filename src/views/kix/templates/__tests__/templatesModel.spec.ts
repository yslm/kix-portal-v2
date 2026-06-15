/**
 * templatesModel — pure logic for the Templates gallery.
 *
 * Real fields (v2 Template): slug / name / cover_url / reskinable.
 * KPIs + filter derive only from these — nothing invented.
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeTemplates,
  displayName,
  templateKpis,
  filterTemplates,
  coverFallback
} from '../templatesModel'
import type { Template } from '@/api/portal-admin/types'

const sample: Template[] = [
  { slug: 'scratch-win', name: 'Scratch & Win', reskinable: true },
  { slug: 'spin-wheel', name: 'Spin the Wheel', reskinable: true },
  { slug: 'quiz-master', name: 'Quiz Master' }, // catalog-only
  { slug: 'puzzle-quest' } // no name, catalog-only
]

describe('normalizeTemplates', () => {
  it('passes a bare array; unwraps { games } and { items }', () => {
    expect(normalizeTemplates(sample)).toHaveLength(4)
    expect(normalizeTemplates({ games: sample })).toHaveLength(4)
    expect(normalizeTemplates({ items: sample })).toHaveLength(4)
  })
  it('returns [] for null / unexpected shapes', () => {
    expect(normalizeTemplates(null as never)).toEqual([])
    expect(normalizeTemplates({} as never)).toEqual([])
  })
})

describe('displayName', () => {
  it('prefers name, falls back to slug then "Template"', () => {
    expect(displayName({ slug: 's', name: 'Real Name' })).toBe('Real Name')
    expect(displayName({ slug: 'just-slug' })).toBe('just-slug')
    expect(displayName({ slug: '' })).toBe('Template')
  })
})

describe('templateKpis', () => {
  it('counts total / ready / catalog and distinct types', () => {
    const k = templateKpis(sample)
    expect(k.total).toBe(4)
    expect(k.ready).toBe(2) // 2 reskinable
    expect(k.catalog).toBe(2) // rest
    expect(k.types).toBe(4) // scratch / spin / quiz / puzzle
  })
  it('is safe on empty', () => {
    expect(templateKpis([])).toEqual({ total: 0, ready: 0, catalog: 0, types: 0 })
  })
})

describe('filterTemplates', () => {
  it('returns all for filter "all" + empty query', () => {
    expect(filterTemplates(sample, { filter: 'all', query: '' })).toHaveLength(4)
  })
  it('filters by ready / catalog', () => {
    expect(filterTemplates(sample, { filter: 'ready', query: '' }).map((t) => t.slug)).toEqual([
      'scratch-win',
      'spin-wheel'
    ])
    expect(filterTemplates(sample, { filter: 'catalog', query: '' }).map((t) => t.slug)).toEqual([
      'quiz-master',
      'puzzle-quest'
    ])
  })
  it('matches name OR slug, case-insensitive', () => {
    expect(filterTemplates(sample, { filter: 'all', query: 'quiz' }).map((t) => t.slug)).toEqual([
      'quiz-master'
    ])
    expect(filterTemplates(sample, { filter: 'all', query: 'PUZZLE' }).map((t) => t.slug)).toEqual([
      'puzzle-quest'
    ])
  })
})

describe('coverFallback', () => {
  it('is deterministic per slug bucket; em-dash-safe on missing slug', () => {
    const scratch = coverFallback({ slug: 'scratch-win' })
    expect(scratch.emoji).toBe('🎟️')
    expect(scratch.gradient).toContain('linear-gradient')
    expect(coverFallback({ slug: 'spin-wheel' }).emoji).toBe('🎰')
    expect(coverFallback({ slug: '' }).emoji).toBe('🎲') // other bucket
  })
})
