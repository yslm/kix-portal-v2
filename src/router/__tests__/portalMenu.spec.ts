import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { ensurePortalMenu } from '../portalMenu'
import { useMenuStore } from '@/store/modules/menu'

/**
 * Regression test for the "empty sidebar" root cause (Week 7 visual review).
 *
 * art-design-pro populates menuStore only inside its login-gated
 * dynamic-route flow (beforeEach.ts handleDynamicRoutes, runs when
 * userStore.isLogin). KiX portal authenticates via its own tokenGuard and
 * never sets art-design-pro's isLogin, so that flow never fired and the
 * sidebar rendered empty (art-sidebar-menu v-show="menuList.length > 0").
 *
 * ensurePortalMenu() decouples menu population from isLogin: the KiX menu is
 * a static frontend asset (VITE_ACCESS_MODE=frontend, no roles, no backend
 * call), so we populate it directly at app init.
 */
describe('ensurePortalMenu', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('populates the menu store with the KiX sidebar groups when empty', async () => {
    const menuStore = useMenuStore()
    expect(menuStore.menuList.length).toBe(0) // reproduces the broken state

    await ensurePortalMenu()

    expect(menuStore.menuList.length).toBeGreaterThan(0)
    // top-level entries include the Overview leaf and the grouped sections
    const names = menuStore.menuList.map((m) => m.name)
    expect(names).toContain('KixOverview')
    expect(names).toContain('KixGamesGroup')
  })

  it('is idempotent — does not re-populate or grow the list on a second call', async () => {
    const menuStore = useMenuStore()

    await ensurePortalMenu()
    const firstLen = menuStore.menuList.length
    const firstRef = menuStore.menuList

    await ensurePortalMenu()

    expect(menuStore.menuList.length).toBe(firstLen)
    expect(menuStore.menuList).toBe(firstRef) // no-op: same array reference, no overwrite
  })
})
