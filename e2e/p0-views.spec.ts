import { test, expect } from '@playwright/test'

/**
 * P0 view rendering — exercised in DEMO mode.
 *
 * We use the `?brand=demo` contract (brand param BEFORE the hash) rather than a
 * fake `kix_token`. A fake token is *invalid*: the first portal-admin call
 * (overview/campaigns/settings all make one) returns 401, and kixHttp's
 * interceptor then redirects to `/landing/signin.html` — so the view never
 * actually renders. Demo mode bypasses tokenGuard AND makes kixHttp 401s
 * fail-soft, so the view stays mounted with no backend. This mirrors how the
 * portal is reached without a real session.
 *
 * `?brand=demo` MUST sit before the hash (`/portal/?brand=demo#/overview`):
 * kixHttp's 401 path only reads `location.search`, not the hash query.
 */
const demo = (route: string) => `/portal/?brand=demo#/${route}`

test.describe('P0 views render', () => {
  for (const route of ['overview', 'games', 'campaigns', 'settings', 'builder']) {
    test(`/${route} renders without crashing`, async ({ page }) => {
      await page.goto(demo(route))
      await page.waitForLoadState('networkidle')

      // Reachability: the route must land on itself, NOT bounce to
      // art-design-pro's /auth/login or KiX signin. The old assertions (body
      // non-empty, no crash text) passed even on a redirected auth page — a
      // blind spot that hid any routing/redirect bounce.
      expect(page.url(), `${route} bounced to an auth page`).not.toContain('/auth/login')
      expect(page.url(), `${route} bounced to signin`).not.toContain('/landing/signin')
      expect(page.url(), `${route} did not land on its route`).toContain(`#/${route}`)

      const body = await page.textContent('body')
      expect(body, `${route} returned empty body`).toBeTruthy()
      expect(body, `${route} crashed`).not.toContain('Cannot read')
      expect(body, `${route} crashed`).not.toContain('TypeError')
    })
  }

  // Regression guard for the "empty sidebar" fix (ensurePortalMenu): the KiX
  // menu is populated independently of art-design-pro's login-gated flow, so
  // the sidebar must render menu items, not an empty rail.
  test('sidebar renders the KiX menu', async ({ page }) => {
    await page.goto(demo('overview'))
    await page.waitForLoadState('networkidle')

    const sidebar = page.locator('.layout-sidebar')
    await expect(sidebar).toBeVisible()
    await expect(sidebar).not.toHaveClass(/no-border/) // no-border == empty menuList
    expect(await sidebar.locator('.el-menu-item, .el-sub-menu').count()).toBeGreaterThan(0)
  })
})
