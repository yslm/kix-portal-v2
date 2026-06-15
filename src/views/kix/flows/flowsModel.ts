/**
 * flowsModel — pure (UI-free) logic for the Flows view.
 *
 * Real fields (v2 AutomationFlow type, verified vs legacy
 * `kixLoadFlows()` renderer ~portal.html:8770):
 * flow_id / name / status / start_date / end_date / steps_count /
 * template_id. KPIs + filter derive only from these — nothing invented.
 *
 * Wave4 W4-C · B36: merchant-facing label is "Campaign", wire field
 * names stay "flow" (see portal.html:1532-1536) — we keep flow_id /
 * template_id unchanged.
 */
import type { AutomationFlow, FlowsListResponse } from '@/api/portal-admin/types'

export function normalizeFlows(raw: FlowsListResponse): AutomationFlow[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const d = raw as { flows?: AutomationFlow[]; items?: AutomationFlow[] }
    return d.flows ?? d.items ?? []
  }
  return []
}

export const FLOW_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'draft', label: 'Draft' },
  { key: 'ended', label: 'Ended' }
] as const

export type FlowFilterKey = (typeof FLOW_FILTERS)[number]['key']

export interface FlowKpis {
  total: number
  active: number
  paused: number
  totalSteps: number
}

export function flowKpis(list: AutomationFlow[]): FlowKpis {
  return list.reduce(
    (acc, f) => {
      acc.total += 1
      const s = (f.status ?? '').toLowerCase()
      if (s === 'active') acc.active += 1
      if (s === 'paused') acc.paused += 1
      acc.totalSteps += f.steps_count ?? 0
      return acc
    },
    { total: 0, active: 0, paused: 0, totalSteps: 0 }
  )
}

export function filterFlows(
  list: AutomationFlow[],
  opts: { status: FlowFilterKey; query: string }
): AutomationFlow[] {
  const q = opts.query.trim().toLowerCase()
  return list.filter((f) => {
    if (opts.status !== 'all' && (f.status ?? '').toLowerCase() !== opts.status) return false
    if (q && !(f.name ?? '').toLowerCase().includes(q)) return false
    return true
  })
}

/**
 * Legacy renderer prints `template_id`, falling back to the literal
 * string "custom" for blank-built flows (portal.html:8779).
 */
export function templateLabel(f: AutomationFlow): string {
  return f.template_id || 'custom'
}

/**
 * Legacy renderer prints the window as `${start} → ${end}` raw
 * (portal.html:8777). Em-dash keeps alignment when either is absent.
 */
export function dateWindow(f: AutomationFlow): string {
  const start = f.start_date ?? '—'
  const end = f.end_date ?? '—'
  return `${start} → ${end}`
}
