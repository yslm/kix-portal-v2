import { useMenuStore } from '@/store/modules/menu'
import { MenuProcessor } from './core/MenuProcessor'

/**
 * Populate the sidebar menu store with the KiX frontend menu.
 *
 * ## Why this exists
 *
 * art-design-pro populates `menuStore` only inside its login-gated
 * dynamic-route flow (`beforeEach.ts` → `handleDynamicRoutes`, guarded by
 * `userStore.isLogin`). KiX portal authenticates via its own `tokenGuard`
 * and never calls art-design-pro's `setLoginStatus(true)`, so `isLogin`
 * stays `false`, that flow never fires, and the sidebar renders empty —
 * `art-sidebar-menu` hides the whole tree via `v-show="menuList.length > 0"`.
 *
 * The KiX menu is a static frontend asset (`VITE_ACCESS_MODE=frontend`, no
 * roles, no backend call — see `MenuProcessor.processFrontendMenu`), so it can
 * be populated directly at app init, fully decoupled from `isLogin`.
 *
 * Idempotent: no-op if the store is already populated, so it composes safely
 * with art-design-pro's own (currently unused) login-driven population path.
 */
export async function ensurePortalMenu(): Promise<void> {
  const menuStore = useMenuStore()
  if (menuStore.menuList.length > 0) return

  const menuList = await new MenuProcessor().getMenuList()
  menuStore.setMenuList(menuList)
}
