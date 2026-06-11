import type {
  NavigationGuardWithThis,
  RouteLocationNormalized,
  NavigationGuardNext
} from 'vue-router'

/**
 * Port of portal.html:27-42 token guard.
 *
 * Redirects to /landing/signin.html when neither a KiX token nor a `brand`
 * query parameter is present. The `brand` escape hatch keeps anonymous demo
 * surfaces working (e.g., Case Studio deck links).
 *
 * NOTE on hash-mode routing: vue-router's `to.query` only parses the query
 * string inside the hash. Legacy portal.html uses `?brand=demo` BEFORE the
 * hash (in `location.search`). We therefore check BOTH sources so links like
 * `https://host/portal/?brand=demo#/overview` still bypass auth.
 */
export const tokenGuard: NavigationGuardWithThis<unknown> = (
  to: RouteLocationNormalized,
  _from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  try {
    const hasToken = !!(
      localStorage.getItem('kix_token') || localStorage.getItem('kix_portal_token')
    )
    const hasBrand = !!to.query.brand || new URLSearchParams(window.location.search).has('brand')
    if (!hasToken && !hasBrand) {
      const nextUrl = encodeURIComponent(
        window.location.pathname + window.location.search + window.location.hash
      )
      window.location.replace('/landing/signin.html?next=' + nextUrl)
      return
    }
    next()
  } catch {
    next() // never block on guard's own exception
  }
}
