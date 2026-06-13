/**
 * rulesModel — pure logic for the Rules (Automations) view.
 * Real fields: id / name / state / condition / action / scope /
 * last_triggered_at.
 */
import type { Rule, RulesListResponse } from '@/api/portal-admin/types'

export function normalizeRules(raw: RulesListResponse): Rule[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const d = raw as { items?: Rule[]; rules?: Rule[]; automations?: Rule[] }
    return d.items ?? d.rules ?? d.automations ?? []
  }
  return []
}

export const RULE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'on', label: 'On' },
  { key: 'off', label: 'Off' },
  { key: 'notify_only', label: 'Notify only' }
] as const

export type RuleFilterKey = (typeof RULE_FILTERS)[number]['key']

export interface RuleKpis {
  total: number
  on: number
  off: number
  notifyOnly: number
}

export function ruleKpis(list: Rule[]): RuleKpis {
  return list.reduce<RuleKpis>(
    (acc, r) => {
      acc.total += 1
      if (r.state === 'on') acc.on += 1
      else if (r.state === 'off') acc.off += 1
      else if (r.state === 'notify_only') acc.notifyOnly += 1
      return acc
    },
    { total: 0, on: 0, off: 0, notifyOnly: 0 }
  )
}

export function filterRules(list: Rule[], opts: { state: RuleFilterKey; query: string }): Rule[] {
  const q = opts.query.trim().toLowerCase()
  return list.filter((r) => {
    if (opts.state !== 'all' && r.state !== opts.state) return false
    if (q && !(r.name ?? '').toLowerCase().includes(q)) return false
    return true
  })
}
