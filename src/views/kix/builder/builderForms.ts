/**
 * builderForms — pure (UI-free) logic for the 6 Builder module sub-forms.
 *
 * Source: portal.html #view-builder (lines 878-1184) + the collect helpers
 * (`_collectGame` ~10360 / `_collectVoucher` ~10459 / `_collectRule` ~10305 /
 * `_collectSchedule` ~10498 / `_collectSafety` ~10554 / `_collectTournament`
 * ~10584) and the opportunity-score cfg assembly (~10211) + publish body
 * (BuilderPublishRequest, portal_admin.py ~251). Every field option / range
 * / default below is verified against that source.
 *
 * Kept framework-free so the field specs, collectors, cfg/publish assembly,
 * validation, and draft persistence can be unit-tested without mounting.
 */
import type { BuildModuleId } from './builderModel'
import type { OpportunityScoreRequest } from '@/api/portal-admin/types'

export type FieldType = 'select' | 'number' | 'toggle' | 'weekday' | 'safety'

export interface SelectOption {
  value: string | number
  label: string
}

export interface FieldSpec {
  id: string
  label: string
  type: FieldType
  options?: SelectOption[]
  min?: number
  max?: number
  default: unknown
  /** number-field suffix / hint (e.g. "SGD"). */
  suffix?: string
}

const HOURS: SelectOption[] = [
  '00:00',
  '06:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '15:00',
  '18:00',
  '21:00',
  '23:00',
  '24:00'
].map((h) => ({ value: h, label: h }))

/** Per-module field definitions (the real legacy controls). */
export const MODULE_FIELDS: Record<BuildModuleId, FieldSpec[]> = {
  game: [
    {
      id: 'template_id',
      label: 'Game template',
      type: 'select',
      default: 'spin_and_win',
      options: [
        { value: 'spin_and_win', label: 'Spin & Win' },
        { value: 'scratch_card', label: 'Scratch Card' },
        { value: 'mystery_box', label: 'Mystery Box' },
        { value: 'catch_the_bubble', label: 'Catch the Bubble' },
        { value: 'memory_match', label: 'Memory Match' }
      ]
    },
    {
      id: 'difficulty',
      label: 'Difficulty',
      type: 'select',
      default: 'medium',
      options: [
        { value: 'easy', label: 'Easy' },
        { value: 'medium', label: 'Medium' },
        { value: 'hard', label: 'Hard' }
      ]
    },
    {
      id: 'session_secs',
      label: 'Play time per session',
      type: 'select',
      default: 30,
      options: [
        { value: 15, label: '15 seconds' },
        { value: 30, label: '30 seconds' },
        { value: 60, label: '60 seconds' }
      ]
    },
    {
      id: 'brand_assets',
      label: 'Brand assets',
      type: 'select',
      default: 'auto',
      options: [
        { value: 'auto', label: 'Auto-generate' },
        { value: 'upload', label: 'Upload my own' }
      ]
    }
  ],
  voucher: [
    {
      id: 'vertical',
      label: 'Vertical',
      type: 'select',
      default: 'bubble_tea',
      options: [
        { value: 'bubble_tea', label: 'Bubble tea' },
        { value: 'cafe', label: 'Café' },
        { value: 'bakery', label: 'Bakery' },
        { value: 'restaurant', label: 'Restaurant' },
        { value: 'hawker', label: 'Hawker' },
        { value: 'salon', label: 'Salon' },
        { value: 'gym', label: 'Gym' },
        { value: 'retail', label: 'Retail' }
      ]
    },
    {
      id: 'template_id',
      label: 'Voucher template',
      type: 'select',
      default: '',
      options: [] // populated at runtime from /builder/voucher-templates?vertical=
    },
    { id: 'inventory', label: 'Inventory cap', type: 'number', min: 0, max: 100000, default: 500 },
    {
      id: 'daily_budget_sgd',
      label: 'Daily budget',
      type: 'number',
      min: 5,
      max: 10000,
      default: 50,
      suffix: 'SGD'
    }
  ],
  rule: [
    {
      id: 'pass_rate_target_pct',
      label: 'Pass rate target',
      type: 'number',
      min: 40,
      max: 95,
      default: 80,
      suffix: '%'
    },
    {
      id: 'daily_cap_per_user',
      label: 'Vouchers per person / day',
      type: 'number',
      min: 1,
      max: 10,
      default: 1
    },
    {
      id: 'geo_radius_m',
      label: 'Geofence',
      type: 'select',
      default: 200,
      options: [
        { value: 0, label: 'Anywhere' },
        { value: 50, label: 'Inside store (50m)' },
        { value: 200, label: 'Nearby (200m)' },
        { value: 500, label: 'Same street (500m)' }
      ]
    },
    { id: 'requires_approval', label: 'Manual approval', type: 'toggle', default: false }
  ],
  schedule: [
    { id: 'weekday_mask', label: 'Days of week', type: 'weekday', default: [6, 0] },
    { id: 'start_hour', label: 'Start hour', type: 'select', default: '12:00', options: HOURS },
    { id: 'end_hour', label: 'End hour', type: 'select', default: '15:00', options: HOURS },
    {
      id: 'holiday_behavior',
      label: 'Public holidays',
      type: 'select',
      default: 'ignore',
      options: [
        { value: 'ignore', label: 'Ignore' },
        { value: 'boost_2x', label: 'Boost 2×' },
        { value: 'pause', label: 'Pause' }
      ]
    },
    {
      id: 'repeat',
      label: 'Repeat',
      type: 'select',
      default: 'once',
      options: [
        { value: 'once', label: 'Once' },
        { value: 'weekly_x4', label: 'Weekly × 4' },
        { value: 'weekly_x8', label: 'Weekly × 8' },
        { value: 'indefinite', label: 'Indefinitely' }
      ]
    }
  ],
  safety: [
    {
      id: 'redemptions_per_day',
      label: 'Pause if redemptions today exceed',
      type: 'safety',
      min: 10,
      max: 10000,
      default: { enabled: false, threshold: 100 }
    },
    {
      id: 'engagement_24h_floor',
      label: 'Flag if 24h plays fall below',
      type: 'safety',
      min: 1,
      max: 1000,
      default: { enabled: false, threshold: 10 }
    },
    {
      id: 'inventory_zero',
      label: 'Pause when voucher inventory hits zero',
      type: 'safety',
      default: { enabled: false }
    },
    {
      id: 'wallet_floor',
      label: 'Pause + alert if wallet falls below',
      type: 'safety',
      min: 10,
      max: 5000,
      default: { enabled: false, threshold: 50 },
      suffix: 'SGD'
    }
  ],
  tournament: [
    { id: 'enabled', label: 'Enable tournament mode', type: 'toggle', default: false },
    {
      id: 'games_count',
      label: 'Games in tournament',
      type: 'select',
      default: 3,
      options: [
        { value: 2, label: '2 games' },
        { value: 3, label: '3 games' },
        { value: 5, label: '5 games' }
      ]
    },
    {
      id: 'win_condition',
      label: 'Win condition',
      type: 'select',
      default: 'total_score',
      options: [
        { value: 'total_score', label: 'Highest total score' },
        { value: 'all_complete', label: 'Complete all games' },
        { value: 'first_to_n', label: 'First to finish' }
      ]
    },
    {
      id: 'length_days',
      label: 'Tournament length',
      type: 'select',
      default: 14,
      options: [
        { value: 7, label: '7 days' },
        { value: 14, label: '14 days' },
        { value: 30, label: '30 days' }
      ]
    },
    { id: 'min_players', label: 'Min participants', type: 'number', min: 5, max: 500, default: 20 }
  ]
}

