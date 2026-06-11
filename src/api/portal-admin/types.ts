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

// ---------------------------------------------------------------------------
// Rules / Automations view · rule list
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `<section id="view-rules">`
// (lines 1933-1955) + legacy fetcher `kixLoadRules()` (~line 7185).
//
// The legacy page is called "Automations" in the rendered title but the
// underlying view-id / route name is still "rules" (see portal.html line
// 1933 `id="view-rules"` and line 1936 `<h1>Automations</h1>`). The wire
// endpoint also lives under `/automations` —
// `GET /api/v1/portal-admin/automations` — brand inferred from the JWT
// (no explicit `?brand=` param, same pattern as listCustomers() /
// listAudiences() / listAbTests()).
//
// Wire response (legacy renderer line 7191-7232) is a wrapper:
//   {
//     items: Rule[],                    // canonical rows
//     source: string,                   // e.g. 'redis · automations:<bid>'
//     updated_at: ISO timestamp,
//     freshness?: 'real-time',
//     empty_state_hint?: string | null  // gated copy for empty state
//   }
//
// Each rule row carries the fields the legacy renderer reads (every one
// optional from a defensive-rendering POV except `id` — the FastAPI route
// always emits id+name+state+action for both demo + real data, but we
// treat the rest as nullable in case the schema evolves):
//
//   - id:                  opaque rule id (row key)
//   - name:                display title (e.g. "Pause low-CTR campaigns")
//   - state:               'on' | 'off' | 'notify_only' — drives the
//                          legacy state badge ("On" green / "Off" gray /
//                          "Notify only" gray). v2 maps onto StatusBadge:
//                          'on' → active, 'off' → inactive, 'notify_only'
//                          → falls through to gray pill (no mapping, safe
//                          default).
//   - condition:           free-form condition summary (e.g.
//                          "spend > S$50 AND CTR < 0.5%")
//   - action:              'pause' | 'scale' | 'notify' — drives the
//                          per-row Action badge in the legacy renderer.
//   - scope:               free-form scope label ("All campaigns",
//                          "Voucher pools", "Account", …)
//   - last_triggered_at:   ISO timestamp string or pre-formatted "Xh ago"
//                          string. Em-dash placeholder when absent.
//
// Plan 4 T6 ports ONLY the page header + rules list table. DEFERRED:
//   - Per-row On / Off / Notify only toggle buttons + the PATCH
//     `/api/v1/portal-admin/automations/<id>/state` fetcher (`kixToggleAutomation()` at line 7238)
//   - "+ Create rule" CTA — legacy redirects to the Flows view
//   - Audit log button — opens `kixOpenAuditLog()` modal
//   - Dry-run endpoint (`POST /api/v1/portal-admin/rules/dry-run` at
//     portal.html line 10495) used by the rule builder preview pane

export type RuleState = 'on' | 'off' | 'notify_only' | string
export type RuleAction = 'pause' | 'scale' | 'notify' | string

export interface Rule {
  id: string
  name?: string
  state?: RuleState
  condition?: string
  action?: RuleAction
  scope?: string
  last_triggered_at?: string | null
}

/**
 * Backend canonical shape is the `{ items, source, updated_at, ... }`
 * wrapper. We also accept bare arrays and `{ rules }` / `{ automations }`
 * wrappers defensively, mirroring the Campaigns / Audiences / AbTests
 * pattern — the view normalises all variants.
 */
export type RulesListResponse =
  | Rule[]
  | {
      items?: Rule[]
      rules?: Rule[]
      automations?: Rule[]
      source?: string
      updated_at?: string
      empty_state_hint?: string | null
    }

