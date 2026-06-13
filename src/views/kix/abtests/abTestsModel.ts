/**
 * abTestsModel — pure logic for the AbTests view.
 * Real fields: id / name / campaign_a_name / campaign_b_name / metric /
 * status / lift_pct / p_value / winner / created_at.
 */
import type { AbTest, AbTestsListResponse } from '@/api/portal-admin/types'

export function normalizeAbTests(raw: AbTestsListResponse): AbTest[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const d = raw as { items?: AbTest[]; abtests?: AbTest[]; ab_tests?: AbTest[] }
    return d.items ?? d.abtests ?? d.ab_tests ?? []
  }
  return []
}

export const ABTEST_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'running', label: 'Running' },
  { key: 'significant', label: 'Significant' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'stopped', label: 'Stopped' }
] as const

export type AbTestFilterKey = (typeof ABTEST_FILTERS)[number]['key']

export interface AbTestKpis {
  total: number
  running: number
  significant: number
  shipped: number
}

export function abTestKpis(list: AbTest[]): AbTestKpis {
  return list.reduce<AbTestKpis>(
    (acc, t) => {
      acc.total += 1
      if (t.status === 'running') acc.running += 1
      if (t.status === 'significant') acc.significant += 1
      if (t.status === 'shipped') acc.shipped += 1
      return acc
    },
    { total: 0, running: 0, significant: 0, shipped: 0 }
  )
}

export function filterAbTests(
  list: AbTest[],
  opts: { status: AbTestFilterKey; query: string }
): AbTest[] {
  const q = opts.query.trim().toLowerCase()
  return list.filter((t) => {
    if (opts.status !== 'all' && t.status !== opts.status) return false
    if (q && !(t.name ?? '').toLowerCase().includes(q)) return false
    return true
  })
}

/** Signed percent; em-dash when null. */
export function liftLabel(t: AbTest): string {
  if (t.lift_pct == null) return '—'
  return `${t.lift_pct > 0 ? '+' : ''}${t.lift_pct}%`
}

/** p-value to 2 dp; em-dash when null. */
export function pValueLabel(t: AbTest): string {
  return t.p_value == null ? '—' : t.p_value.toFixed(2)
}
