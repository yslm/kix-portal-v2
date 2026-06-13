/**
 * audiencesModel — pure (UI-free) logic for the Audiences view.
 * Real fields: id / name / type / size_estimate / geofence_m /
 * created_at / last_used_at.
 */
import type { Audience, AudiencesListResponse } from '@/api/portal-admin/types'

export function normalizeAudiences(raw: AudiencesListResponse): Audience[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const d = raw as { audiences?: Audience[]; items?: Audience[] }
    return d.audiences ?? d.items ?? []
  }
  return []
}

export const AUDIENCE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'geofence', label: 'Geofence' },
  { key: 'lookalike', label: 'Lookalike' },
  { key: 'retargeting', label: 'Retargeting' },
  { key: 'custom', label: 'Custom' }
] as const

export type AudienceFilterKey = (typeof AUDIENCE_FILTERS)[number]['key']

export interface AudienceKpis {
  total: number
  geofenced: number
  totalReach: number
  types: number
}

export function audienceKpis(list: Audience[]): AudienceKpis {
  const types = new Set<string>()
  const k = list.reduce(
    (acc, a) => {
      acc.total += 1
      if (a.geofence_m != null) acc.geofenced += 1
      acc.totalReach += a.size_estimate ?? 0
      if (a.type) types.add(a.type)
      return acc
    },
    { total: 0, geofenced: 0, totalReach: 0, types: 0 }
  )
  k.types = types.size
  return k
}

export function filterAudiences(
  list: Audience[],
  opts: { type: AudienceFilterKey; query: string }
): Audience[] {
  const q = opts.query.trim().toLowerCase()
  return list.filter((a) => {
    if (opts.type !== 'all' && a.type !== opts.type) return false
    if (q && !a.name.toLowerCase().includes(q)) return false
    return true
  })
}

export function sizeLabel(a: Audience): string {
  return a.size_estimate != null ? a.size_estimate.toLocaleString('en-US') : '—'
}
