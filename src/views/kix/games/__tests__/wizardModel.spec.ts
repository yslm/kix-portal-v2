/**
 * wizardModel — pure logic for the Games Smart-Recommend creation wizard.
 * Covers the recommend-fallback decision, response normalisation, score /
 * difficulty formatting, play-target precedence, the poll → phase mapping,
 * and the progress tween. No timers, no mounting.
 */
import { describe, it, expect } from 'vitest'
import {
  STARTER_GAMES,
  isServiceUnavailable,
  errorStatus,
  normalizeRecommendations,
  scorePct,
  difficultyLabel,
  orderPlayHref,
  orderPhase,
  pollDeadlineExceeded,
  nextProgress,
  POLL_HARD_CAP_MS,
  PROGRESS_CAP
} from '../wizardModel'

describe('wizardModel · recommend fallback', () => {
  it('exposes exactly the 3 legacy starter games', () => {
    expect(STARTER_GAMES.map((g) => g.slug)).toEqual([
      'bubbletea_match3',
      'bakery_maker',
      'bookstore_gomoku'
    ])
  })

  it('treats 502/503/504 as service-unavailable, others not', () => {
    expect(isServiceUnavailable(502)).toBe(true)
    expect(isServiceUnavailable(503)).toBe(true)
    expect(isServiceUnavailable(504)).toBe(true)
    expect(isServiceUnavailable(500)).toBe(false)
    expect(isServiceUnavailable(429)).toBe(false)
    expect(isServiceUnavailable(undefined)).toBe(false)
  })

  it('reads status off axios-style errors', () => {
    expect(errorStatus({ response: { status: 503 } })).toBe(503)
    expect(errorStatus({ status: 504 })).toBe(504)
    expect(errorStatus(new Error('x'))).toBeUndefined()
    expect(errorStatus(undefined)).toBeUndefined()
  })
})

describe('wizardModel · normalizeRecommendations', () => {
  const rows = [{ slug: 'a' }, { slug: 'b' }]
  it('passes a bare array through', () => {
    expect(normalizeRecommendations(rows)).toBe(rows)
  })
  it('unwraps { recommendations } then { items }', () => {
    expect(normalizeRecommendations({ recommendations: rows })).toBe(rows)
    expect(normalizeRecommendations({ items: rows })).toBe(rows)
  })
  it('returns [] for null/garbage', () => {
    expect(normalizeRecommendations(null)).toEqual([])
    expect(normalizeRecommendations('nope')).toEqual([])
    expect(normalizeRecommendations({})).toEqual([])
  })
})

describe('wizardModel · formatting', () => {
  it('renders 0..1 score as a percent', () => {
    expect(scorePct(0.85)).toBe('85%')
    expect(scorePct(1)).toBe('100%')
    expect(scorePct(0)).toBe('0%')
  })
  it('treats >1 as an already-multiplied percent', () => {
    expect(scorePct(72)).toBe('72%')
  })
  it('returns "" for missing/NaN score', () => {
    expect(scorePct(undefined)).toBe('')
    expect(scorePct(NaN)).toBe('')
  })
  it('labels difficulty hints', () => {
    expect(difficultyLabel('easy')).toBe('Quick reskin')
    expect(difficultyLabel('hard')).toBe('Custom build')
    expect(difficultyLabel(undefined)).toBe('')
    expect(difficultyLabel(null)).toBe('')
  })
})

describe('wizardModel · order play target + phase', () => {
  it('picks play target in precedence play_url > game_file > unpacked_url', () => {
    expect(orderPlayHref({ play_url: '/p', game_file: '/g', unpacked_url: '/u' })).toBe('/p')
    expect(orderPlayHref({ game_file: '/g', unpacked_url: '/u' })).toBe('/g')
    expect(orderPlayHref({ unpacked_url: '/u' })).toBe('/u')
    expect(orderPlayHref({})).toBe('')
  })

  it('maps failed / timeout terminal phases', () => {
    expect(orderPhase({ status: 'failed' })).toBe('failed')
    expect(orderPhase({ status: 'timeout' })).toBe('timeout')
  })

  it('completed without a play target keeps building (guard)', () => {
    expect(orderPhase({ status: 'completed' })).toBe('building')
  })

  it('completed with a play target is done', () => {
    expect(orderPhase({ status: 'completed', game_file: '/g/index.html' })).toBe('done')
  })

  it('building stays building', () => {
    expect(orderPhase({ status: 'building' })).toBe('building')
  })
})

describe('wizardModel · poll deadline + progress', () => {
  it('flags the hard 5-minute deadline', () => {
    expect(pollDeadlineExceeded(0)).toBe(false)
    expect(pollDeadlineExceeded(POLL_HARD_CAP_MS - 1)).toBe(false)
    expect(pollDeadlineExceeded(POLL_HARD_CAP_MS)).toBe(true)
  })

  it('climbs progress toward the cap, never decreasing or exceeding it', () => {
    expect(nextProgress(8)).toBe(14)
    expect(nextProgress(82)).toBe(PROGRESS_CAP)
    expect(nextProgress(PROGRESS_CAP)).toBe(PROGRESS_CAP)
  })
})
