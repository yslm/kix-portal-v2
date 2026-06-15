/**
 * vipTiersModel — pure (UI-free) logic for the VIP tiers view.
 *
 * Real fields (v2 LoyaltyTier): name / min_xp / perk; the distribution
 * endpoint extends each tier with a real `members` count + a top-level
 * `sampled_members`. KPIs + the ladder/distribution joins derive only
 * from these — nothing invented.
 */
import type {
  LoyaltyTier,
  LoyaltyTierDistribution,
  LoyaltyTiersResponse,
  LoyaltyTierDistributionResponse
} from '@/api/portal-admin/types'

/** Canonical shape is `{ tiers }`; a bare array is tolerated defensively. */
export function normalizeTiers(
  raw: LoyaltyTiersResponse | LoyaltyTier[] | undefined
): LoyaltyTier[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object' && Array.isArray(raw.tiers)) return raw.tiers
  return []
}

export interface DistributionResult {
  rows: LoyaltyTierDistribution[]
  sampled: number
}

export function normalizeDistribution(
  raw: LoyaltyTierDistributionResponse | undefined
): DistributionResult {
  if (raw && typeof raw === 'object') {
    return {
      rows: Array.isArray(raw.distribution) ? raw.distribution : [],
      sampled: typeof raw.sampled_members === 'number' ? raw.sampled_members : 0
    }
  }
  return { rows: [], sampled: 0 }
}

/** A ladder row with its member count joined in (by case-insensitive name). */
export interface LadderRow extends LoyaltyTier {
  members: number | null
}

/** Join distribution member counts onto the tier ladder by name. members is
 *  null when the distribution is unavailable (503) so the column can show an
 *  em-dash instead of a misleading 0. */
export function mergeMembers(tiers: LoyaltyTier[], dist: LoyaltyTierDistribution[]): LadderRow[] {
  const byName = new Map<string, number>()
  for (const d of dist) byName.set(d.name.toLowerCase(), d.members)
  const hasDist = dist.length > 0
  return tiers.map((t) => ({
    ...t,
    members: hasDist ? (byName.get(t.name.toLowerCase()) ?? 0) : null
  }))
}

export interface TierKpis {
  total: number
  sampledMembers: number
  topThreshold: number
  withPerks: number
}

export function tierKpis(tiers: LoyaltyTier[], sampled: number): TierKpis {
  return {
    total: tiers.length,
    sampledMembers: sampled,
    topThreshold: tiers.reduce((m, t) => Math.max(m, t.min_xp ?? 0), 0),
    withPerks: tiers.filter((t) => (t.perk ?? '').trim().length > 0).length
  }
}

/** Max members across buckets, floored at 1 to avoid divide-by-zero
 *  (legacy `Math.max(1, ...)` at portal.html:4100). */
export function maxBucket(dist: LoyaltyTierDistribution[]): number {
  return Math.max(1, ...dist.map((d) => d.members))
}

export function barPct(members: number, dist: LoyaltyTierDistribution[]): number {
  return Math.round((100 * members) / maxBucket(dist))
}
