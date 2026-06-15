/**
 * geofencesModel — pure logic for the Geofences (stores) table.
 *
 * Real fields (v2 Location): id / name / address / radius_m / status /
 * place_id / lat / lng. KPIs + filter derive only from these.
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeGeofences,
  radiusDisplay,
  statusFor,
  isGeocoded,
  geofenceKpis,
  filterGeofences
} from '../geofencesModel'
import type { Location } from '@/api/portal-admin/types'

const sample: Location[] = [
  { id: 'l1', name: 'Orchard', address: '1 Orchard Rd', radius_m: 100, place_id: 'p1' },
  { id: 'l2', name: 'Bugis', address: '2 Bugis St', radius_m: 200, lat: 1.3, lng: 103.8 },
  { id: 'l3', name: 'Tampines', address: '3 Tampines Ave' } // no radius, not geocoded
]

describe('normalizeGeofences', () => {
  it('passes a bare array; unwraps { locations } and { items }', () => {
    expect(normalizeGeofences(sample)).toHaveLength(3)
    expect(normalizeGeofences({ locations: sample })).toHaveLength(3)
    expect(normalizeGeofences({ items: sample })).toHaveLength(3)
  })
  it('returns [] for undefined / unexpected shapes', () => {
    expect(normalizeGeofences(undefined)).toEqual([])
    expect(normalizeGeofences({} as never)).toEqual([])
  })
})

describe('radiusDisplay', () => {
  it('shows radius_m, defaults to 50 m when absent', () => {
    expect(radiusDisplay({ id: 'a', radius_m: 120 })).toBe('120 m')
    expect(radiusDisplay({ id: 'b' })).toBe('50 m')
  })
})

describe('statusFor', () => {
  it('uses a real status, defaults to active', () => {
    expect(statusFor({ id: 'a', status: 'inactive' })).toBe('inactive')
    expect(statusFor({ id: 'b' })).toBe('active')
  })
})

describe('isGeocoded', () => {
  it('true on place_id or lat+lng, false otherwise', () => {
    expect(isGeocoded({ id: 'a', place_id: 'x' })).toBe(true)
    expect(isGeocoded({ id: 'b', lat: 1, lng: 2 })).toBe(true)
    expect(isGeocoded({ id: 'c', lat: 1 })).toBe(false) // lng missing
    expect(isGeocoded({ id: 'd' })).toBe(false)
  })
})

describe('geofenceKpis', () => {
  it('counts total / active / geocoded and averages radius (50 default)', () => {
    const k = geofenceKpis(sample)
    expect(k.total).toBe(3)
    expect(k.active).toBe(3) // all default active
    expect(k.geocoded).toBe(2) // l1 place_id, l2 lat+lng
    expect(k.avgRadius).toBe(117) // (100 + 200 + 50) / 3 = 116.67 → 117
  })
  it('is safe on empty', () => {
    expect(geofenceKpis([])).toEqual({ total: 0, active: 0, geocoded: 0, avgRadius: 0 })
  })
})

describe('filterGeofences', () => {
  it('returns all for filter "all" + empty query', () => {
    expect(filterGeofences(sample, { filter: 'all', query: '' })).toHaveLength(3)
  })
  it('filters by geocoded / pending', () => {
    expect(filterGeofences(sample, { filter: 'geocoded', query: '' }).map((l) => l.id)).toEqual([
      'l1',
      'l2'
    ])
    expect(filterGeofences(sample, { filter: 'pending', query: '' }).map((l) => l.id)).toEqual([
      'l3'
    ])
  })
  it('searches name / address / id, case-insensitive', () => {
    expect(filterGeofences(sample, { filter: 'all', query: 'bugis' }).map((l) => l.id)).toEqual([
      'l2'
    ])
  })
})
