/**
 * geofencesModel — pure (UI-free) logic for the Geofences (stores) table.
 *
 * Real fields (v2 Location, verified vs legacy renderer portal.html:4737):
 * id / name / address / radius_m / status / place_id / lat / lng. KPIs +
 * filter derive only from these — nothing invented. A store is "geocoded"
 * when it has a resolved place_id or a real lat+lng pair.
 */
import type { GeofencesListResponse, Location } from '@/api/portal-admin/types'

const DEFAULT_RADIUS_M = 50

export function normalizeGeofences(raw: GeofencesListResponse | undefined): Location[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const d = raw as { locations?: Location[]; items?: Location[] }
    return d.locations ?? d.items ?? []
  }
  return []
}

/** Legacy renderer reads `${l.radius_m||50} m` (portal.html:4737). */
export function radiusDisplay(loc: Location): string {
  const r = typeof loc.radius_m === 'number' ? loc.radius_m : DEFAULT_RADIUS_M
  return `${r} m`
}

/** Legacy hard-codes "Active"; a real `status` field wins when present. */
export function statusFor(loc: Location): string {
  return loc.status || 'active'
}

/** A store is geocoded when address resolution succeeded — place_id or a
 *  real lat+lng pair. Drives the "Geocoded" KPI + filter. */
export function isGeocoded(loc: Location): boolean {
  return Boolean(loc.place_id) || (typeof loc.lat === 'number' && typeof loc.lng === 'number')
}

export const GEOFENCE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'geocoded', label: 'Geocoded' },
  { key: 'pending', label: 'Pending' }
] as const

export type GeofenceFilterKey = (typeof GEOFENCE_FILTERS)[number]['key']

export interface GeofenceKpis {
  total: number
  active: number
  geocoded: number
  avgRadius: number
}

/** Honest KPIs. avgRadius averages radius_m (50 m default when absent),
 *  rounded; 0 on an empty list. */
export function geofenceKpis(list: Location[]): GeofenceKpis {
  if (list.length === 0) return { total: 0, active: 0, geocoded: 0, avgRadius: 0 }
  let active = 0
  let geocoded = 0
  let radiusSum = 0
  for (const loc of list) {
    if (statusFor(loc) === 'active') active += 1
    if (isGeocoded(loc)) geocoded += 1
    radiusSum += typeof loc.radius_m === 'number' ? loc.radius_m : DEFAULT_RADIUS_M
  }
  return { total: list.length, active, geocoded, avgRadius: Math.round(radiusSum / list.length) }
}

export function filterGeofences(
  list: Location[],
  opts: { filter: GeofenceFilterKey; query: string }
): Location[] {
  const q = opts.query.trim().toLowerCase()
  return list.filter((loc) => {
    if (opts.filter === 'geocoded' && !isGeocoded(loc)) return false
    if (opts.filter === 'pending' && isGeocoded(loc)) return false
    if (q) {
      const hay = `${loc.name ?? ''} ${loc.address ?? ''} ${loc.id ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}
