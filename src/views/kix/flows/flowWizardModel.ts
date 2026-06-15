/**
 * flowWizardModel — pure (UI-free) logic for the Flows 4-step creation
 * wizard. Ports the legacy portal.html flow (template grid ~8954 / customize
 * ~9034 / simulate ~9088 / publish ~9163). Heavy lifting (funnel decay, cost)
 * is backend-computed; this module only normalises responses + formats.
 */
import type { FlowTemplate, FlowTemplatesResponse, FlowSimulation } from '@/api/portal-admin/types'

/** Default simulation inputs (legacy #flow-input-audience / -baserate). */
export const DEFAULT_AUDIENCE = 100000
export const DEFAULT_BASE_REPEAT_RATE = 0.3

/** Tolerate `{ templates }` / `{ items }` / bare array. */
export function normalizeTemplates(raw: FlowTemplatesResponse | FlowTemplate[]): FlowTemplate[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') return raw.templates ?? raw.items ?? []
  return []
}

/** Format a money amount with the simulation's currency symbol (e.g. "SAR"). */
export function fmtMoney(symbol: string | undefined, amount: number | undefined): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—'
  const sym = symbol || 'S$'
  return `${sym}${Math.round(amount).toLocaleString('en-US')}`
}

/** Plain integer formatter (em-dash when absent). */
export function fmtInt(n: number | undefined): string {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—'
  return Math.round(n).toLocaleString('en-US')
}

export interface FunnelBar {
  label: string
  completers: number
  pct: number
}

/** Step funnel as bars normalised to the largest step (legacy ~9137). */
export function funnelBars(sim: FlowSimulation | null): FunnelBar[] {
  const steps = sim?.step_funnel ?? []
  if (steps.length === 0) return []
  const max = Math.max(...steps.map((s) => s.completers || 0), 1)
  return steps.map((s) => ({
    label: s.label || s.step_id || 'Step',
    completers: s.completers || 0,
    pct: Math.round(((s.completers || 0) / max) * 100)
  }))
}

/** The four headline sim cards, formatted (reach / completers / cost / CPC). */
export function simCards(sim: FlowSimulation | null): { label: string; value: string }[] {
  return [
    { label: 'Projected reach', value: fmtInt(sim?.projected_reach) },
    { label: 'Final completers', value: fmtInt(sim?.final_completers) },
    { label: 'Total cost', value: fmtMoney(sim?.currency_symbol, sim?.projected_total_cost) },
    {
      label: 'Cost per completer',
      value: fmtMoney(sim?.currency_symbol, sim?.projected_cost_per_completer)
    }
  ]
}

/** Validate the simulation inputs (positive audience, 0..1 base rate). */
export function validateSimInputs(audience: number, baseRate: number): string | null {
  if (!Number.isFinite(audience) || audience <= 0) return 'Enter an audience size above zero'
  if (!Number.isFinite(baseRate) || baseRate < 0 || baseRate > 1)
    return 'Base repeat rate must be between 0 and 1'
  return null
}

/** Publish confirmation sentence (legacy ~9174). */
export function publishedSentence(
  name: string | undefined,
  start: string | undefined,
  end: string | undefined,
  steps: number | undefined
): string {
  const nm = name || 'Your flow'
  const window = start && end ? ` from ${start} to ${end}` : ''
  const n = typeof steps === 'number' ? `${steps} step${steps === 1 ? '' : 's'}` : 'Its steps'
  return `"${nm}" is live${window} · ${n} will fire automatically.`
}