export type FieldValues = Record<string, unknown>
export type BuilderState = Record<BuildModuleId, FieldValues>

/** Build a fresh state where every field carries its default. */
export function defaultState(): BuilderState {
  const out = {} as BuilderState
  ;(Object.keys(MODULE_FIELDS) as BuildModuleId[]).forEach((mod) => {
    const v: FieldValues = {}
    MODULE_FIELDS[mod].forEach((f) => {
      v[f.id] = structuredCloneSafe(f.default)
    })
    out[mod] = v
  })
  return out
}

function structuredCloneSafe<T>(x: T): T {
  if (x && typeof x === 'object') return JSON.parse(JSON.stringify(x))
  return x
}

// --- Section collectors (flat values → API section shapes) ----------------

export function collectGame(v: FieldValues) {
  return {
    template_id: v.template_id,
    difficulty: v.difficulty,
    session_secs: Number(v.session_secs),
    brand_assets: v.brand_assets
  }
}

export function collectVoucher(v: FieldValues) {
  return {
    vertical: v.vertical,
    template_id: v.template_id,
    inventory: Number(v.inventory),
    daily_budget_sgd: Number(v.daily_budget_sgd)
  }
}

export function collectRule(v: FieldValues) {
  return {
    pass_rate_target_pct: Number(v.pass_rate_target_pct),
    daily_cap_per_user: Number(v.daily_cap_per_user),
    geo_radius_m: Number(v.geo_radius_m),
    requires_approval: Boolean(v.requires_approval),
    anti_abuse_strict: true
  }
}

