/**
 * casesModel — pure (UI-free) logic for the Case Studio prospects grid.
 *
 * Real fields (v2 CaseStudy, verified vs case_studio.py + legacy renderer
 * portal.html:8475): prospect_id / company_name / primary_url / tagline /
 * research_status. KPIs + filter derive only from these — nothing invented.
 */
import type { CaseStudy, CasesListResponse } from '@/api/portal-admin/types'

/** Normalise wire shapes to CaseStudy[]: bare array | { prospects } |
 *  { items } (legacy reads `(d && d.prospects) || []`, portal.html:8466). */
export function normalizeCases(raw: CasesListResponse): CaseStudy[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const d = raw as { prospects?: CaseStudy[]; items?: CaseStudy[] }
    return d.prospects ?? d.items ?? []
  }
  return []
}

/** Legacy display chain (portal.html:8479): company_name → prospect_id →
 *  "Prospect". */
export function displayName(c: CaseStudy): string {
  return c.company_name || c.prospect_id || 'Prospect'
}

/** Maps research_status onto the shared StatusBadge palette, preserving the
 *  legacy binary colour intent (portal.html:8476): complete → green,
 *  draft → gray, anything else → amber. undefined when no signal. */
export function statusBadge(c: CaseStudy): string | undefined {
  const s = c.research_status
  if (!s) return undefined
  if (s === 'complete') return 'active'
  if (s === 'draft') return 'draft'
  return 'pending'
}

export const CASE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'complete', label: 'Complete' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'draft', label: 'Draft' }
] as const

export type CaseFilterKey = (typeof CASE_FILTERS)[number]['key']

export interface CaseKpis {
  total: number
  complete: number
  inProgress: number
  draft: number
}

/** Honest KPIs derived from research_status only. "inProgress" counts every
 *  non-complete, non-draft state (the legacy amber bucket). */
export function caseKpis(list: CaseStudy[]): CaseKpis {
  return list.reduce(
    (acc, c) => {
      acc.total += 1
      const s = c.research_status
      if (s === 'complete') acc.complete += 1
      else if (s === 'draft') acc.draft += 1
      else if (s) acc.inProgress += 1
      return acc
    },
    { total: 0, complete: 0, inProgress: 0, draft: 0 }
  )
}

export function filterCases(
  list: CaseStudy[],
  opts: { filter: CaseFilterKey; query: string }
): CaseStudy[] {
  const q = opts.query.trim().toLowerCase()
  return list.filter((c) => {
    if (opts.filter !== 'all') {
      const s = c.research_status
      if (opts.filter === 'complete' && s !== 'complete') return false
      if (opts.filter === 'draft' && s !== 'draft') return false
      if (opts.filter === 'in_progress' && (s === 'complete' || s === 'draft' || !s)) return false
    }
    if (q) {
      const hay = `${displayName(c)} ${c.primary_url ?? ''} ${c.tagline ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}
