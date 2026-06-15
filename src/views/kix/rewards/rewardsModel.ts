/**
 * rewardsModel — pure (UI-free) logic for the Rewards Templates tab.
 *
 * Real fields (v2 RewardTemplate, verified vs legacy kixLoadPrizes
 * portal.html:5728): prize_id/id / name / type / offer_type /
 * inventory_count / original_price_cents / status. KPIs + filter derive
 * only from these; value uses fmtSgd on cents/100 — nothing invented.
 */
import type { RewardTemplate, RewardTemplatesResponse } from '@/api/portal-admin/types'
import { fmtSgd } from '@/utils/format/currency'

/** Canonical `{ prizes }`; `{ templates }` / `{ items }` / bare array
 *  tolerated defensively (legacy reads `(d && d.prizes) || []`). */
export function normalizeTemplates(raw: RewardTemplatesResponse | undefined): RewardTemplate[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const d = raw as {
      prizes?: RewardTemplate[]
      templates?: RewardTemplate[]
      items?: RewardTemplate[]
    }
    return d.prizes ?? d.templates ?? d.items ?? []
  }
  return []
}

/** SGD value from integer cents (legacy `_kixMoney(original_price_cents)`);
 *  null when absent so the card can hide the value line. */
export function valueFor(tpl: RewardTemplate): string | null {
  if (typeof tpl.original_price_cents !== 'number') return null
  return fmtSgd(tpl.original_price_cents / 100)
}

/** Legacy ternary (portal.html:5735): `== null ? 'unlimited' : count`. */
export function inventoryFor(tpl: RewardTemplate): string {
  return tpl.inventory_count == null ? 'unlimited' : String(tpl.inventory_count)
}

/** Higher-level kind (type) over the discount mechanic (offer_type). */
export function subtypeFor(tpl: RewardTemplate): string | null {
  return tpl.type ?? tpl.offer_type ?? null
}

export const REWARD_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'voucher', label: 'Vouchers' },
  { key: 'prize', label: 'Prizes' },
  { key: 'cashback', label: 'Cashback' }
] as const

export type RewardFilterKey = (typeof REWARD_FILTERS)[number]['key']

export interface RewardKpis {
  total: number
  active: number
  totalValue: string
  limited: number
}

/** Honest KPIs. totalValue sums original_price_cents (→ fmtSgd); limited =
 *  templates with a finite inventory_count. */
export function rewardKpis(list: RewardTemplate[]): RewardKpis {
  let active = 0
  let cents = 0
  let limited = 0
  for (const t of list) {
    if (t.status === 'active') active += 1
    if (typeof t.original_price_cents === 'number') cents += t.original_price_cents
    if (t.inventory_count != null) limited += 1
  }
  return { total: list.length, active, totalValue: fmtSgd(cents / 100), limited }
}

export function filterTemplates(
  list: RewardTemplate[],
  opts: { filter: RewardFilterKey; query: string }
): RewardTemplate[] {
  const q = opts.query.trim().toLowerCase()
  return list.filter((t) => {
    if (opts.filter !== 'all' && (t.type ?? '') !== opts.filter) return false
    if (q && !(t.name ?? '').toLowerCase().includes(q)) return false
    return true
  })
}