// ---------------------------------------------------------------------------
// Templates view · template-catalog grid
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `<section id="view-templates">`
// (lines 1753-1777) + legacy fetcher `kixLoadTemplates()` (~line 8235) +
// renderer `_kixRenderTemplates()` (~line 8177).
//
// Wire endpoint:
//   GET /api/v1/portal-admin/games/templates
//     ?limit=<int>&offset=<int>&reskin_only=<bool>
//
// `KIX_STUDIO_API` is hard-coded to `/api/v1/portal-admin/games` at
// portal.html line 3833, so the templates list hangs off the games router
// (not a dedicated `/portal-admin/templates` route). Brand identity is
// inferred from the JWT — no explicit `?brand=` param, mirroring the
// listCustomers() / listAudiences() / listAbTests() / listRules() pattern.
//
// Backend response wrapper (legacy renderer line 8246-8252):
//   {
//     games?: Template[],         // canonical key on this endpoint
//     items?: Template[],         // generic-list fallback
//     total?: number,             // full catalog count (drives "Load more")
//     reskin_count?: number,      // games ready for one-click reskin
//     catalog_only_count?: number,// games visible but not yet buildable
//   }
// The renderer reads `data.games || data.items || (Array.isArray(data) ?
// data : [])`, so bare arrays are also tolerated.
//
// Per-template fields read by the legacy renderer (every one optional
// except `slug`, which is the row key and the SVG-cover fallback seed):
//   - slug:        opaque template id (e.g. "scratch_v1", "wheel_spin")
//   - name:        display title; falls back to slug then "Template"
//   - cover_url:   server-rendered preview image; absent → SVG fallback
//                  generated client-side by `kixCoverFallback(slug, name)`.
//                  Plan 5 T1 omits the SVG fallback — empty cover renders
//                  as a plain placeholder block. The legacy Nano-Banana
//                  cover hydration (`kixHydrateCovers`) is DEFERRED.
//   - reskinable:  bool · server hint that one-click brand reskin is
//                  ready. Mirrored by `_kixIsReskinable()` against an
//                  in-portal cache of slugs (`/reskin-slugs` endpoint).
//                  Plan 5 T1 surfaces this as a "Ready" badge when true;
//                  the full reskin-slug cross-check is DEFERRED.
//
// Plan 5 T1 ports ONLY the page header + a single-page catalog grid.
// DEFERRED (legacy still owns these surfaces):
//   - Filter chips: "Ready to generate" / "Browse full catalog"
//     (`kixSetTemplateFilter()` + `_kixTplReskinOnly` flag)
//   - Sort dropdown: popular_vertical / highest_roi / best_for_new /
//     trending (`kixApplyTemplateSort()` at portal.html line 1766)
//   - Per-card rank badge (#1 / #2 / #3 / 🔥 Trending) + community
//     ranking signals (`_kixSeedSignals()`)
//   - Per-card star ratings + peer-count line + ROI signal
//   - Detail panel (`kixOpenGameDetail()`) opened on card click
//   - "Try demo" iframe modal (`kixOpenDemo()`)
//   - "Load more" pagination button + offset accumulator
//   - "Coming soon" / catalog-only badge gating
//   - SVG cover fallback + Nano-Banana cover hydration
//   - i18n filter chip counts ("(N)" suffixes)

export interface Template {
  slug: string
  name?: string
  cover_url?: string
  reskinable?: boolean
}

/**
 * Backend canonical shape is `{ games }` (the legacy renderer's first
 * read at portal.html line 8246). Bare arrays + `{ items }` are
 * tolerated for defensive parity with Campaigns / Audiences / Flows.
 * The counts (`total`, `reskin_count`, `catalog_only_count`) are typed
 * but unused by the Plan 5 T1 first-cut view.
 */
export type TemplatesListResponse =
  | Template[]
  | {
      games?: Template[]
      items?: Template[]
      total?: number
      reskin_count?: number
      catalog_only_count?: number
    }

