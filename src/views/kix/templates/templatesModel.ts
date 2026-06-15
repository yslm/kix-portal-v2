/**
 * templatesModel — pure (UI-free) logic for the Templates gallery.
 *
 * Real fields (v2 Template, verified vs the games/templates endpoint —
 * portal.html renderer ~line 8193): slug / name / cover_url / reskinable.
 * KPIs + filter derive only from these — nothing invented. The cover
 * gradient/emoji is a deterministic placeholder keyed by slug (ports the
 * legacy SVG fallback intent), NOT fabricated data.
 */
import type { Template, TemplatesListResponse } from '@/api/portal-admin/types'

/** Normalise wire shapes to Template[]: bare array | { games } | { items }
 *  (legacy renderer reads `(d && d.games) || []`, portal.html:8246). */
export function normalizeTemplates(raw: TemplatesListResponse): Template[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') {
    const d = raw as { games?: Template[]; items?: Template[] }
    return d.games ?? d.items ?? []
  }
  return []
}

/** Legacy name fallback chain (portal.html:8193): name → slug → "Template". */
export function displayName(t: Template): string {
  return t.name || t.slug || 'Template'
}

export const TEMPLATE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'ready', label: 'Ready to generate' },
  { key: 'catalog', label: 'Browse catalog' }
] as const

export type TemplateFilterKey = (typeof TEMPLATE_FILTERS)[number]['key']

export interface TemplateKpis {
  total: number
  ready: number
  catalog: number
  types: number
}

/** Honest gallery KPIs. "ready" = server-marked reskinable (the legacy
 *  "Ready to generate" chip); "catalog" = the rest; "types" = distinct
 *  game-type buckets derived from slug. */
export function templateKpis(list: Template[]): TemplateKpis {
  const types = new Set<string>()
  const k = list.reduce(
    (acc, t) => {
      acc.total += 1
      if (t.reskinable) acc.ready += 1
      else acc.catalog += 1
      types.add(gameType(t.slug ?? ''))
      return acc
    },
    { total: 0, ready: 0, catalog: 0, types: 0 }
  )
  k.types = types.size
  return k
}

export function filterTemplates(
  list: Template[],
  opts: { filter: TemplateFilterKey; query: string }
): Template[] {
  const q = opts.query.trim().toLowerCase()
  return list.filter((t) => {
    if (opts.filter === 'ready' && !t.reskinable) return false
    if (opts.filter === 'catalog' && t.reskinable) return false
    if (q && !displayName(t).toLowerCase().includes(q) && !(t.slug ?? '').toLowerCase().includes(q))
      return false
    return true
  })
}

// Cover fallback palette by game type — same buckets as gamesModel
// (ports legacy `_KIX_COVER_PALETTE`, portal.html ~line 7375). Kept local
// to the view per the per-view-model convention; a shared slug→cover util
// is a deferred dedup (gamesModel + templatesModel both key by slug).
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

export function coverFallback(t: Template): CoverFallback {
  const [from, to, emoji] = PALETTE[gameType(t.slug ?? '')]
  return { gradient: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`, emoji }
}
