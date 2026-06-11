import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('kix_token', 'test-token'))
})

test.describe('P0 views render', () => {
  for (const route of ['overview', 'games', 'campaigns', 'settings', 'builder']) {
    test(`/${route} renders without crashing`, async ({ page }) => {
      await page.goto(`/portal/#/${route}`)
      await page.waitForLoadState('networkidle')
      const body = await page.textContent('body')
      expect(body, `${route} returned empty body`).toBeTruthy()
      expect(body, `${route} crashed`).not.toContain('Cannot read')
      expect(body, `${route} crashed`).not.toContain('TypeError')
    })
  }
})
