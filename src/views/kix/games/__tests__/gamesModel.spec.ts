/**
 * gamesModel — pure (UI-free) logic for the Games gallery.
 *
 * Field names verified against the REAL backend brand-games endpoint
 * (portal_admin.py ~line 4482): each game carries game_id / game_slug /
 * name / game_file / cover_url / order_id / play_url. The helpers below
 * mirror the legacy renderer's name-fallback + playability checks and
 * derive an honest set of gallery KPIs — nothing fabricated.
 */
import { describe, it, expect } from 'vitest'
import {
  normalizeGames,
  gameKpis,
  displayName,
  isPlayable,
  playHref,
  coverFallback
} from '../gamesModel'
import type { BrandGame } from '@/api/portal-admin/types'

const sample: BrandGame[] = [
  {
    id: 'g1',
    name: 'Bubble Tea Match',
    game_slug: 'bubbletea_match3',
    status: 'active',
    cover_url: 'https://cdn/x.png',
    play_url: '/play/demo/1',
    order_id: 'ord-1'
  },
  {
    id: 'g2',
    brand_game_name: 'Bakery Spin',
    game_slug: 'bakery_spin',
    status: 'paused',
    game_file: '/games/bakery/index.html'
  },
  {
    // only slug, no play target, no order, no status
    id: 'g3',
    game_slug: 'bookstore_gomoku'
  }
]

describe('normalizeGames', () => {
  it('passes a bare array; unwraps { games } and { items }', () => {
    expect(normalizeGames(sample)).toHaveLength(3)
    expect(normalizeGames({ games: sample })).toHaveLength(3)
    expect(normalizeGames({ items: sample })).toHaveLength(3)
  })
  it('returns [] for null / unexpected shapes', () => {
    expect(normalizeGames(null as never)).toEqual([])
    expect(normalizeGames({} as never)).toEqual([])
  })
})

describe('displayName — legacy fallback chain', () => {
  it('name → brand_game_name → game_name → game_slug → Untitled', () => {
    expect(displayName(sample[0])).toBe('Bubble Tea Match')
    expect(displayName(sample[1])).toBe('Bakery Spin')
    expect(displayName(sample[2])).toBe('bookstore_gomoku')
    expect(displayName({ id: 'x' })).toBe('Untitled')
  })
})

describe('isPlayable / playHref', () => {
  it('isPlayable when any play target exists', () => {
    expect(isPlayable(sample[0])).toBe(true) // play_url
    expect(isPlayable(sample[1])).toBe(true) // game_file
    expect(isPlayable(sample[2])).toBe(false) // slug only, no target
  })
  it('playHref picks the first non-empty target (play_url > game_file > unpacked_url)', () => {
    expect(playHref(sample[0])).toBe('/play/demo/1')
    expect(playHref(sample[1])).toBe('/games/bakery/index.html')
    expect(playHref(sample[2])).toBe('')
    expect(playHref({ id: 'y', unpacked_url: '/u' })).toBe('/u')
  })
})

describe('gameKpis', () => {
  it('counts total / active / playable / customizable from real fields', () => {
    const k = gameKpis(sample)
    expect(k.total).toBe(3)
    expect(k.active).toBe(1) // only g1 is active
    expect(k.playable).toBe(2) // g1 + g2
    expect(k.customizable).toBe(1) // only g1 has order_id
  })
  it('counts "live" as active too', () => {
    expect(gameKpis([{ id: 'a', status: 'live' }]).active).toBe(1)
  })
  it('is safe on empty', () => {
    expect(gameKpis([])).toEqual({ total: 0, active: 0, playable: 0, customizable: 0 })
  })
})

describe('coverFallback — palette + emoji by game type derived from slug', () => {
  it('maps known game-type keywords to a distinct emoji', () => {
    expect(coverFallback({ id: '1', game_slug: 'bubbletea_match3' }).emoji).toBe('🧩') // match
    expect(coverFallback({ id: '2', game_slug: 'lucky_spin' }).emoji).toBe('🎰') // spin
    expect(coverFallback({ id: '3', game_slug: 'trivia_quiz' }).emoji).toBe('❓') // quiz
    expect(coverFallback({ id: '4', game_slug: 'scratch_win' }).emoji).toBe('🎟️') // scratch
    expect(coverFallback({ id: '5', game_slug: 'bookstore_gomoku' }).emoji).toBe('♟️') // board
  })
  it('falls back to a generic emoji + gradient for unknown types', () => {
    const f = coverFallback({ id: '6', game_slug: 'something_weird' })
    expect(f.emoji).toBe('🎲')
    expect(f.gradient).toContain('gradient')
  })
  it('is safe when slug is missing', () => {
    const f = coverFallback({ id: '7' })
    expect(f.emoji).toBe('🎲')
    expect(typeof f.gradient).toBe('string')
  })
})
