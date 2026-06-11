/**
 * KiX Portal sidebar menu (Plan 1 Task 8, trimmed by Plan 5 Task 0)
 *
 * Replaces art-design-pro's demo menu (dashboard / template / widgets / examples /
 * system / article / result / exception / safeguard / help). After the P2 audit
 * (Plan 5 Task 0) the sidebar surfaces only the entries that have a concrete
 * Plan 5 implementation slot — 11 entries are deferred or merged, 1 new leaf
 * (`/rewards`) consolidates the prizes / game-rewards / vouchers / coupons-qr
 * trio. The 29 underlying routes in `portal-routes.ts` are retained so
 * deep-links and external bookmarks don't 404; the sidebar just stops
 * surfacing the deferred ones.
 *
 * Deferred/removed from sidebar (still routable):
 *   primitives, messages (marketing) · cohort (audience) ·
 *   prizes, game-rewards, vouchers, coupons-qr (loyalty — merged into Rewards) ·
 *   invoices (finance — merged into Billing) ·
 *   attribution, pixel (analytics) · operations (system)
 *
 * Added: rewards (loyalty group, placeholder until Plan 5 T8).
 *
 * ## Why absolute child paths
 *
 * Task 7 mounted the 29 leaves at absolute paths like `/overview`, `/games`,
 * `/campaigns`, ... directly under the `/portal` layout host (see
 * `src/router/portal-routes.ts`). The menu data here points at those same
 * absolute paths so `handleMenuJump` navigates to existing routes.
 *
 * MenuProcessor.validateMenuPaths will log a console.error for the absolute
 * paths in non-top-level menu entries — that's informational, paths are
 * still respected by buildFullPath (`if (path.startsWith('/')) return path`).
 *
 * ## Why each leaf still carries a `component`
 *
 * MenuProcessor.filterEmptyMenus drops leaves with empty component. We hand
 * each leaf `/Placeholder` so it survives the filter. RouteRegistry.register
 * then tries to add it as a dynamic route — but staticRoutes (Task 7) already
 * own these `name`s, so `router.hasRoute(name)` short-circuits the call. Net
 * effect: no duplicate registration, menu still renders.
 *
 * ## i18n
 *
 * All `title` fields are `menus.*` keys resolved against
 * `locales/portal/{en,zh}.json` (portal-v2-specific, not in SSOT).
 *
 * ## Icons
 *
 * Iconify `ri:*` (Remix Icon) — same family the demo modules used, so the
 * sidebar look stays consistent.
 */
import { AppRouteRecord } from '@/types/router'

const PLACEHOLDER = '/Placeholder'

