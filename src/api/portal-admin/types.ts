export interface ApiListResponse<T> {
  items: T[]
  total?: number
  cursor?: string | null
}

export interface BrandGame {
  id: string
  brand: string
  name: string
  status?: 'active' | 'paused' | 'draft'
  createdAt?: string
  // Extend as schema is reverse-engineered from real responses.
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
