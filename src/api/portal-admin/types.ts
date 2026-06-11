export interface ApiListResponse<T> {
  items: T[]
  total?: number
  cursor?: string | null
}

// ---------------------------------------------------------------------------
// Games view · My Games grid
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `kixLoadMyGames()` (~line 7434)
// Endpoint: GET /api/v1/portal-admin/brand-games?brand=<brand_id>
// Response shape: `{ games: BrandGame[] }` (legacy renderer reads
// `(data && data.games) || []`). Defensive callers may also accept bare
// arrays / `{ items }` wrappers.
//
// The legacy renderer (~line 7480) reads many name variants and falls back
// across them: `name → brand_game_name → game_name → game_slug → 'Untitled'`.
// Likewise the cover falls back from `cover_url` → server SVG; and the
// "playable" check ORs across `game_file / unpacked_url / game_id /
// game_slug / play_url`.
//
// Every field is optional except `id` (we generate a row key from it). The
// per-game `status` flag mirrors the campaign status enum and is rendered
// as a coloured badge when present.

export interface BrandGame {
  id: string
  brand?: string
  name?: string
  // Legacy name fallbacks the renderer walks through, in order, before
  // defaulting to "Untitled". Kept so the v2 renderer can match.
  brand_game_name?: string
  game_name?: string
  game_slug?: string
  game_id?: string
  // Status badge (active / paused / draft) — optional.
  status?: 'active' | 'paused' | 'draft' | string
  // Per-game cover image set by sample_brander + Nano Banana brand cover.
  // Empty / null is safe — view falls back to a generated placeholder.
  cover_url?: string
  // URL surfaces the legacy "▶ Play" button targets. Any of these flags
  // the game as playable; the renderer picks the first non-empty one.
  game_file?: string
  unpacked_url?: string
  play_url?: string
  // Set by the gamification IDE when the merchant customises the build.
  order_id?: string
  createdAt?: string
}

// ---------------------------------------------------------------------------
// Overview view · live-cards grid
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · _loadLiveStats() (~line 10082)
// Endpoint: GET /api/v1/portal/builder/live-cards?brand_id=<bid>
// Response shape: `{ cards: LiveCampaignCard[] }`
//
// Field semantics (from the legacy renderer):
//  - cid:           opaque campaign id (used as DOM key + click target)
//  - name:          display title
//  - players:       count of unique players observed
//  - vouchers:      count of vouchers issued
//  - redeems:       count of vouchers redeemed at the counter
//  - spend_sgd:     amount spent so far, in SGD
//  - budget_sgd:    total budget allocated, in SGD
//  - spend_pct:     spend / budget · 100 — precomputed server-side
//  - stale_seconds: seconds since the backend last refreshed this card
//
// Refinement: server may add or rename fields. When that happens, update here
// and the consuming view (`src/views/kix/Overview.vue`) together.

export interface LiveCampaignCard {
  cid: string
  name: string
  players: number
  vouchers: number
  redeems: number
  spend_sgd: number
  budget_sgd: number
  spend_pct: number
  stale_seconds: number
}

export interface LiveCardsResponse {
  cards: LiveCampaignCard[]
}

// ---------------------------------------------------------------------------
// Settings view · brand profile sub-section
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `kixLoadProfile()` (~line 5937)
// Endpoint: GET /api/v1/portal/settings/profile/<brand_id>
// Response shape: `{ profile: BrandProfile }`
//
// All fields except brand_name may be missing/empty for a brand that hasn't
// been fully onboarded — the legacy renderer treats every field as optional
// and defaults to '' when absent.
//
// `business_type` is one of: 'company' | 'individual' | 'non_profit' |
// 'government' — see the <select id="prof-business-type"> options in the
// legacy HTML.

export type BusinessType = 'company' | 'individual' | 'non_profit' | 'government'

export interface BrandProfile {
  brand_name?: string
  business_type?: BusinessType | string
  contact_email?: string
  contact_phone?: string
  tax_id?: string
  country?: string
  website_url?: string
  city?: string
  logo_url?: string
}

export interface BrandProfileResponse {
  profile: BrandProfile
}