export const kixMenuRoutes: AppRouteRecord[] = [
  {
    path: '/overview',
    name: 'KixOverview',
    component: PLACEHOLDER,
    meta: {
      title: 'menus.overview',
      icon: 'ri:dashboard-line',
      keepAlive: false
    }
  },
  {
    path: '/games-group',
    name: 'KixGamesGroup',
    component: '',
    meta: {
      title: 'menus.games_group',
      icon: 'ri:gamepad-line'
    },
    children: [
      {
        path: '/games',
        name: 'KixGames',
        component: PLACEHOLDER,
        meta: { title: 'menus.games', icon: 'ri:apps-2-line' }
      },
      {
        path: '/builder',
        name: 'KixBuilder',
        component: PLACEHOLDER,
        meta: { title: 'menus.builder', icon: 'ri:tools-line' }
      },
      {
        path: '/flows',
        name: 'KixFlows',
        component: PLACEHOLDER,
        meta: { title: 'menus.flows', icon: 'ri:flow-chart' }
      }
    ]
  },
  {
    path: '/marketing-group',
    name: 'KixMarketingGroup',
    component: '',
    meta: {
      title: 'menus.marketing',
      icon: 'ri:megaphone-line'
    },
    children: [
      {
        path: '/campaigns',
        name: 'KixCampaigns',
        component: PLACEHOLDER,
        meta: { title: 'menus.campaigns', icon: 'ri:rocket-line' }
      },
      {
        path: '/creatives',
        name: 'KixCreatives',
        component: PLACEHOLDER,
        meta: { title: 'menus.creatives', icon: 'ri:image-edit-line' }
      },
      {
        path: '/templates',
        name: 'KixTemplates',
        component: PLACEHOLDER,
        meta: { title: 'menus.templates', icon: 'ri:layout-grid-line' }
      },
      {
        path: '/cases',
        name: 'KixCases',
        component: PLACEHOLDER,
        meta: { title: 'menus.cases', icon: 'ri:book-2-line' }
      }
    ]
  },
  {
    path: '/audience-group',
    name: 'KixAudienceGroup',
    component: '',
    meta: {
      title: 'menus.audience',
      icon: 'ri:group-line'
    },
    children: [
      {
        path: '/audiences',
        name: 'KixAudiences',
        component: PLACEHOLDER,
        meta: { title: 'menus.audiences', icon: 'ri:team-line' }
      },
      {
        path: '/customer-list',
        name: 'KixCustomerList',
        component: PLACEHOLDER,
        meta: { title: 'menus.customer_list', icon: 'ri:contacts-book-line' }
      },
      {
        path: '/rules',
        name: 'KixRules',
        component: PLACEHOLDER,
        meta: { title: 'menus.rules', icon: 'ri:filter-3-line' }
      },
      {
        path: '/abtests',
        name: 'KixAbTests',
        component: PLACEHOLDER,
        meta: { title: 'menus.abtests', icon: 'ri:test-tube-line' }
      }
    ]
  },
  {
    path: '/loyalty-group',
    name: 'KixLoyaltyGroup',
    component: '',
    meta: {
      title: 'menus.loyalty',
      icon: 'ri:heart-line'
    },
    children: [
      {
        path: '/rewards',
        name: 'KixRewards',
        component: PLACEHOLDER,
        meta: { title: 'menus.rewards', icon: 'ri:gift-line' }
      },
      {
        path: '/vip-tiers',
        name: 'KixVipTiers',
        component: PLACEHOLDER,
        meta: { title: 'menus.vip_tiers', icon: 'ri:vip-crown-line' }
      },
      {
        path: '/storefront',
        name: 'KixStorefront',
        component: PLACEHOLDER,
        meta: { title: 'menus.storefront', icon: 'ri:store-2-line' }
      }
    ]
  },
  {
    path: '/finance-group',
    name: 'KixFinanceGroup',
    component: '',
    meta: {
      title: 'menus.finance',
      icon: 'ri:money-dollar-circle-line'
    },
    children: [
      {
        path: '/billing',
        name: 'KixBilling',
        component: PLACEHOLDER,
        meta: { title: 'menus.billing', icon: 'ri:bank-card-line' }
      }
    ]
  },
  {
    path: '/analytics-group',
    name: 'KixAnalyticsGroup',
    component: '',
    meta: {
      title: 'menus.analytics',
      icon: 'ri:bar-chart-line'
    },
    children: [
      {
        path: '/reports',
        name: 'KixReports',
        component: PLACEHOLDER,
        meta: { title: 'menus.reports', icon: 'ri:file-chart-line' }
      },
      {
        path: '/geofences',
        name: 'KixGeofences',
        component: PLACEHOLDER,
        meta: { title: 'menus.geofences', icon: 'ri:map-pin-line' }
      }
    ]
  },
  {
    path: '/system-group',
    name: 'KixSystemGroup',
    component: '',
    meta: {
      title: 'menus.system',
      icon: 'ri:settings-3-line'
    },
    children: [
      {
        path: '/settings',
        name: 'KixSettings',
        component: PLACEHOLDER,
        meta: { title: 'menus.settings', icon: 'ri:equalizer-line' }
      }
    ]
  }
]
