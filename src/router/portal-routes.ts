import type { RouteRecordRaw } from 'vue-router'

const Placeholder = () => import('@/views/Placeholder.vue')
const Overview = () => import('@/views/kix/Overview.vue')
const Settings = () => import('@/views/kix/Settings.vue')
const Campaigns = () => import('@/views/kix/Campaigns.vue')
const Games = () => import('@/views/kix/Games.vue')
const Builder = () => import('@/views/kix/Builder.vue')
const Flows = () => import('@/views/kix/Flows.vue')
const Reports = () => import('@/views/kix/Reports.vue')
const CustomerList = () => import('@/views/kix/CustomerList.vue')
const Audiences = () => import('@/views/kix/Audiences.vue')
const AbTests = () => import('@/views/kix/AbTests.vue')
const Rules = () => import('@/views/kix/Rules.vue')
const Templates = () => import('@/views/kix/Templates.vue')
const Cases = () => import('@/views/kix/Cases.vue')
const VipTiers = () => import('@/views/kix/VipTiers.vue')
const Storefront = () => import('@/views/kix/Storefront.vue')
const Billing = () => import('@/views/kix/Billing.vue')

export interface PortalRouteMeta {
  title: string
  group: 'main' | 'marketing' | 'audience' | 'loyalty' | 'finance' | 'analytics' | 'system'
  legacyViewId: string // matches old portal.html `view-*` ids
}

