import { test, expect } from '@playwright/test'

test.describe('Token guard', () => {
  test('passes with kix_token in localStorage', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('kix_token', 'test-token'))
    await page.goto('/portal/')
    // Should not redirect to signin
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).toContain('/portal/')
    expect(page.url()).not.toContain('/landing/signin.html')
  })
})