// ---------------------------------------------------------------------------
// Cases view · Case Studio prospects grid
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `<section id="view-cases">`
// (lines 1730-1748) + legacy fetcher `kixLoadCases()` (~line 8461) +
// renderer inlined at ~line 8475-8489.
//
// Wire endpoint:
//   GET /api/v1/portal-admin/case-studio/prospects
//
// `KIX_CASES_API` is hard-coded to `/api/v1/portal-admin/case-studio` at
// portal.html line 8460, so the prospects list hangs off the case-studio
// router. No `?brand=` param — the Case Studio is a platform-internal
// sales tool (per-prospect research + deck gen) keyed by `prospect_id`,
// not by merchant brand. See the router mount in app/main.py line 1043
// (prefix `/api/v1/portal-admin`, FastAPI route `GET /case-studio/prospects`
// at case_studio.py line 89-92, returns `{ "prospects": _list_prospects() }`).
//
// Backend response wrapper (case_studio.py line 91):
//   {
//     prospects: CaseStudyProspect[],   // bare list of seeded + draft profiles
//   }
// The legacy renderer reads `(data && data.prospects) || []`. We accept
// bare arrays + `{ items }` defensively for parity with the rest of the
// portal-admin surface, even though the canonical wire shape is `{ prospects }`.
//
// Per-prospect fields read by the legacy card renderer (portal.html line
// 8475-8488). Every field is optional from a defensive-rendering POV
// except `prospect_id` (row key + click target):
//   - prospect_id:     opaque slug (e.g. "nana", "starbucks_sg") — row key,
//                      also embedded into deck routes (`/landing/decks/<id>/`).
//   - company_name:    display title (e.g. "Nana", "Starbucks SG"). The
//                      legacy renderer reads it raw; we fall back to
//                      prospect_id then "Prospect" for resilience.
//   - primary_url:     prospect's homepage URL — rendered as a small
//                      muted subtitle row under the title.
//   - tagline:         one-line pitch description (e.g. "Saudi q-commerce
//                      leader · 600+ SKUs · 30-min delivery"). Rendered as
//                      the card body copy.
//   - research_status: 'complete' | 'draft' | 'in_progress' | … — drives
//                      the corner badge colour. The legacy renderer hard-
//                      codes the colour pair: `'complete'` → green
//                      (#16A34A on #DCFCE7), everything else → amber
//                      (#92400E on #FEF3C7). We map onto the shared
//                      `<StatusBadge>` via: 'complete' → 'active' (green),
//                      'draft' → 'draft' (gray), anything else → 'pending'
//                      (amber), preserving the binary colour intent.
//
// Plan 5 T2 ports ONLY the page header + the prospects grid of cards
// (title · primary_url subtitle · tagline · research_status badge).
// DEFERRED (legacy still owns these surfaces):
//   - "+ New case" CTA (`kixNewCase()` at portal.html line 8551) — prompts
//     for name/url/vertical, POSTs `/case-studio/prospects` to create a
//     draft seed JSON on disk.
//   - "📊 Open deck" CTA (`kixOpenDeck()` at line 8505) — HEAD-checks
//     `/landing/decks/<id>/index.html`, falls back to a synchronous
//     `POST /case-studio/prospects/<id>/render-deck` then opens the
//     returned `deck_url` in a new tab (popup-blocker dance included).
//   - "↻ Regenerate" CTA (`kixCasesRegenerate()` at line 8526) — same
//     POST, but always re-renders and alerts with the slide count + sha.
//   - Detail panel — the per-prospect full profile (3 Trinity legs,
//     12-slide deck spec, decision-maker map, competitor matrix, ROI
//     math) currently lives ONLY in the rendered HTML deck under
//     `/landing/decks/<id>/`. The portal has no in-app detail surface yet.
//   - Hero feature card (the big gradient panel at portal.html line
//     1739-1743 explaining the feature) — pure copy, no data. Skipped in
//     the first cut to keep the four-state pattern clean; can be folded
//     back in once the i18n keys are wired.
//   - Spinner glyph (`<span class="spinner">`) on the loading row — the
//     v2 view uses a flat text "Loading prospects…" placeholder, matching
//     the Templates / Rules / AbTests convention.

export type CaseStudyResearchStatus = 'complete' | 'draft' | 'in_progress' | string

export interface CaseStudy {
  prospect_id: string
  company_name?: string
  primary_url?: string
  tagline?: string
  research_status?: CaseStudyResearchStatus
}

/**
 * Backend canonical shape is `{ prospects }` (the legacy renderer's
 * `(data && data.prospects) || []` read at portal.html line 8466).
 * Bare arrays + `{ items }` are tolerated for defensive parity with
 * Campaigns / Audiences / Flows / Templates — the view normalises all
 * three variants.
 */
export type CasesListResponse =
  | CaseStudy[]
  | {
      prospects?: CaseStudy[]
      items?: CaseStudy[]
    }

