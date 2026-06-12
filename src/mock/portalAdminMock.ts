import type { Plugin } from 'vite'

/**
 * Dev-only mock for the JWT-gated `/api/v1/portal-admin/*` endpoints.
 *
 * ## Why
 *
 * The Overview cards (StatusStrip / MetricCards / NbaCard / SetupGuideCard) all
 * fail-soft and self-hide on a 401. In demo mode (`?brand=demo`, no token) every
 * portal-admin endpoint returns 401, so those cards render nothing — making
 * visual review impossible without a real KiX session. This middleware returns
 * realistic demo payloads for the four read endpoints so the full Overview
 * renders locally.
 *
 * ## Scope & safety
 *
 * - `apply: 'serve'` → dev server ONLY; never included in `vite build`.
 * - Gated by `VITE_PORTAL_MOCK=1` (see the `dev:mock` npm script). Plain
 *   `pnpm dev` is unaffected and still proxies to the real backend.
 * - Only the four listed pathnames are intercepted; everything else (including
 *   `/api/v1/portal/builder/live-cards`, which already works in demo) falls
 *   through to the proxy via `next()`.
 * - Registered in the `configureServer` body, so it runs BEFORE Vite's proxy
 *   middleware and wins for these paths.
 *
 * Payload shapes mirror the typed contracts in `src/api/portal-admin/types.ts`
 * (raw JSON, no `{code,msg,data}` envelope — kixHttp expects raw).
 */

const MOCKS: Record<string, unknown> = {
  '/api/v1/portal-admin/overview': {
    wallet_sgd: 1842.5,
    new_customers_7d: 63,
    campaigns_live: 3,
    runway_days: 21
  },
  // Array, fixed order: impressions · plays/clicks · verified-new · spent/CPA
  '/api/v1/portal-admin/metrics': [
    {
      value: '9,120',
      delta_pct: 20,
      delta_direction: 'up',
      sub_label: 'vs last 7d',
      benchmark_note: 'above category avg'
    },
    { value: '1,284', delta_pct: 12, delta_direction: 'up', sub_label: 'vs last 7d' },
    {
      value: '63',
      delta_pct: 8,
      delta_direction: 'down',
      sub_label: 'vs last 7d',
      benchmark_note: 'slightly below last week'
    },
    { value: 'S$1,800 · S$8.41', delta_pct: 5, delta_direction: 'up', sub_label: 'spend · CPA' }
  ],
  '/api/v1/portal-admin/next-best-action': {
    brand_id: 'demo_brand',
    actions: [
      {
        id: 'winback_at_risk',
        view: 'messages',
        count: 18,
        signal: '18 customers inactive 2+ weeks'
      },
      { id: 'weekend_pack', view: 'builder' }
    ]
  },
  // Bare array — mirrors FastAPI response_model=list[Campaign].
  // Four rows with varied status values that StatusBadge maps to coloured pills.
  '/api/v1/portal-admin/campaigns': [
    {
      id: 'demo-c-001',
      name: '茶物语·周末拉新',
      status: 'active',
      objective: 'Acquisition',
      spend_str: 'S$28.5',
      impressions: 3200,
      conversions: 18,
      cpa_str: 'S$1.58',
      ctr_pct: 3.2
    },
    {
      id: 'demo-c-002',
      name: 'Lunch spin',
      status: 'active',
      objective: 'Retention',
      spend_str: 'S$45.0',
      impressions: 1500,
      conversions: 9,
      cpa_str: 'S$5.00',
      ctr_pct: '2.1%'
    },
    {
      id: 'demo-c-003',
      name: 'Payday blast',
      status: 'paused',
      objective: 'Awareness',
      spend_str: 'S$12.0',
      impressions: 820,
      conversions: 4,
      cpa_str: 'S$3.00',
      ctr_pct: 1.8
    },
    {
      id: 'demo-c-004',
      name: 'Mystery box',
      status: 'ended',
      objective: 'Acquisition',
      spend_str: 'S$96.0',
      impressions: 8100,
      conversions: 52,
      cpa_str: 'S$1.85',
      ctr_pct: '4.5%'
    }
  ],
  '/api/v1/portal-admin/setup-guide': {
    brand_id: 'demo_brand',
    steps: [
      { key: 'build_game', done: true, view: 'games' },
      { key: 'set_prize', done: true, view: 'prizes' },
      { key: 'add_store_qr', done: false, view: 'geofences' },
      { key: 'first_player', done: false, view: 'overview', count: 0 },
      { key: 'first_win', done: false, view: 'vouchers' },
      { key: 'first_redemption', done: false, view: 'vouchers' }
    ],
    done: 2,
    total: 6,
    complete: false,
    source: 'mock'
  }
}

export function portalAdminMock(): Plugin {
  const enabled = process.env.VITE_PORTAL_MOCK === '1'
  return {
    name: 'kix-portal-admin-mock',
    apply: 'serve',
    configureServer(server) {
      if (!enabled) return

      console.log('\n  🎭 portal-admin mock ENABLED — Overview cards render with demo data\n')
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url || '').split('?')[0]
        const body = MOCKS[pathname]
        if (body === undefined) return next()
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(body))
      })
    }
  }
}