export function collectSchedule(v: FieldValues) {
  return {
    weekday_mask: Array.isArray(v.weekday_mask) ? (v.weekday_mask as number[]) : [],
    start_hour: v.start_hour,
    end_hour: v.end_hour,
    holiday_behavior: v.holiday_behavior,
    repeat: v.repeat
  }
}

interface SafetyToggle {
  enabled?: boolean
  threshold?: number
}

export function collectSafety(v: FieldValues) {
  const rules: Record<string, unknown>[] = []
  const red = v.redemptions_per_day as SafetyToggle
  const eng = v.engagement_24h_floor as SafetyToggle
  const inv = v.inventory_zero as SafetyToggle
  const wal = v.wallet_floor as SafetyToggle
  if (red?.enabled)
    rules.push({ type: 'redemptions_per_day', threshold: Number(red.threshold), action: 'pause' })
  if (eng?.enabled)
    rules.push({
      type: 'engagement_24h_floor',
      threshold: Number(eng.threshold),
      action: 'whatsapp_review'
    })
  if (inv?.enabled) rules.push({ type: 'inventory_zero', action: 'pause' })
  if (wal?.enabled)
    rules.push({
      type: 'wallet_floor',
      threshold_sgd: Number(wal.threshold),
      action: 'pause_and_alert'
    })
  return { auto_pause_rules: rules }
}

export function collectTournament(v: FieldValues) {
  if (!v.enabled) return { enabled: false }
  return {
    enabled: true,
    games_count: Number(v.games_count),
    win_condition: v.win_condition,
    length_days: Number(v.length_days),
    min_players: Number(v.min_players)
  }
}

// --- Assembly for the two backend calls -----------------------------------

/** Opportunity-score cfg (mirrors legacy ~10211 — voucher contributes only
 *  template_id + the inside-CPA flag; audience is the hardcoded default). */
export function assembleScoreCfg(state: BuilderState): OpportunityScoreRequest {
  const voucher = collectVoucher(state.voucher)
  return {
    game: collectGame(state.game),
    voucher: voucher.template_id
      ? { template_id: voucher.template_id, inside_cpa_benchmark: true }
      : {},
    rule: collectRule(state.rule),
    schedule: collectSchedule(state.schedule),
    safety: collectSafety(state.safety),
    audience: { type: 'recent_visitors_7d' }
  }
}

export interface PublishBody {
  brand_id: string
  name: string
  game: Record<string, unknown>
  voucher: Record<string, unknown>
  schedule: Record<string, unknown>
  safety: Record<string, unknown>
  tournament: Record<string, unknown>
}

export function assemblePublishBody(
  brandId: string,
  name: string,
  state: BuilderState
): PublishBody {
  return {
    brand_id: brandId,
    name,
    game: collectGame(state.game),
    voucher: collectVoucher(state.voucher),
    schedule: collectSchedule(state.schedule),
    safety: collectSafety(state.safety),
    tournament: collectTournament(state.tournament)
  }
}

/** Required-field validation mirroring the backend publish guard (~396):
 *  game + voucher template_id, a non-empty weekday mask, end > start. */
export function validatePublish(state: BuilderState): string[] {
  const errs: string[] = []
  if (!state.game.template_id) errs.push('Pick a game template')
  if (!state.voucher.template_id) errs.push('Pick a voucher template')
  const sched = collectSchedule(state.schedule)
  if (sched.weekday_mask.length === 0) errs.push('Select at least one day of the week')
  if (String(sched.end_hour) <= String(sched.start_hour))
    errs.push('Schedule end hour must be after the start hour')
  return errs
}

// --- Draft persistence (localStorage, per brand) --------------------------

const DRAFT_KEY = (brand: string) => `kix_builder_draft_${brand}`

export function saveDraft(brand: string, state: BuilderState): void {
  try {
    localStorage.setItem(DRAFT_KEY(brand), JSON.stringify(state))
  } catch {
    // ignore quota / disabled storage
  }
}

export function loadDraft(brand: string): BuilderState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY(brand))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<BuilderState>
    // merge over defaults so a stale draft missing a module still hydrates
    const base = defaultState()
    ;(Object.keys(base) as BuildModuleId[]).forEach((mod) => {
      if (parsed[mod]) base[mod] = { ...base[mod], ...parsed[mod] }
    })
    return base
  } catch {
    return null
  }
}

/** A module is "configured" once it differs from its defaults (used for the
 *  card's done-tick). Compared on the collected shape so field ordering is
 *  irrelevant. */
export function isConfigured(mod: BuildModuleId, state: BuilderState): boolean {
  const fresh = defaultState()
  return JSON.stringify(state[mod]) !== JSON.stringify(fresh[mod])
}
