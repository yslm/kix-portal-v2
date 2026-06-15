/**
 * builderModel — pure (UI-free) logic for the Builder entry view.
 *
 * Real data: the opportunity-score endpoint returns { score, hints[] }.
 * The module gallery is static UI (6 build blocks mirroring the legacy
 * `data-mod` sections). KPIs derive only from the real score/hints —
 * nothing invented.
 */
import type { OpportunityScore } from '@/api/portal-admin/types'

/** Static build-block gallery — 6 cards mirroring the legacy `data-mod`
 *  sections (portal.html:879…1129), with an icon per block. */
export const BUILD_MODULES = [
  { id: 'game', i18nKey: 'portal.builder.mod.game.label', icon: 'ri:gamepad-line' },
  { id: 'voucher', i18nKey: 'portal.builder.mod.voucher.label', icon: 'ri:coupon-3-line' },
  { id: 'rule', i18nKey: 'portal.builder.mod.rule.label', icon: 'ri:git-branch-line' },
  { id: 'schedule', i18nKey: 'portal.builder.mod.schedule.label', icon: 'ri:calendar-line' },
  { id: 'safety', i18nKey: 'portal.builder.mod.safety.label', icon: 'ri:shield-check-line' },
  { id: 'tournament', i18nKey: 'portal.builder.mod.tournament.label', icon: 'ri:trophy-line' }
] as const

export type BuildModuleId = (typeof BUILD_MODULES)[number]['id']

/** Qualitative band for the score ring/colour. low <40, mid <70, else high. */
export function scoreTone(score: number): 'low' | 'mid' | 'high' {
  if (score < 40) return 'low'
  if (score < 70) return 'mid'
  return 'high'
}

/** Potential gain = sum of the hint points (how much score the merchant can
 *  still unlock). 0 when there are no hints. */
export function potentialGain(opp: OpportunityScore | null): number {
  if (!opp || !Array.isArray(opp.hints)) return 0
  return opp.hints.reduce((sum, h) => sum + (h.points ?? 0), 0)
}

/** Clamp the score to 0-100 for the progress ring width. */
export function scorePct(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)))
}