// ---------------------------------------------------------------------------
// VipTiers view · tier ladder + member distribution
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `<section id="view-vip-tiers">`
// (lines 2394-2412) + legacy fetcher `kixLoadVipTiers()` (~line 4087) +
// row renderer `kixAddVipTier()` (~line 4119) + save handler
// `kixSaveVipTiers()` (~line 4127).
//
// Two wire endpoints, fetched in parallel by `Promise.all` in the legacy
// loader (portal.html line 4089-4090):
//
//   GET /api/v1/portal-admin/loyalty-tiers
//     → { brand_id, tiers: LoyaltyTier[], custom: bool }
//        (FastAPI handler portal_admin.py line 3531-3550)
//
//   GET /api/v1/portal-admin/loyalty-tiers/distribution
//     → { brand_id, sampled_members, distribution: LoyaltyTierDistribution[] }
//        (FastAPI handler portal_admin.py line 3575-3612)
//
// Brand inferred from the JWT via `get_current_brand` dependency — no
// explicit `?brand=` param, same pattern as listCustomers() /
// listAudiences() / listRules() / listAbTests() / listTemplates().
//
// Per-tier schema (LoyaltyTiersBody pydantic model + the inline dict
// shape returned by both endpoints):
//   - name:   display title (e.g. "Bronze" / "Silver" / "Gold").
//             Server-validated unique-when-lower-cased on PUT.
//   - min_xp: integer · XP floor for the tier. The PUT handler sorts
//             tiers by min_xp and rejects the body if the lowest tier
//             doesn't start at 0 (every member must fall into a tier).
//   - perk:   free-form perk description (e.g. "Welcome reward on
//             first visit" / "VIP-only vouchers · birthday double").
//
// Distribution rows extend each tier with a `members` count from real
// player XP. The legacy renderer reads `dist.distribution.map(d =>
// d.members)` and graphs each tier as a horizontal bar normalised to
// the max-bucket count (portal.html line 4099-4106). `sampled_members`
// is the cap-500 sample size shown as a small subscript line.
//
// Plan 5 T3 ports ONLY: page header + read-only tier ladder card +
// read-only distribution card. DEFERRED (legacy still owns these):
//   - Tier rule EDITOR — per-row name/min_xp/perk inputs + "+ Add tier"
//     CTA + "Save tiers" PUT button (`kixAddVipTier()` /
//     `kixSaveVipTiers()` at portal.html line 4119 / 4127). Requires
//     form-state management + 422 error surfacing (lowest min_xp=0,
//     unique names) that goes beyond the four-state read pattern.
//   - The "✕" remove-row button on each editor row.
//   - Toast / inline status pill after a save round-trip
//     (`#vip-tier-status` at portal.html line 2403).
//   - Live re-bucket after save (`kixLoadVipTiers()` is invoked at the
//     tail of `kixSaveVipTiers()` to refresh the distribution graph).

export interface LoyaltyTier {
  name: string
  min_xp: number
  perk: string
}

export interface LoyaltyTiersResponse {
  brand_id?: string
  tiers: LoyaltyTier[]
  custom?: boolean
}

/**
 * Distribution rows extend the tier schema with a `members` count from
 * real player XP. Backend always emits name/min_xp/perk/members for
 * every tier (even tiers with zero members), so the view doesn't need
 * to fill in missing rows from the base config.
 */
export interface LoyaltyTierDistribution extends LoyaltyTier {
  members: number
}

export interface LoyaltyTierDistributionResponse {
  brand_id?: string
  sampled_members: number
  distribution: LoyaltyTierDistribution[]
}

