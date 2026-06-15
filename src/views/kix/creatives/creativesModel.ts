/**
 * creativesModel — pure (UI-free) logic for the Creatives asset library.
 *
 * Real fields (v2 CreativeAsset, verified vs legacy renderer
 * portal.html:6893): asset_id / filename / kind / bytes / uploaded_at.
 * KPIs + filter derive only from these — nothing invented.
 */
import type {
  CreativeAsset,
  CreativesListResponse,
  SettingsTimestamp
} from '@/api/portal-admin/types'

export function normalizeCreatives(raw: CreativesListResponse | undefined): CreativeAsset[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const d = raw as { items?: CreativeAsset[]; creatives?: CreativeAsset[] }
    return d.items ?? d.creatives ?? []
  }
  return []
}

/** Legacy default: `c.kind || 'image'` (portal.html:6894). */
export function kindFor(asset: CreativeAsset): string {
  return asset.kind || 'image'
}

/** Per-card size — `${Math.round(bytes/1024)} KB` (portal.html:6895),
 *  promoted to MB past 1024 KB. Em-dash when absent. */
export function sizeFor(asset: CreativeAsset): string {
  if (typeof asset.bytes !== 'number' || asset.bytes <= 0) return '—'
  const kb = asset.bytes / 1024
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${Math.round(kb)} KB`
}

/** Uploaded-at — settings-router wrapper `{ formatted_display, iso8601 }`
 *  (portal.html:6898), or a raw ISO string. Em-dash when absent. */
export function uploadedAtFor(asset: CreativeAsset): string {
  const ts: SettingsTimestamp | undefined = asset.uploaded_at
  if (!ts) return '—'
  if (typeof ts === 'string') return ts
  return ts.formatted_display ?? ts.iso8601 ?? '—'
}

export const CREATIVE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'image', label: 'Images' },
  { key: 'video', label: 'Videos' }
] as const

export type CreativeFilterKey = (typeof CREATIVE_FILTERS)[number]['key']

export interface CreativeKpis {
  total: number
  images: number
  videos: number
  totalSize: string
}

/** Honest KPIs. images/videos bucket by kindFor (missing kind → image,
 *  matching the legacy default); totalSize sums bytes, formatted. */
export function creativeKpis(list: CreativeAsset[]): CreativeKpis {
  let images = 0
  let videos = 0
  let byteSum = 0
  for (const a of list) {
    const k = kindFor(a)
    if (k === 'video') videos += 1
    else if (k === 'image') images += 1
    if (typeof a.bytes === 'number' && a.bytes > 0) byteSum += a.bytes
  }
  return { total: list.length, images, videos, totalSize: formatBytes(byteSum) }
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 KB'
  const kb = bytes / 1024
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${Math.round(kb)} KB`
}

export function filterCreatives(
  list: CreativeAsset[],
  opts: { filter: CreativeFilterKey; query: string }
): CreativeAsset[] {
  const q = opts.query.trim().toLowerCase()
  return list.filter((a) => {
    if (opts.filter !== 'all' && kindFor(a) !== opts.filter) return false
    if (q && !(a.filename ?? '').toLowerCase().includes(q)) return false
    return true
  })
}
