/**
 * creativesModel — pure logic for the Creatives asset library.
 *
 * Real fields (v2 CreativeAsset): asset_id / filename / kind / bytes /
 * uploaded_at. KPIs + filter derive only from these.
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeCreatives,
  kindFor,
  sizeFor,
  uploadedAtFor,
  creativeKpis,
  filterCreatives
} from '../creativesModel'
import type { CreativeAsset } from '@/api/portal-admin/types'

const sample: CreativeAsset[] = [
  { asset_id: 'a1', filename: 'logo.png', kind: 'image', bytes: 51200 },
  { asset_id: 'a2', filename: 'hero.jpg', bytes: 2097152 }, // no kind → image, 2 MB
  { asset_id: 'a3', filename: 'promo.mp4', kind: 'video', bytes: 10485760 } // 10 MB
]

describe('normalizeCreatives', () => {
  it('passes a bare array; unwraps { items } and { creatives }', () => {
    expect(normalizeCreatives(sample)).toHaveLength(3)
    expect(normalizeCreatives({ items: sample })).toHaveLength(3)
    expect(normalizeCreatives({ creatives: sample })).toHaveLength(3)
  })
  it('returns [] for undefined / unexpected shapes', () => {
    expect(normalizeCreatives(undefined)).toEqual([])
    expect(normalizeCreatives({} as never)).toEqual([])
  })
})

describe('kindFor', () => {
  it('defaults missing kind to image', () => {
    expect(kindFor({ kind: 'video' })).toBe('video')
    expect(kindFor({})).toBe('image')
  })
})

describe('sizeFor', () => {
  it('KB under 1 MB, MB past it, em-dash when absent', () => {
    expect(sizeFor({ bytes: 51200 })).toBe('50 KB')
    expect(sizeFor({ bytes: 2097152 })).toBe('2.0 MB')
    expect(sizeFor({})).toBe('—')
    expect(sizeFor({ bytes: 0 })).toBe('—')
  })
})

describe('uploadedAtFor', () => {
  it('reads the wrapper formatted_display, then iso8601, then raw string', () => {
    expect(uploadedAtFor({ uploaded_at: { formatted_display: 'Jun 1, 2026' } })).toBe('Jun 1, 2026')
    expect(uploadedAtFor({ uploaded_at: { iso8601: '2026-06-01T00:00:00Z' } })).toBe(
      '2026-06-01T00:00:00Z'
    )
    expect(uploadedAtFor({ uploaded_at: '2026-06-01' })).toBe('2026-06-01')
    expect(uploadedAtFor({})).toBe('—')
  })
})

describe('creativeKpis', () => {
  it('counts total / images / videos and sums size', () => {
    const k = creativeKpis(sample)
    expect(k.total).toBe(3)
    expect(k.images).toBe(2) // logo + hero (no-kind default)
    expect(k.videos).toBe(1)
    expect(k.totalSize).toBe('12.0 MB') // 50KB + 2MB + 10MB ≈ 12.05 MB
  })
  it('is safe on empty', () => {
    expect(creativeKpis([])).toEqual({ total: 0, images: 0, videos: 0, totalSize: '0 KB' })
  })
})

describe('filterCreatives', () => {
  it('returns all for filter "all" + empty query', () => {
    expect(filterCreatives(sample, { filter: 'all', query: '' })).toHaveLength(3)
  })
  it('filters by kind (missing kind counts as image)', () => {
    expect(filterCreatives(sample, { filter: 'image', query: '' }).map((a) => a.asset_id)).toEqual([
      'a1',
      'a2'
    ])
    expect(filterCreatives(sample, { filter: 'video', query: '' }).map((a) => a.asset_id)).toEqual([
      'a3'
    ])
  })
  it('searches filename, case-insensitive', () => {
    expect(
      filterCreatives(sample, { filter: 'all', query: 'PROMO' }).map((a) => a.asset_id)
    ).toEqual(['a3'])
  })
})
