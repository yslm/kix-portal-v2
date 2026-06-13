/**
 * gamesModel — pure (UI-free) logic for the Games gallery.
 *
 * Field names verified against the REAL backend brand-games endpoint
 * (portal_admin.py ~line 4482): game_id / game_slug / name / game_file /
 * cover_url / order_id / play_url. Kept framework-free so it can be
 * unit-tested without mounting a component (see gamesModel.spec.ts).
 */
import type { BrandGame } from '@/api/portal-admin/types'
import type { BrandGamesResponse } from '@/api/portal-admin/games'

/** Normalise the wire shapes to BrandGame[]: bare array | { games } |
 *  { items } (legacy renderer reads `(d && d.games) || []`). */
export function normalizeGames(raw: BrandGamesResponse): BrandGame[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const d = raw as { games?: BrandGame[]; items?: BrandGame[] }
    return d.games ?? d.items ?? []
  }
  return []
}

/** Legacy name fallback chain (portal.html ~line 7481):
 *  name → brand_game_name → game_name → game_slug → "Untitled". */
export function displayName(g: BrandGame): string {
  return g.name || g.brand_game_name || g.game_name || g.game_slug || 'Untitled'
}

/** First non-empty play target, in the legacy precedence:
 *  play_url > game_file > unpacked_url. Empty string when none. */
export function playHref(g: BrandGame): string {
  return g.play_url || g.game_file || g.unpacked_url || ''
}

/** A game is playable when it has any real play target. */
export function isPlayable(g: BrandGame): boolean {
  return Boolean(playHref(g))
}

export interface GameKpis {
  total: number
  active: number
  playable: number
  customizable: number
}

/** Honest gallery KPIs derived from real fields. "active" counts both the
 *  real "live" and "active"; "customizable" = has an order_id (a reskinned
 *  build the merchant can re-open in the IDE). */
export function gameKpis(list: BrandGame[]): GameKpis {
  return list.reduce<GameKpis>(
    (acc, g) => {
      acc.total += 1
      if (g.status === 'live' || g.status === 'active') acc.active += 1
      if (isPlayable(g)) acc.playable += 1
      if (g.order_id) acc.customizable += 1
      return acc
    },
    { total: 0, active: 0, playable: 0, customizable: 0 }
  )
}

/** Cover fallback palette by game type (ports legacy `_KIX_COVER_PALETTE`,
 *  portal.html ~line 7375). Each entry: [from, to, emoji]. */
const PALETTE: Record<string, [string, string, string]> = {
  scratch: ['#F59E0B', '#92400E', '🎟️'],
  spin: ['#8B5CF6', '#4C1D95', '🎰'],
  quiz: ['#10B981', '#064E3B', '❓'],
  match: ['#EC4899', '#831843', '🧩'],
  puzzle: ['#3B82F6', '#1E3A8A', '🔍'],
  arcade: ['#EF4444', '#7F1D1D', '🎮'],
  board: ['#0EA5E9', '#0C4A6E', '♟️'],
  card: ['#A855F7', '#581C87', '🃏'],
  other: ['#64748B', '#1E293B', '🎲']
}

/** Map a slug to a game-type bucket via keyword match (ordered). */
function gameType(slug: string): keyof typeof PALETTE {
  const s = slug.toLowerCase()
  if (s.includes('scratch')) return 'scratch'
  if (s.includes('spin') || s.includes('wheel')) return 'spin'
  if (s.includes('quiz') || s.includes('trivia')) return 'quiz'
  if (s.includes('match')) return 'match'
  if (s.includes('puzzle')) return 'puzzle'
  if (s.includes('arcade') || s.includes('run')) return 'arcade'
  if (s.includes('gomoku') || s.includes('board') || s.includes('chess')) return 'board'
  if (s.includes('card') || s.includes('poker')) return 'card'
  return 'other'
}

export interface CoverFallback {
  gradient: string
  emoji: string
}

/** Deterministic gradient + emoji placeholder for games without a
 *  `cover_url` (the legacy SVG fallback, simplified to a CSS gradient). */
export function coverFallback(g: BrandGame): CoverFallback {
  const [from, to, emoji] = PALETTE[gameType(g.game_slug ?? '')]
  return {
    gradient: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
    emoji
  }
}
