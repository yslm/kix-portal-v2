/**
 * Format a number as Singapore Dollars (S$).
 * - Uses thousands separators
 * - Trims trailing zeros (S$100 not S$100.00)
 * - Falls back to S$0 for undefined / null / NaN inputs
 *
 * Lifted from Overview.vue's inline fmtSgd helper. Shared across portal-v2
 * views that render currency.
 */
export function fmtSgd(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return 'S$0'
  const formatted = new Intl.NumberFormat('en-SG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(n)
  return `S$${formatted}`
}
