/**
 * builderModel — pure logic for the Builder entry view.
 *
 * Real data: opportunity-score { score, hints[] }; module gallery static.
 */
import { describe, it, expect } from 'vitest'
import { BUILD_MODULES, scoreTone, potentialGain, scorePct } from '../builderModel'

describe('BUILD_MODULES', () => {
  it('has the 6 legacy build blocks, each with an icon + i18n key', () => {
    expect(BUILD_MODULES).toHaveLength(6)
    expect(BUILD_MODULES.map((m) => m.id)).toEqual([
      'game',
      'voucher',
      'rule',
      'schedule',
      'safety',
      'tournament'
    ])
    expect(BUILD_MODULES.every((m) => m.icon && m.i18nKey)).toBe(true)
  })
})

describe('scoreTone', () => {
  it('bands by threshold: <40 low, <70 mid, else high', () => {
    expect(scoreTone(0)).toBe('low')
    expect(scoreTone(39)).toBe('low')
    expect(scoreTone(40)).toBe('mid')
    expect(scoreTone(69)).toBe('mid')
    expect(scoreTone(70)).toBe('high')
    expect(scoreTone(100)).toBe('high')
  })
})

describe('potentialGain', () => {
  it('sums hint points, 0 when no hints / null', () => {
    expect(
      potentialGain({
        score: 50,
        hints: [
          { points: 10, label: 'a' },
          { points: 5, label: 'b' }
        ]
      })
    ).toBe(15)
    expect(potentialGain({ score: 100, hints: [] })).toBe(0)
    expect(potentialGain(null)).toBe(0)
  })
})

describe('scorePct', () => {
  it('clamps + rounds to 0-100', () => {
    expect(scorePct(73.6)).toBe(74)
    expect(scorePct(-5)).toBe(0)
    expect(scorePct(140)).toBe(100)
  })
})
