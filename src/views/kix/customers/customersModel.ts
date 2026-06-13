/**
 * customersModel — pure (UI-free) logic for the CustomerList view.
 *
 * Real backend row (portal_admin.py · _real_customer_rows ~line 1990):
 * handle / channel / first_seen / plays / redeems / last_active. Kept
 * framework-free for unit testing (see customersModel.spec.ts).
 */
import type { Customer, CustomersListResponse } from '@/api/portal-admin/types'

/** Normalise the wire shapes to Customer[]: bare array | { customers } |
 *  { items } (legacy renderer reads `(d && d.customers) || []`). */
export function normalizeCustomers(raw: CustomersListResponse): Customer[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const d = raw as { customers?: Customer[]; items?: Customer[] }
    return d.customers ?? d.items ?? []
  }
  return []
}

/** Legacy renderer reads `c.name || c.handle` (portal.html ~line 7313);
 *  em-dash when neither is present. */
export function displayName(c: Customer): string {
  return c.name || c.handle || '—'
}

export type SegmentKey = 'regular' | 'returning' | 'new'

export interface Segment {
  key: SegmentKey
  label: string
  emoji: string
}

/** Owner-language segment, ported verbatim from the legacy `_seg()`
 *  (portal.html ~line 5118) — derived ONLY from real plays/redeems:
 *    redeems > 0 && plays >= 5 → Regular
 *    plays >= 2                → Came back (returning)
 *    else                      → New
 */
export function segment(c: Customer): Segment {
  const p = c.plays || 0
  const r = c.redeems || 0
  if (r > 0 && p >= 5) return { key: 'regular', label: 'Regular', emoji: '⭐' }
  if (p >= 2) return { key: 'returning', label: 'Came back', emoji: '🔁' }
  return { key: 'new', label: 'New', emoji: '✨' }
}

/** Segment-filter keys surfaced in the toolbar. */
export const SEGMENT_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'regular', label: '⭐ Regular' },
  { key: 'returning', label: '🔁 Came back' },
  { key: 'new', label: '✨ New' }
] as const

export type SegmentFilterKey = (typeof SEGMENT_FILTERS)[number]['key']

export interface CustomerKpis {
  total: number
  regulars: number
  totalPlays: number
  totalRedeems: number
}

/** Honest aggregates of real fields. */
export function customerKpis(list: Customer[]): CustomerKpis {
  return list.reduce<CustomerKpis>(
    (acc, c) => {
      acc.total += 1
      if (segment(c).key === 'regular') acc.regulars += 1
      acc.totalPlays += c.plays || 0
      acc.totalRedeems += c.redeems || 0
      return acc
    },
    { total: 0, regulars: 0, totalPlays: 0, totalRedeems: 0 }
  )
}

/** Client-side filter by segment key + case-insensitive name/handle search. */
export function filterCustomers(
  list: Customer[],
  opts: { segment: SegmentFilterKey; query: string }
): Customer[] {
  const q = opts.query.trim().toLowerCase()
  return list.filter((c) => {
    if (opts.segment !== 'all' && segment(c).key !== opts.segment) return false
    if (q) {
      const hay = `${c.name ?? ''} ${c.handle ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}