// ---------------------------------------------------------------------------
// Campaigns view · list table
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `kixLoadCampaignsList()`
// (~line 5321). Endpoint: GET /api/v1/portal-admin/campaigns.
//
// Response shape: BARE ARRAY `Campaign[]` (the FastAPI route declares
// `response_model=list[Campaign]`). The legacy renderer also handles
// `{ campaigns: [...] }` and `{ items: [...] }` defensively — same here.
// Comment in legacy code (line 5329-5332) confirms the "Marathon fix" for
// this: reading `.campaigns` always returned undefined on a bare array.
//
// Fields read by the legacy table renderer (every one optional):
//  - id:            opaque campaign id
//  - name:          display title
//  - status:        'active' | 'paused' | 'pending' | 'ended' | 'draft' …
//                   (legacy filter tabs are: all / active / paused / pending
//                   / ended — but the server may emit other strings)
//  - objective:     e.g. "Awareness", "Acquisition" — free-form string
//  - budget_str:    pre-formatted budget, e.g. "S$1,200"
//  - spend_str:     pre-formatted spend, e.g. "S$345"
//  - budget_sgd / spend_sgd: raw numbers (preferred — we format with fmtSgd)
//  - impressions:   integer
//  - ctr_pct:       click-through rate %, may be number or pre-formatted str
//  - conversions:   integer
//  - cpa_str:       pre-formatted cost-per-acquisition string
//
// We accept BOTH pre-formatted (`*_str`) and raw numeric shapes. View prefers
// raw numbers + `fmtSgd()` when present, falling back to the pre-formatted
// string from the backend.

export type CampaignStatus = 'active' | 'paused' | 'pending' | 'ended' | 'draft' | string

export interface Campaign {
  id: string
  name: string
  status?: CampaignStatus
  objective?: string
  budget_sgd?: number
  spend_sgd?: number
  budget_str?: string
  spend_str?: string
  impressions?: number
  ctr_pct?: number | string
  conversions?: number
  cpa_str?: string
  startsAt?: string
  endsAt?: string
}

/**
 * Backend may return a bare array OR a wrapper object. The view normalises
 * to `Campaign[]` regardless.
 */
export type CampaignsListResponse = Campaign[] | { campaigns?: Campaign[]; items?: Campaign[] }

// ---------------------------------------------------------------------------
// Builder view · opportunity-score card
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `_refreshOpportunityScore()`
// (~line 10039). Endpoint: POST /api/v1/portal/builder/opportunity-score.
//
// Note the endpoint is NOT under `/portal-admin/` — it lives on the
// public-merchant `/portal/builder/` namespace. The legacy code POSTs a
// composite config object built from the current Game / Voucher / Rule /
// Schedule / Safety / Audience module state. Plan 3 only ports the entry
// view — sub-forms come in future tasks — so the v2 caller sends a minimal
// empty config (`{ game:{}, voucher:{}, rule:{}, schedule:{}, safety:{},
// audience:{ type: 'recent_visitors_7d' } }`) until those sub-forms land
// and can contribute real state.
//
// Response shape (legacy renderer line 10065-10072):
//  - score:  number 0-100 (rule-engine output)
//  - hints:  Array of `{ points, label }` improvement suggestions. Empty
//            array means "Looking good · no improvement suggestions" per
//            the legacy "good" branch.

export interface OpportunityScoreHint {
  points: number
  label: string
}

export interface OpportunityScore {
  score: number
  hints: OpportunityScoreHint[]
}

/**
 * Request body the legacy code posts. Every section is optional — when
 * the merchant hasn't configured a module yet, the server runs the
 * rule-engine against whatever's available. Plan 3 sends an "empty
 * baseline" object; sub-form tasks will populate each section.
 */
