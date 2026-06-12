/**
 * campaignsModel — pure (UI-free) logic for the Campaigns view.
 *
 * Centralises the field reconciliation between the REAL backend Campaign
 * model (portal_admin.py · class Campaign ~line 168 — `spend_sgd`,
 * `new_customers`, `cpa_sgd`, `ctr_pct`) and the legacy frontend aliases
 * (`spend_str`, `conversions`, `cpa_str`) that the demo mock + Overview
 * CampaignTable still use. Every accessor prefers the real numeric field
 * and falls back to the alias, never fabricating a missing value.
 *
 * Kept pure + framework-free so it can be unit-tested without mounting a
 * component (see campaignsModel.spec.ts).
 */
import type { Campaign, CampaignsListResponse } from '@/api/portal-admin/types'
import { fmtSgd } from '@/utils/format/currency'

/** Status-filter keys surfaced in the toolbar → the backend status values
 *  they match. Backend emits live / paused / review / ended. */
export const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'pending', label: 'Pending review' },
  { key: 'ended', label: 'Ended' }
] as const

export type StatusFilterKey = (typeof STATUS_FILTERS)[number]['key']

/** Filter key → the set of raw status strings it accepts. */
const STATUS_MATCH: Record<Exclude<StatusFilterKey, 'all'>, string[]> = {
  active: ['active', 'live'],
  paused: ['paused'],
  pending: ['pending', 'review'],
  ended: ['ended']
}

/** Normalise the wire shapes to Campaign[]: bare array | { campaigns } |
 *  { items } (the legacy renderer's "Marathon fix" tolerance). */
export function normalizeCampaigns(raw: CampaignsListResponse): Campaign[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    return (
      (raw as { campaigns?: Campaign[]; items?: Campaign[] }).campaigns ??
      (raw as { campaigns?: Campaign[]; items?: Campaign[] }).items ??
      []
    )
  }
  return []
}

/** Real "conversions" = verified new customers. Prefer the real
 *  `new_customers`; fall back to the legacy `conversions` alias; null
 *  when neither is present (→ em-dash, never a fabricated 0). */
export function conversionsOf(c: Campaign): number | null {
  return c.new_customers ?? c.conversions ?? null
}

export interface CampaignKpis {
  total: number
  active: number
  totalSpendSgd: number
  totalNewCustomers: number
}

/** Summary KPIs derived from the loaded list — all honest aggregates of
 *  real fields. "active" counts both the real "live" and "active". */
export function campaignKpis(list: Campaign[]): CampaignKpis {
  return list.reduce<CampaignKpis>(
    (acc, c) => {
      acc.total += 1
      if (c.status === 'live' || c.status === 'active') acc.active += 1
      acc.totalSpendSgd += c.spend_sgd ?? 0
      acc.totalNewCustomers += conversionsOf(c) ?? 0
      return acc
    },
    { total: 0, active: 0, totalSpendSgd: 0, totalNewCustomers: 0 }
  )
}

/** Client-side filter by status key + case-insensitive name substring. */
export function filterCampaigns(
  list: Campaign[],
  opts: { status: StatusFilterKey; query: string }
): Campaign[] {
  const q = opts.query.trim().toLowerCase()
  const accepted = opts.status === 'all' ? null : STATUS_MATCH[opts.status]
  return list.filter((c) => {
    if (accepted && !accepted.includes(String(c.status))) return false
    if (q && !c.name.toLowerCase().includes(q)) return false
    return true
  })
}

/** Spend: real numeric `spend_sgd` via fmtSgd, else pre-formatted
 *  `spend_str`, else em-dash. */
export function spendLabel(c: Campaign): string {
  if (c.spend_sgd != null) return fmtSgd(c.spend_sgd)
  return c.spend_str ?? '—'
}

/** CPA: real numeric `cpa_sgd` via fmtSgd, else pre-formatted `cpa_str`,
 *  else em-dash. */
export function cpaLabel(c: Campaign): string {
  if (c.cpa_sgd != null) return fmtSgd(c.cpa_sgd)
  return c.cpa_str ?? '—'
}

/** CTR: numeric → "x%", pre-formatted string passthrough, else em-dash. */
export function ctrLabel(c: Campaign): string {
  if (c.ctr_pct == null) return '—'
  return typeof c.ctr_pct === 'number' ? `${c.ctr_pct}%` : String(c.ctr_pct)
}
