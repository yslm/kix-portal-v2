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
