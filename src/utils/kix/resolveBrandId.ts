/**
 * Resolve the active brand ID for portal-admin API calls.
 *
 * Priority:
 *   1. `?brand=` query parameter (sales demos / debugging escape hatch)
 *   2. localStorage.kix_brand_id (persisted from signin / brand switcher)
 *   3. caller-provided fallback (defaults to "demo_brand")
 *
 * Mirrors the legacy `_bid()` helper in kix-platform/landing/portal.html.
 */
export function resolveBrandId(fallback = 'demo_brand'): string {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('brand')
    if (fromQuery) return fromQuery
    const fromStorage = localStorage.getItem('kix_brand_id')
    if (fromStorage) return fromStorage
  } catch {
    // ignore — fall through to default
  }
  return fallback
}
