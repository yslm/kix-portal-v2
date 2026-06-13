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
  // Carries BOTH the real backend fields (spend_sgd / new_customers /
  // cpa_sgd / plays / game_type) consumed by the rebuilt Campaigns view
  // AND the legacy aliases (spend_str / conversions / cpa_str) the
  // Overview CampaignTable still reads — so both render under demo.
  '/api/v1/portal-admin/campaigns': [
    {
      id: 'demo-c-001',
      name: '茶物语·周末拉新',
      status: 'live',
      objective: 'NEW',
      game_type: 'spin',
      spend_sgd: 285,
      spend_str: 'S$285',
      impressions: 3200,
      plays: 1180,
      new_customers: 180,
      conversions: 180,
      cpa_sgd: 1.58,
      cpa_str: 'S$1.58',
      ctr_pct: 3.2
    },
    {
      id: 'demo-c-002',
      name: 'Lunch spin',
      status: 'live',
      objective: 'REPEAT',
      game_type: 'scratch',
      spend_sgd: 450,
      spend_str: 'S$450',
      impressions: 1500,
      plays: 640,
      new_customers: 90,
      conversions: 90,
      cpa_sgd: 5.0,
      cpa_str: 'S$5.00',
      ctr_pct: '2.1%'
    },
    {
      id: 'demo-c-003',
      name: 'Payday blast',
      status: 'paused',
      objective: 'REACH',
      game_type: 'mystery',
      spend_sgd: 120,
      spend_str: 'S$120',
      impressions: 820,
      plays: 210,
      new_customers: 40,
      conversions: 40,
      cpa_sgd: 3.0,
      cpa_str: 'S$3.00',
      ctr_pct: 1.8
    },
    {
      id: 'demo-c-004',
      name: 'Mystery box',
      status: 'ended',
      objective: 'NEW',
      game_type: 'quiz',
      spend_sgd: 960,
      spend_str: 'S$960',
      impressions: 8100,
      plays: 3020,
      new_customers: 520,
      conversions: 520,
      cpa_sgd: 1.85,
      cpa_str: 'S$1.85',
      ctr_pct: '4.5%'
    }
  ],
  // My Games gallery — { games } wrapper (mirrors brand_games endpoint).
  // No cover_url → exercises the deterministic gradient+emoji fallback
  // (varied slugs show the per-type palette). Varied play targets / order
  // ids drive the Playable / Customizable KPIs + action gating.
  '/api/v1/portal-admin/brand-games': {
    brand_id: 'demo_brand',
    games: [
      {
        id: 'demo-g-001',
        name: '珍珠奶茶消消乐',
        game_slug: 'bubbletea_match3',
        status: 'active',
        play_url: '/play/demo/bubbletea_match3',
        order_id: 'ord-demo-1'
      },
      {
        id: 'demo-g-002',
        name: '幸运大转盘',
        game_slug: 'lucky_spin',
        status: 'active',
        play_url: '/play/demo/lucky_spin'
      },
      {
        id: 'demo-g-003',
        brand_game_name: '刮刮乐·周五',
        game_slug: 'scratch_win',
        status: 'paused',
        game_file: '/games/scratch_win/index.html',
        order_id: 'ord-demo-3'
      },
      {
        id: 'demo-g-004',
        game_slug: 'trivia_quiz',
        status: 'draft'
      },
      {
        id: 'demo-g-005',
        name: '五子棋对战',
        game_slug: 'bookstore_gomoku',
        play_url: '/play/demo/bookstore_gomoku'
      }
    ]
  },
  // Verified customers — { customers } wrapper (mirrors _real_customer_rows).
  // Mix of segments: ⭐ Regular (redeems>0 && plays>=5), 🔁 Came back
  // (plays>=2), ✨ New (else) — all derived from these real plays/redeems.
  '/api/v1/portal-admin/customers': {
    customers: [
      {
        handle: '+65 8123 4567',
        name: 'Aisha Tan',
        channel: 'QR poster',
        first_seen: '2026-04-02',
        plays: 9,
        redeems: 3,
        last_active: '2026-06-12'
      },
      {
        handle: '+65 9234 5678',
        channel: 'Social',
        first_seen: '2026-04-18',
        plays: 6,
        redeems: 1,
        last_active: '2026-06-11'
      },
      {
        handle: '+60 12 345 6789',
        name: 'Bobby Lim',
        channel: 'Referral',
        first_seen: '2026-05-03',
        plays: 4,
        redeems: 0,
        last_active: '2026-06-10'
      },
      {
        handle: '+65 8345 6789',
        channel: 'QR poster',
        first_seen: '2026-05-21',
        plays: 2,
        redeems: 0,
        last_active: '2026-06-09'
      },
      {
        handle: '+65 7456 7890',
        name: 'Cara Wong',
        channel: 'Walk-in',
        first_seen: '2026-06-01',
        plays: 1,
        redeems: 0,
        last_active: '2026-06-08'
      },
      {
        handle: '+65 6567 8901',
        channel: 'Social',
        first_seen: '2026-06-05',
        plays: 1,
        redeems: 0,
        last_active: '2026-06-06'
      }
    ]
  },
  // 14-day cohort — bare CohortRow[] (newest last).
  '/api/v1/portal-admin/reports/cohort': [
    { cohort_day: '2026-05-30', new_customers: 7 },
    { cohort_day: '2026-05-31', new_customers: 12 },
    { cohort_day: '2026-06-01', new_customers: 5 },
    { cohort_day: '2026-06-02', new_customers: 18 },
    { cohort_day: '2026-06-03', new_customers: 22 },
    { cohort_day: '2026-06-04', new_customers: 9 },
    { cohort_day: '2026-06-05', new_customers: 14 },
    { cohort_day: '2026-06-06', new_customers: 11 },
    { cohort_day: '2026-06-07', new_customers: 19 },
    { cohort_day: '2026-06-08', new_customers: 8 },
    { cohort_day: '2026-06-09', new_customers: 24 },
    { cohort_day: '2026-06-10', new_customers: 16 },
    { cohort_day: '2026-06-11', new_customers: 21 },
    { cohort_day: '2026-06-12', new_customers: 13 }
  ],
  // Reports · Owner summary · today's redemptions (legacy fmtSgd count).
  '/api/v1/portal-admin/redemptions/today': { count: 24, value_str: 'S$312' },
  // Reports · Owner summary · RFM segments. returningPlayers =
  // champions + loyal + at_risk = 12 + 20 + 8 = 40 (per the aggregator).
  '/api/v1/portal-admin/customers/rfm-summary': {
    brand_id: 'demo_brand',
    sampled: 60,
    segments: { champions: 12, loyal: 20, at_risk: 8, new: 15, lost: 5 },
    basis: 'demo'
  },
  // Reports · Performance · Top campaigns by ROAS ({ items } envelope,
  // mirrors top_campaigns_report() demo seed at portal_admin.py line 2385).
  '/api/v1/portal-admin/reports/top-campaigns': {
    items: [
      {
        name: 'Lunch spin · 200m geofence',
        spend_str: 'S$378',
        spend_sgd: 378.0,
        conversions: 87,
        roas: 6.4
      },
      {
        name: 'Scratch & win · breakfast',
        spend_str: 'S$214',
        spend_sgd: 214.0,
        conversions: 42,
        roas: 5.9
      },
      {
        name: 'Mystery box · evening',
        spend_str: 'S$128',
        spend_sgd: 128.0,
        conversions: 18,
        roas: 5.2
      },
      {
        name: 'Streak · retention',
        spend_str: 'S$94',
        spend_sgd: 94.0,
        conversions: 14,
        roas: 4.6
      },
      { name: 'Quiz · brand recall', spend_str: 'S$72', spend_sgd: 72.0, conversions: 9, roas: 4.1 }
    ],
    source: 'demo · top_campaigns:demo',
    updated_at: '2026-06-13T00:00:00Z',
    empty_state_hint: null
  },
  // Reports · Engagement · conversion funnel ({ items } envelope, source=true;
  // mirrors funnel_report() demo seed at portal_admin.py line 782).
  '/api/v1/portal-admin/reports/funnel': {
    items: [
      { step: 'Impressions', count: 14238 },
      { step: 'Plays', count: 3892, conversion_pct: 27.3 },
      { step: 'Winners', count: 2179, conversion_pct: 56.0 },
      { step: 'Redeemed at counter', count: 412, conversion_pct: 18.9 },
      { step: 'Verified new customers', count: 147, conversion_pct: 35.7 },
      { step: 'Returned in 14 days', count: 42, conversion_pct: 28.6 }
    ],
    source: 'demo · funnel:demo:7d (deterministic seed)',
    freshness: 'demo-static',
    empty_state_hint: null
  },
  // Reports · Live monitoring · "Live now" (two legs, mirror
  // monitoring_live() + ops_today() at portal_admin.py lines 2147 / 2166).
  '/api/v1/portal-admin/monitoring/live': { plays_today: 318, plays_per_min: 2.4 },
  '/api/v1/portal-admin/ops/today': { redemptions: 24, plays: 318, new_customers: 12, actions: [] },
  // Audience breakdown — 4 segments summing ~100%.
  '/api/v1/portal-admin/audience-breakdown': [
    { source: 'QR poster', count: 142, pct: 46, color: '#3b82f6' },
    { source: 'Social', count: 87, pct: 28, color: '#10b981' },
    { source: 'Referral', count: 53, pct: 17, color: '#f59e0b' },
    { source: 'Walk-in', count: 28, pct: 9, color: '#8b5cf6' }
  ],
  // Live activity feed — 6 recent events, mixed types.
  '/api/v1/portal-admin/activity/live': [
    {
      type: 'win',
      kid: '+65 8123',
      detail: 'won a free coffee',
      campaign: '茶物语·周末拉新',
      timestamp: '2m ago'
    },
    {
      type: 'redeem',
      kid: '+65 9234',
      detail: 'redeemed bubble tea',
      campaign: 'Lunch spin',
      timestamp: '5m ago'
    },
    {
      type: 'win',
      kid: '+60 1234',
      detail: 'won S$5 voucher',
      campaign: 'Payday blast',
      timestamp: '8m ago'
    },
    {
      type: 'play',
      kid: '+65 8456',
      detail: 'played scratch card',
      campaign: '茶物语·周末拉新',
      timestamp: '11m ago'
    },
    {
      type: 'redeem',
      kid: '+65 7890',
      detail: 'redeemed free drink',
      campaign: 'Lunch spin',
      timestamp: '14m ago'
    },
    {
      type: 'win',
      kid: '+65 6543',
      detail: 'won mystery box',
      campaign: 'Mystery box',
      timestamp: '18m ago'
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