// ---------------------------------------------------------------------------
// Storefront view · public-page preview + URL + embed snippet
// ---------------------------------------------------------------------------
//
// Source: kix-platform/landing/portal.html · `<section id="view-storefront">`
// (lines 2664-2710) + the helpers `kixStorefrontBrand()` /
// `kixRenderStorefrontUrl()` / `kixCopyEmbedSnippet()` at
// line 5368-5388. The legacy section bundles in one place:
//
//   - Page header + subtitle ("The public-facing brand page customers
//     land on after scanning your in-store QR.") at portal.html line
//     2666-2667
//   - "Open public page ↗" CTA in the head — `window.open('/sf/' +
//     brandId, '_blank')` against the brand's public storefront route
//     (which 302-redirects to `/landing/storefront.html?b=<bid>` per
//     app/main.py line 2040-2042).
//   - Preview card (line 2671-2682) — a static "what your customers
//     see" panel with a 96×96 avatar tile + display name + tagline +
//     two CTAs ("Play to win" / "View rewards"). The legacy inline
//     IIFE at line 2682-2693 hydrates the avatar letter + display
//     name from `localStorage.kix_brand_name` / `kix_user_name` as a
//     client-side defensive fill — but the real source of truth is
//     the public storefront profile at
//       GET /api/v1/storefront/{brand_id}
//     which returns the configured `display_name`, `logo_url`,
//     `brand_color`, `bio`, follower_count, avg_rating + rating_count.
//     (See `get_storefront` at app/routers/storefront.py line 462-484.)
//     When the merchant hasn't run "Configure storefront" yet, the
//     server synthesises a default profile from `config:{bid}` (the
//     same brand-config blob the rest of the portal reads). The
//     `is_default: true` flag in the response signals "auto-generated,
//     not yet customised" — we surface a small "Default profile"
//     muted badge so the merchant knows the page is live but generic.
//   - Public URL card (line 2700-2707) — `<code>` block showing
//     `window.location.origin + '/sf/' + kixStorefrontBrand()` (the
//     full canonical absolute URL the merchant copies into their QR
//     code / website nav).
//   - Embed snippet card (line 2708-2710) — a `<textarea>` with an
//     `<iframe>` snippet pointing at `/landing/play.html?brand=<bid>
//     &embed=1&channel=website`, plus a "Copy embed code" CTA that
//     calls `kixCopyEmbedSnippet()` (clipboard write).
//
// Plan 5 T4 ports: page header + preview card (display_name + logo /
// initial fallback + brand_color tile + bio) + Public URL block +
// Embed snippet block (read-only textarea + Copy CTA). The preview
// reads the REAL storefront profile, falling back to a brand-id-only
// preview when the endpoint 404s (brand not provisioned for storefront
// yet). DEFERRED (legacy still owns these surfaces):
//   - Customization EDITOR — `POST /api/v1/storefront/{bid}/configure`
//     form for display_name / bio / logo_url / brand_color / hero
//     image / featured games / vouchers / socials / custom_sections.
//     The endpoint exists (portal.py line 258-309) but requires file
//     upload + a complex multi-section editor that exceeds the four-
//     state read pattern this slice ports.
//   - Follower / rating analytics — surface the `follower_count` and
//     `avg_rating` numbers in a stats strip. The fields are typed
//     here so a later slice can render them without re-shaping.
//   - "Play to win" / "View rewards" preview CTAs — pure marketing
//     decoration that targets the public page; can be folded back in
//     once the public storefront preview is hosted inside an iframe.
//   - The legacy localStorage avatar/name hydration IIFE (portal.html
//     line 2682-2693) — superseded by the real GET /storefront/{bid}
//     fetch in v2, which is server-authoritative.
//
// Wire response shape (from `get_storefront` at storefront.py line
// 479-484 — the canonical `_load_profile` hash unpacked +
// follower_count / avg_rating / rating_count appended):
//
//   {
//     brand_id: string,
//     display_name: string,          // configured or synthesized
//     bio: string,                   // may be empty ""
//     hero_image_url: string | null,
//     logo_url: string | null,
//     brand_color: string,           // hex, defaults to "#00FC00"
//     contact: { email?, phone?, website?, address? },
//     featured_games: string[],      // game slugs
//     featured_vouchers: string[],   // voucher ids
//     show_stores: boolean,
//     socials: { instagram?, tiktok?, facebook? },
//     custom_sections: Array<{ title, content_md }>,
//     country: string | null,
//     category: string | null,
//     created_at: number,            // epoch seconds; 0 for synth
//     updated_at: number,            // epoch seconds; 0 for synth
//     public_url: string,            // canonical /landing/... path
//     is_default?: boolean,          // true → auto-synthesised
//     follower_count: number,
//     avg_rating: number,            // 0.0–5.0
//     rating_count: number
//   }
//
// 404 path: `_load_profile()` returns None only when the brand has no
// `config:{bid}` AND no `brand:{bid}:games` set — a "genuinely unknown
// brand" — which is unreachable for any signed-in merchant. We still
// handle the 404 defensively so the view renders a flat fallback
// preview keyed on the brand id alone (matching the legacy IIFE's
// "T" fallback letter).

export interface StorefrontContact {
  email?: string
  phone?: string
  website?: string
  address?: string
}

export interface StorefrontSocials {
  instagram?: string
  tiktok?: string
  facebook?: string
}

export interface StorefrontCustomSection {
  title: string
  content_md: string
}

export interface StorefrontProfile {
  brand_id?: string
  display_name?: string
  bio?: string
  hero_image_url?: string | null
  logo_url?: string | null
  brand_color?: string
  contact?: StorefrontContact
  featured_games?: string[]
  featured_vouchers?: string[]
  show_stores?: boolean
  socials?: StorefrontSocials
  custom_sections?: StorefrontCustomSection[]
  country?: string | null
  category?: string | null
  created_at?: number
  updated_at?: number
  public_url?: string
  is_default?: boolean
  follower_count?: number
  avg_rating?: number
  rating_count?: number
}

export type StorefrontResponse = StorefrontProfile
