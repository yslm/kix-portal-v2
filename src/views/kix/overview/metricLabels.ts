/**
 * Fixed card labels in legacy-canonical order (portal.html lines 1350-1356).
 * Paired with the MetricCard response array by index — LABELS[i] is the label
 * for data[i]. English-only; no new i18n keys.
 *
 * Extracted into a companion module so both MetricCards.vue and its spec can
 * import the same constant — preventing silent divergence when a label changes.
 */
export const LABELS = [
  'Impressions (game views)',
  'Plays · clicks',
  'Verified new customers',
  'Spent · CPA'
] as const

/**
 * Remix-icon identifiers for each metric card, parallel to LABELS by index.
 * Chosen to reflect each metric's domain:
 *   0 impressions  → eye
 *   1 plays/clicks → cursor
 *   2 verified new → user-follow
 *   3 spent/CPA    → money-dollar-circle
 */
export const ICONS = [
  'ri:eye-line',
  'ri:cursor-line',
  'ri:user-follow-line',
  'ri:money-dollar-circle-line'
] as const