export const portalRoutes: RouteRecordRaw[] = [
  {
    path: '/overview',
    name: 'overview',
    component: Overview,
    meta: {
      title: 'Overview',
      group: 'main',
      legacyViewId: 'view-overview'
    } satisfies PortalRouteMeta
  },
  {
    path: '/games',
    name: 'games',
    component: Games,
    meta: { title: 'Games', group: 'main', legacyViewId: 'view-games' } satisfies PortalRouteMeta
  },
  {
    path: '/builder',
    name: 'builder',
    component: Builder,
    meta: {
      title: 'Builder',
      group: 'main',
      legacyViewId: 'view-builder'
    } satisfies PortalRouteMeta
  },
  {
    path: '/flows',
    name: 'flows',
    component: Flows,
    meta: { title: 'Flows', group: 'main', legacyViewId: 'view-flows' } satisfies PortalRouteMeta
  },

  {
    path: '/campaigns',
    name: 'campaigns',
    component: Campaigns,
    meta: {
      title: 'Campaigns',
      group: 'marketing',
      legacyViewId: 'view-campaigns'
    } satisfies PortalRouteMeta
  },
  {
    path: '/creatives',
    name: 'creatives',
    component: Placeholder,
    meta: {
      title: 'Creatives',
      group: 'marketing',
      legacyViewId: 'view-creatives'
    } satisfies PortalRouteMeta
  },
  {
    path: '/templates',
    name: 'templates',
    component: Templates,
    meta: {
      title: 'Templates',
      group: 'marketing',
      legacyViewId: 'view-templates'
    } satisfies PortalRouteMeta
  },
  {
    path: '/cases',
    name: 'cases',
    component: Cases,
    meta: {
      title: 'Cases',
      group: 'marketing',
      legacyViewId: 'view-cases'
    } satisfies PortalRouteMeta
  },
  {
    path: '/primitives',
    name: 'primitives',
    component: Placeholder,
    meta: {
      title: 'Primitives',
      group: 'marketing',
      legacyViewId: 'view-primitives'
    } satisfies PortalRouteMeta
  },
  {
    path: '/messages',
    name: 'messages',
    component: Placeholder,
    meta: {
      title: 'Messages',
      group: 'marketing',
      legacyViewId: 'view-messages'
    } satisfies PortalRouteMeta
  },

  {
    path: '/audiences',
    name: 'audiences',
    component: Audiences,
    meta: {
      title: 'Audiences',
      group: 'audience',
      legacyViewId: 'view-audiences'
    } satisfies PortalRouteMeta
  },
  {
    path: '/customer-list',
    name: 'customer-list',
    component: CustomerList,
    meta: {
      title: 'Customer List',
      group: 'audience',
      legacyViewId: 'view-customer-list'
    } satisfies PortalRouteMeta
  },
  {
    path: '/cohort',
    name: 'cohort',
    component: Placeholder,
    meta: {
      title: 'Cohort',
      group: 'audience',
      legacyViewId: 'view-cohort'
    } satisfies PortalRouteMeta
  },
  {
    path: '/rules',
    name: 'rules',
    component: Rules,
    meta: {
      title: 'Rules',
      group: 'audience',
      legacyViewId: 'view-rules'
    } satisfies PortalRouteMeta
  },
  {
    path: '/abtests',
    name: 'abtests',
    component: AbTests,
    meta: {
      title: 'A/B Tests',
      group: 'audience',
      legacyViewId: 'view-abtests'
    } satisfies PortalRouteMeta
  },

  {
    path: '/coupons-qr',
    name: 'coupons-qr',
    component: Placeholder,
    meta: {
      title: 'Coupons / QR',
      group: 'loyalty',
      legacyViewId: 'view-coupons-qr'
    } satisfies PortalRouteMeta
  },
  {
    path: '/vouchers',
    name: 'vouchers',
    component: Placeholder,
    meta: {
      title: 'Vouchers',
      group: 'loyalty',
      legacyViewId: 'view-vouchers'
    } satisfies PortalRouteMeta
  },
  {
    path: '/prizes',
    name: 'prizes',
    component: Placeholder,
    meta: {
      title: 'Prizes',
      group: 'loyalty',
      legacyViewId: 'view-prizes'
    } satisfies PortalRouteMeta
  },
  {
    path: '/game-rewards',
    name: 'game-rewards',
    component: Placeholder,
    meta: {
      title: 'Game Rewards',
      group: 'loyalty',
      legacyViewId: 'view-game-rewards'
    } satisfies PortalRouteMeta
  },
  {
    path: '/vip-tiers',
    name: 'vip-tiers',
    component: VipTiers,
    meta: {
      title: 'VIP Tiers',
      group: 'loyalty',
      legacyViewId: 'view-vip-tiers'
    } satisfies PortalRouteMeta
  },
  {
    path: '/storefront',
    name: 'storefront',
    component: Storefront,
    meta: {
      title: 'Storefront',
      group: 'loyalty',
      legacyViewId: 'view-storefront'
    } satisfies PortalRouteMeta
  },
  {
    // Consolidated rewards view — merges prizes / game-rewards / vouchers /
    // coupons-qr (deferred sidebar entries). Real implementation lands in
    // Plan 5 T8; the synthetic `legacyViewId` doesn't map to any single
    // legacy `<section id="view-*">` because no such consolidated view
    // existed in portal.html — this is a new aggregator.
    path: '/rewards',
    name: 'rewards',
    component: Placeholder,
    meta: {
      title: 'Rewards',
      group: 'loyalty',
      legacyViewId: 'view-rewards-consolidated'
    } satisfies PortalRouteMeta
  },

  {
    path: '/billing',
    name: 'billing',
    component: Billing,
    meta: {
      title: 'Billing',
      group: 'finance',
      legacyViewId: 'view-billing'
    } satisfies PortalRouteMeta
  },
  {
    // Per Plan 5 T5 audit, /invoices is a DUPLICATE of the invoices
    // card already rendered inside /billing. The sidebar entry was
    // already dropped in Plan 5 T0; we keep the route as Placeholder
    // so any stale /invoices deep links still resolve (a later slice
    // can redirect to /billing#invoices once anchor-routing lands).
    path: '/invoices',
    name: 'invoices',
    component: Placeholder,
    meta: {
      title: 'Invoices',
      group: 'finance',
      legacyViewId: 'view-invoices'
    } satisfies PortalRouteMeta
  },

  {
    path: '/reports',
    name: 'reports',
    component: Reports,
    meta: {
      title: 'Reports',
      group: 'analytics',
      legacyViewId: 'view-reports'
    } satisfies PortalRouteMeta
  },
  {
    path: '/attribution',
    name: 'attribution',
    component: Placeholder,
    meta: {
      title: 'Attribution',
      group: 'analytics',
      legacyViewId: 'view-attribution'
    } satisfies PortalRouteMeta
  },
  {
    path: '/pixel',
    name: 'pixel',
    component: Placeholder,
    meta: {
      title: 'Pixel',
      group: 'analytics',
      legacyViewId: 'view-pixel'
    } satisfies PortalRouteMeta
  },
  {
    path: '/geofences',
    name: 'geofences',
    component: Placeholder,
    meta: {
      title: 'Geofences',
      group: 'analytics',
      legacyViewId: 'view-geofences'
    } satisfies PortalRouteMeta
  },

  {
    path: '/operations',
    name: 'operations',
    component: Placeholder,
    meta: {
      title: 'Operations',
      group: 'system',
      legacyViewId: 'view-operations'
    } satisfies PortalRouteMeta
  },
  {
    path: '/settings',
    name: 'settings',
    component: Settings,
    meta: {
      title: 'Settings',
      group: 'system',
      legacyViewId: 'view-settings'
    } satisfies PortalRouteMeta
  },

  { path: '/', redirect: '/overview' }
]