export interface OpportunityScoreRequest {
  game?: Record<string, unknown>
  voucher?: Record<string, unknown>
  rule?: Record<string, unknown>
  schedule?: Record<string, unknown>
  safety?: Record<string, unknown>
  audience?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Flows view · my-flows gallery
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `kixLoadFlows()` (~line 8750)
// Endpoint: GET /api/v1/portal-admin/flows?brand=<brand_id>
//   (constant `KIX_FLOWS_API = '/api/v1/portal-admin/flows'` at line 8588)
// Response shape: `{ flows: AutomationFlow[] }` — the legacy renderer reads
// `(data && data.flows) || []`. We also accept bare arrays and the generic
// `{ items: [...] }` wrapper defensively, same pattern as Campaigns/Games.
//
// Wave4 W4-C · B36: merchant-facing label for the artifact is "Campaign",
// but the internal data model term remains "flow" — see the explanatory
// comment at portal.html line 1532-1536. We keep the wire field names
// (`flow_id`, `template_id`) unchanged.
//
// Fields read by the legacy card renderer (~line 8770):
//   - flow_id:     opaque id (unique row key + click target)
//   - name:        display title
//   - status:      pill class — the legacy CSS has `.status-pill.{status}`
//                  variants; common values are 'draft' / 'active' / 'paused'
//                  / 'ended'. Free-form string.
//   - start_date:  ISO date or pre-formatted string, rendered raw
//   - end_date:    ISO date or pre-formatted string, rendered raw
//   - steps_count: integer, shown as "N steps"
//   - template_id: starter campaign id (e.g. 'ramadan_30d', 'referral_v1');
//                  falls back to literal string "custom" when absent.
//
// Every field except `flow_id` is optional from a defensive-rendering POV.

export type FlowStatus = 'draft' | 'active' | 'paused' | 'ended' | string

export interface AutomationFlow {
  flow_id: string
  name?: string
  status?: FlowStatus
  start_date?: string
  end_date?: string
  steps_count?: number
  template_id?: string
}

/**
 * Backend canonical shape is `{ flows }` (matches the legacy renderer's
 * `(data && data.flows) || []` read). Bare arrays + `{ items }` are
 * tolerated for defensive parity with Campaigns/Games.
 */
export type FlowsListResponse =
  | { flows?: AutomationFlow[]; items?: AutomationFlow[] }
  | AutomationFlow[]
  | ApiListResponse<AutomationFlow>

// ---------------------------------------------------------------------------
// Reports view · owner summary card (Simple mode)
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `kixLoadOwnerReport()`
// (~line 3978). This is the "three numbers a shop owner actually asks":
// new faces · today's redemptions · players who came back. It is shown in
// the `#owner-report` card on the Reports view when `body.kix-mode-simple`
// is on. The legacy code composes the three numbers from THREE separate
// portal-admin endpoints:
//
//   GET /api/v1/portal-admin/overview           (StatusStrip — new_customers_7d)
//   GET /api/v1/portal-admin/redemptions/today  ({ count, value_str, recent })
//   GET /api/v1/portal-admin/customers/rfm-summary
//                                               ({ segments: { champions, loyal,
//                                                              at_risk, new, lost },
//                                                  sampled, brand_id, basis })
//
// Repeat (players who came back) = champions + loyal + at_risk per the
// legacy aggregator (portal.html line 3990-3992).
//
// Plan 4 T2 ports ONLY this Simple-mode owner card. Deferred: the
// Advanced-mode `Performance / Engagement / Live monitoring` tabs and
// their KPI grid + top-campaigns table + funnel + heatmap + live feed.

export interface StatusStrip {
  wallet_sgd: number
  new_customers_7d: number
  new_customers_7d_delta_pct: number
  campaigns_live: number
  runway_days: number
  burn_per_day_sgd: number
  health: 'green' | 'amber' | 'red' | string
  // Some envs return additional/older fields — accept defensively.
  new_customers?: number
}

export interface RedemptionsTodayResponse {
  count: number
  value_str?: string
  recent?: unknown[]
}

export interface RfmSegments {
  champions: number
  loyal: number
  at_risk: number
  new: number
  lost: number
}

export interface RfmSummaryResponse {
  brand_id?: string
  sampled?: number
  segments: RfmSegments
  basis?: string
}

/**
 * Composed shape the Reports view consumes. Each field is independent and
 * may be `null` when its underlying endpoint failed (the legacy renderer
 * tolerates partial data — every fetch is `.catch(() => null)`).
 */
export interface OwnerReportSummary {
  newCustomers: number | null
  redemptionsToday: number | null
  // champions + loyal + at_risk per legacy aggregator (line 3990-3992).
  returningPlayers: number | null
}

// ---------------------------------------------------------------------------
// CustomerList view · verified-customers table
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `kixLoadCustomers()` (~line 7303)
// Endpoint: GET /api/v1/portal-admin/customers
// Response shape: `{ customers: Customer[] }` — the legacy renderer reads
// `(d && d.customers) || []`. We also accept bare arrays / `{ items }`
// defensively, mirroring the Campaigns / Games / Flows pattern.
//
// Note: the live view in portal.html actually invokes the PAGINATED variant
// `kixLoadCustomersPaged()` against `/customers/page` with page/page_size/
// search query params. Plan 4 T3 ports ONLY the simpler `/customers` GET —
// pagination, search debounce, the prev/next page buttons, the RFM-segment
// per-row badge derivation (legacy `_seg()` at line 5118-5124), and the
// "Export CSV" CTA (`kixExportCustomersCsv()` at line 7320) are DEFERRED to
// later Plan 4 sub-tasks. The simple endpoint is real and returns the same
// row schema, so the read-only first cut is honest and not invented.
//
// Fields read by the legacy table row renderer (~line 7313):
//   - name / handle:     display name (fallback chain: `name ?? handle`)
//   - channel:           verification channel (e.g. "phone", "email") —
//                        rendered as a small badge; '—' when absent
//   - first_seen:        ISO date or pre-formatted string, rendered raw
//   - plays:             total game plays (integer); default 0
//   - redeems:           total voucher redemptions (integer); default 0
//   - last_active:       ISO date or pre-formatted string, '—' fallback
//
// Every field except a stable row key is optional from a defensive-rendering
// POV — the legacy view literally does `${c.name||c.handle}` so we use the
// same fallback. Row key prefers `id` then `handle` then array index.

export interface Customer {
  id?: string
  name?: string
  handle?: string
  channel?: string
  first_seen?: string
  plays?: number
  redeems?: number
  last_active?: string
}

/**
 * Backend canonical shape is `{ customers }` (matches the legacy renderer's
 * `(d && d.customers) || []` read at portal.html line 7311). Bare arrays
 * and `{ items }` wrappers are tolerated for defensive parity.
 */
export type CustomersListResponse =
  | { customers?: Customer[]; items?: Customer[] }
  | Customer[]
  | ApiListResponse<Customer>

// ---------------------------------------------------------------------------
// Audiences view · saved-audiences table
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `<section id="view-audiences">`
// (lines 1822-1866) + the legacy renderer `_kixRenderAudiencesRows()` at
// line 6769-6785 and `kixLoadAudiences()` at line 6799-6807.
//
// The live legacy view hits the PAGINATED route
//   GET /api/v1/portal/settings/audiences/<bid>/page?page=&page_size=
// which returns `{ items, total, has_more }` with an inline row schema of
//   { audience_id, name, source, size, last_refreshed_at: { formatted_display },
//     status }
// — a settings-router shape with brand id explicit in the URL.
//
// Plan 4 T4 ports against the SIMPLER `/api/v1/portal-admin/audiences`
// endpoint instead, which:
//   - returns a bare `Audience[]` (FastAPI `response_model=list[Audience]`,
//     see app/routers/portal_admin.py line 571)
//   - infers brand from the JWT (`get_current_brand` dependency) — no
//     explicit brand arg, same pattern as `listCustomers()` in Plan 4 T3
//   - emits demo data with the canonical Audience pydantic model fields
//     (id, name, type, size_estimate, geofence_m?, created_at,
//     last_used_at?) — see portal_admin.py line 185-192
//
// Trade-off documented: the portal-admin route has no `status`, no
// `source` (it has `type` instead — geofence / lookalike / retargeting /
// custom), and no `last_refreshed_at`. We render `type` as a small badge
// (UX intent identical to the channel badge in CustomerList) and surface
// `last_used_at` in the date column. The richer paginated settings route
// + StatusBadge wiring + pagination controls + new-audience form + edit +
// RFM-summary integration are DEFERRED to later Plan 4 sub-tasks.
//
// Fields on the portal-admin Audience model (every field except id+name
// is rendered defensively — backend always emits id/name/type/created_at
// but we treat the optional ones as nullable in case the schema evolves):
//
//   - id:            opaque audience id (row key)
//   - name:          display title (e.g. "Bedok · 200m geofence")
//   - type:          'geofence' | 'lookalike' | 'retargeting' | 'custom'
//   - size_estimate: integer · members in the saved segment
//   - geofence_m:    integer · radius in metres (only for geofence type)
//   - created_at:    ISO date string
//   - last_used_at:  ISO date string · when the audience was last referenced
//                    by a campaign / flow / push. May be null for unused.

export type AudienceType = 'geofence' | 'lookalike' | 'retargeting' | 'custom' | string

export interface Audience {
  id: string
  name: string
  type?: AudienceType
  size_estimate?: number
  geofence_m?: number | null
  created_at?: string
  last_used_at?: string | null
}

/**
 * Portal-admin endpoint returns a bare array. We also accept the legacy
 * paginated `{ items }` wrapper and the `{ audiences }` wrapper used by
 * the settings-router endpoint defensively, mirroring the Campaigns /
 * Customers / Flows pattern. The view normalises all three.
 */
export type AudiencesListResponse =
  | Audience[]
  | { audiences?: Audience[]; items?: Audience[] }
  | ApiListResponse<Audience>

// ---------------------------------------------------------------------------
// AbTests view · A/B tests list
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `<section id="view-abtests">`
// (lines 1911-1928) + legacy fetcher `kixLoadAbTests()` (~line 6965).
// Endpoint: GET /api/v1/portal-admin/ab-tests (brand inferred from JWT
// via `get_current_brand` dependency — no explicit `?brand=` param, same
// pattern as `listCustomers()` / `listAudiences()`).
//
// Backend (app/routers/portal_admin.py line 2649) returns a wrapper:
//   {
//     items: AbTest[],
//     source: 'redis · abtests:<bid>',
//     updated_at: ISO timestamp,
//     freshness: 'real-time',
//     campaign_count: int,
//     can_create: bool,                    // false when < 2 campaigns
//     empty_state_hint: string | null,     // gated copy for empty state
//   }
//
// Each test row carries the fields the legacy renderer reads at portal.html
// line 6986-7008 (every field is optional from a defensive-rendering POV
// except `id` — the FastAPI route always emits id+name+status+created_at
// for both demo + real data, but we treat the rest as nullable in case
// the schema evolves):
//
//   - id:               opaque test id (row key)
//   - name:             display title (e.g. "Morning Combo · CTA copy")
//   - campaign_a_id:    variant A campaign id (always present)
//   - campaign_a_name:  variant A display name; falls back to id
//   - campaign_b_id:    variant B campaign id (always present)
//   - campaign_b_name:  variant B display name; falls back to id
//   - metric:           'CTR' | 'CPA' | 'Conversion' | 'Redemption' | 'Lift'
//                       (server-enforced enum — see ABTestCreate model)
//   - status:           'running' | 'significant' | 'shipped' | 'stopped'
//                       — drives the badge + Ship CTA gating
//   - lift_pct:         signed percentage (e.g. +18.4 / -2.1); null when
//                       the engine has no verdict yet
//   - p_value:          significance p-value; null until exposures > 0
//   - winner:           'a' | 'b' — set when status == 'shipped'
//   - created_at:       ISO timestamp string
//
// Plan 4 T5 ports ONLY the page header + tests list table. DEFERRED:
//   - New-test create form (`#abtest-modal` at portal.html line 7036) +
//     POST `/api/v1/portal-admin/ab-tests`
//   - Per-test results dashboard (`kixAbTestView()` + GET
//     `/api/v1/portal-admin/ab-tests/<id>/results` at line 7092)
//   - Ship-winner CTA (`kixAbTestShip()` + POST
//     `/api/v1/portal-admin/ab-tests/<id>/ship` at line 7147)
//   - Variant editor (currently lives in the modal — single-shot picker)
//   - Fail-closed empty state that flips between "+ New test" and
//     "Go to Campaigns →" based on `can_create` / `campaign_count`
//   - Lift / p-value formatted columns (green / red colouring)

export type AbTestStatus = 'running' | 'significant' | 'shipped' | 'stopped' | string
export type AbTestMetric = 'CTR' | 'CPA' | 'Conversion' | 'Redemption' | 'Lift' | string

export interface AbTest {
  id: string
  name?: string
  campaign_a_id?: string
  campaign_a_name?: string
  campaign_b_id?: string
  campaign_b_name?: string
  metric?: AbTestMetric
  status?: AbTestStatus
  lift_pct?: number | null
  p_value?: number | null
  winner?: 'a' | 'b' | string
  created_at?: string
}

/**
 * Backend canonical shape is the `{ items, source, updated_at, ... }`
 * wrapper. We also accept bare arrays and `{ abtests }` / `{ ab_tests }`
 * wrappers defensively, mirroring the Campaigns / Audiences / Flows
 * pattern — the view normalises all variants.
 */
export type AbTestsListResponse =
  | AbTest[]
  | {
      items?: AbTest[]
      abtests?: AbTest[]
      ab_tests?: AbTest[]
      source?: string
      updated_at?: string
      can_create?: boolean
      campaign_count?: number
      empty_state_hint?: string | null
    }
