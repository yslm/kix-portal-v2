import { AppRouteRecord } from '@/types/router'
import { kixMenuRoutes } from './kixMenu'

/**
 * Sidebar menu modules (Plan 1 Task 8).
 *
 * Demo modules (dashboard / template / widgets / examples / system / article /
 * result / exception / safeguard / help) were removed; KiX-specific 7-group /
 * 29-leaf menu lives in `./kixMenu`.
 */
export const routeModules: AppRouteRecord[] = [...kixMenuRoutes]
