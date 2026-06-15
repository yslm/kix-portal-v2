/**
 * flowWizardModel — template normalisation, money/int formatting, funnel
 * bars, sim cards, input validation, and the publish sentence.
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeTemplates,
  fmtMoney,
  fmtInt,
  funnelBars,
  simCards,
  validateSimInputs,
  publishedSentence
} from '../flowWizardModel'
import type { FlowSimulation } from '@/api/portal-admin/types'

describe('flowWizardModel · normalizeTemplates', () => {
  const t = [{ template_id: 'a', name: 'A' }]
  it('unwraps { templates } / { items } / bare array', () => {
    expect(normalizeTemplates({ templates: t })).toBe(t)
    expect(normalizeTemplates({ items: t })).toBe(t)
    expect(normalizeTemplates(t)).toBe(t)
  })
  it('empty for garbage', () => {
    expect(normalizeTemplates({} as never)).toEqual([])
  })
})

describe('flowWizardModel · formatting', () => {
  it('formats money with the sim currency symbol', () => {
    expect(fmtMoney('SAR', 634000)).toBe('SAR634,000')
    expect(fmtMoney(undefined, 1200)).toBe('S$1,200')
    expect(fmtMoney('SAR', undefined)).toBe('—')
  })
  it('formats ints', () => {
    expect(fmtInt(16637)).toBe('16,637')
    expect(fmtInt(undefined)).toBe('—')
  })
})

describe('flowWizardModel · funnelBars + simCards', () => {
  const sim: FlowSimulation = {
    projected_reach: 61800,
    final_completers: 16637,
    currency_symbol: 'SAR',
    projected_total_cost: 634000,
    projected_cost_per_completer: 38,
    step_funnel: [
      { step_id: 's1', label: 'Login', completers: 55000 },
      { step_id: 's2', label: 'Streak', completers: 30250 },
      { step_id: 's3', label: 'Complete', completers: 16637 }
    ]
  }

  it('normalises bars to the largest step (100%)', () => {
    const bars = funnelBars(sim)
    expect(bars).toHaveLength(3)
    expect(bars[0].pct).toBe(100)
    expect(bars[1].pct).toBe(55) // 30250/55000
    expect(bars[2].label).toBe('Complete')
  })

  it('empty funnel for null sim', () => {
    expect(funnelBars(null)).toEqual([])
  })

  it('formats the four headline cards', () => {
    const cards = simCards(sim)
    expect(cards.map((c) => c.value)).toEqual(['61,800', '16,637', 'SAR634,000', 'SAR38'])
  })
})

describe('flowWizardModel · validation + publish sentence', () => {
  it('validates sim inputs', () => {
    expect(validateSimInputs(100000, 0.3)).toBeNull()
    expect(validateSimInputs(0, 0.3)).toMatch(/audience/)
    expect(validateSimInputs(100, 1.5)).toMatch(/repeat rate/)
  })
  it('builds the published sentence', () => {
    expect(publishedSentence('Ramadan', '2026-03-01', '2026-03-30', 3)).toBe(
      '"Ramadan" is live from 2026-03-01 to 2026-03-30 · 3 steps will fire automatically.'
    )
    expect(publishedSentence(undefined, undefined, undefined, 1)).toBe(
      '"Your flow" is live · 1 step will fire automatically.'
    )
  })
})
