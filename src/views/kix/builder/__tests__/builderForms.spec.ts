/**
 * builderForms — field specs, section collectors, cfg/publish assembly,
 * publish validation, and draft persistence for the 6 Builder sub-forms.
 * No mounting; localStorage is the jsdom one.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  MODULE_FIELDS,
  defaultState,
  collectGame,
  collectVoucher,
  collectRule,
  collectSchedule,
  collectSafety,
  collectTournament,
  assembleScoreCfg,
  assemblePublishBody,
  validatePublish,
  saveDraft,
  loadDraft,
  isConfigured
} from '../builderForms'

describe('builderForms · field specs + defaults', () => {
  it('defines all 6 modules with fields', () => {
    expect(Object.keys(MODULE_FIELDS).sort()).toEqual(
      ['game', 'voucher', 'rule', 'schedule', 'safety', 'tournament'].sort()
    )
  })

  it('defaultState seeds every field from its default', () => {
    const s = defaultState()
    expect(s.game.template_id).toBe('spin_and_win')
    expect(s.rule.pass_rate_target_pct).toBe(80)
    expect(s.schedule.weekday_mask).toEqual([6, 0])
    expect(s.tournament.enabled).toBe(false)
    // nested defaults are cloned, not shared
    s.safety.redemptions_per_day = { enabled: true, threshold: 9 }
    expect(defaultState().safety.redemptions_per_day).toEqual({ enabled: false, threshold: 100 })
  })
})

describe('builderForms · collectors', () => {
  it('collectGame coerces session_secs to a number', () => {
    expect(
      collectGame({
        template_id: 'mystery_box',
        difficulty: 'hard',
        session_secs: '60',
        brand_assets: 'auto'
      })
    ).toEqual({
      template_id: 'mystery_box',
      difficulty: 'hard',
      session_secs: 60,
      brand_assets: 'auto'
    })
  })

  it('collectVoucher coerces numbers', () => {
    expect(
      collectVoucher({
        vertical: 'cafe',
        template_id: 'v1',
        inventory: '300',
        daily_budget_sgd: '80'
      })
    ).toEqual({ vertical: 'cafe', template_id: 'v1', inventory: 300, daily_budget_sgd: 80 })
  })

  it('collectRule always sets anti_abuse_strict and maps approval to bool', () => {
    expect(
      collectRule({
        pass_rate_target_pct: '85',
        daily_cap_per_user: '2',
        geo_radius_m: '500',
        requires_approval: true
      })
    ).toEqual({
      pass_rate_target_pct: 85,
      daily_cap_per_user: 2,
      geo_radius_m: 500,
      requires_approval: true,
      anti_abuse_strict: true
    })
  })

  it('collectSchedule preserves the weekday mask', () => {
    const r = collectSchedule({
      weekday_mask: [1, 3, 5],
      start_hour: '09:00',
      end_hour: '18:00',
      holiday_behavior: 'pause',
      repeat: 'weekly_x4'
    })
    expect(r.weekday_mask).toEqual([1, 3, 5])
    expect(r.repeat).toBe('weekly_x4')
  })

  it('collectSafety only emits enabled rules, in the legacy action mapping', () => {
    const r = collectSafety({
      redemptions_per_day: { enabled: true, threshold: 200 },
      engagement_24h_floor: { enabled: false, threshold: 10 },
      inventory_zero: { enabled: true },
      wallet_floor: { enabled: true, threshold: 75 }
    })
    expect(r.auto_pause_rules).toEqual([
      { type: 'redemptions_per_day', threshold: 200, action: 'pause' },
      { type: 'inventory_zero', action: 'pause' },
      { type: 'wallet_floor', threshold_sgd: 75, action: 'pause_and_alert' }
    ])
  })

  it('collectTournament returns just {enabled:false} when off', () => {
    expect(collectTournament({ enabled: false, games_count: 3 })).toEqual({ enabled: false })
    expect(
      collectTournament({
        enabled: true,
        games_count: '5',
        win_condition: 'first_to_n',
        length_days: '30',
        min_players: '50'
      })
    ).toEqual({
      enabled: true,
      games_count: 5,
      win_condition: 'first_to_n',
      length_days: 30,
      min_players: 50
    })
  })
})

describe('builderForms · assembly', () => {
  it('assembleScoreCfg trims voucher to template_id + flag, hardcodes audience', () => {
    const s = defaultState()
    s.voucher.template_id = 'tmpl_5off'
    const cfg = assembleScoreCfg(s)
    expect(cfg.voucher).toEqual({ template_id: 'tmpl_5off', inside_cpa_benchmark: true })
    expect(cfg.audience).toEqual({ type: 'recent_visitors_7d' })
    expect(cfg.game).toMatchObject({ template_id: 'spin_and_win' })
  })

  it('assembleScoreCfg sends empty voucher when no template chosen', () => {
    expect(assembleScoreCfg(defaultState()).voucher).toEqual({})
  })

  it('assemblePublishBody carries brand + name + all collected modules', () => {
    const s = defaultState()
    s.voucher.template_id = 'tmpl_5off'
    const body = assemblePublishBody('42', 'Weekend spin', s)
    expect(body.brand_id).toBe('42')
    expect(body.name).toBe('Weekend spin')
    expect(body.game).toMatchObject({ template_id: 'spin_and_win' })
    expect(body.voucher).toMatchObject({ template_id: 'tmpl_5off' })
    expect(body.schedule.weekday_mask).toEqual([6, 0])
  })
})

describe('builderForms · validatePublish', () => {
  it('flags missing voucher template + empty weekday mask + bad hour order', () => {
    const s = defaultState()
    s.schedule.weekday_mask = []
    s.schedule.start_hour = '18:00'
    s.schedule.end_hour = '12:00'
    const errs = validatePublish(s)
    expect(errs).toContain('Pick a voucher template')
    expect(errs).toContain('Select at least one day of the week')
    expect(errs).toContain('Schedule end hour must be after the start hour')
  })

  it('passes once game + voucher templates + a valid schedule are set', () => {
    const s = defaultState()
    s.voucher.template_id = 'tmpl_5off'
    expect(validatePublish(s)).toEqual([])
  })
})

describe('builderForms · draft persistence + isConfigured', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips a draft per brand and merges over defaults', () => {
    const s = defaultState()
    s.rule.pass_rate_target_pct = 95
    saveDraft('42', s)
    const loaded = loadDraft('42')
    expect(loaded?.rule.pass_rate_target_pct).toBe(95)
    // a different brand has no draft
    expect(loadDraft('99')).toBeNull()
  })

  it('isConfigured is false at defaults, true after a change', () => {
    const s = defaultState()
    expect(isConfigured('rule', s)).toBe(false)
    s.rule.daily_cap_per_user = 5
    expect(isConfigured('rule', s)).toBe(true)
  })
})
