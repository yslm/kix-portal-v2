/**
 * wizardModel — pure (UI-free) logic for the Games Smart-Recommend creation
 * wizard. Ports the decision logic of the legacy portal.html flow
 * (`kixRecommendGames` ~7708 / `kixSelectGame` ~7989 / order poll ~8107)
 * so it can be unit-tested without timers or a mounted component.
 *
 * Flow: describe → recommend (AI ranker) → pick → build (async) →
 * poll order → launch. Field names verified against the backend models
 * (GameRecommendRequest / GameBuildRequest / `_studio_order_payload`).
 */
import type { GameRecommendation, GameOrder, GameOrderStatus } from '@/api/portal-admin/types'

/** Build-order poll cadence + hard ceiling (mirrors backend `_BUILD_DEADLINE_S`). */
export const POLL_INTERVAL_MS = 5000
export const POLL_HARD_CAP_MS = 5 * 60 * 1000

/** Visual progress bar cap while building — never reaches 100% until the
 *  order actually completes (legacy climbs 8% → 85%, then jumps to 100%). */
export const PROGRESS_START = 8
export const PROGRESS_CAP = 85

/**
 * Fixed starter games shown when the AI ranker is unavailable
 * (`/games/recommend` → 502/503/504). Ports the legacy
 * `_kixShowRecommendFallback` trio — no API call needed to build these.
 */
export const STARTER_GAMES: GameRecommendation[] = [
  { slug: 'bubbletea_match3', name: 'Bubble Tea Match-3', reskin_difficulty: 'easy' },
  { slug: 'bakery_maker', name: 'Bakery Maker', reskin_difficulty: 'easy' },
  { slug: 'bookstore_gomoku', name: 'Bookstore Gomoku', reskin_difficulty: 'hard' }
]

/** HTTP statuses that mean "ranker service down → use the starter fallback". */
export function isServiceUnavailable(status?: number): boolean {
  return status === 502 || status === 503 || status === 504
}

/** Pull an HTTP status off an axios-style error (or undefined). */
export function errorStatus(err: unknown): number | undefined {
  const e = err as { response?: { status?: number }; status?: number } | undefined
  return e?.response?.status ?? e?.status
}

/** Tolerate the bare-array response plus defensive `{ items }` /
 *  `{ recommendations }` wrappers. Empty/garbage → []. */
export function normalizeRecommendations(raw: unknown): GameRecommendation[] {
  if (Array.isArray(raw)) return raw as GameRecommendation[]
  if (raw && typeof raw === 'object') {
    const d = raw as { items?: GameRecommendation[]; recommendations?: GameRecommendation[] }
    return d.recommendations ?? d.items ?? []
  }
  return []
}

/** Render a 0..1 match score as a percent. Values already in 1..100 are
 *  treated as a pre-multiplied percent. Missing/invalid → ''. */
export function scorePct(score?: number): string {
  if (typeof score !== 'number' || Number.isNaN(score)) return ''
  const pct = score <= 1 ? score * 100 : score
  return `${Math.round(pct)}%`
}

/** Human label for the soft reskin-difficulty hint. */
export function difficultyLabel(d?: string | null): string {
  if (d === 'easy') return 'Quick reskin'
  if (d === 'hard') return 'Custom build'
  return ''
}

/** First non-empty play target on a finished order, legacy precedence. */
export function orderPlayHref(
  order: Pick<GameOrder, 'play_url' | 'game_file' | 'unpacked_url'>
): string {
  return order.play_url || order.game_file || order.unpacked_url || ''
}

export type WizardPhase = 'building' | 'done' | 'failed' | 'timeout'

/**
 * Map a polled order to a wizard phase. `completed` only counts as `done`
 * once a real play target exists (the legacy guard: status completed AND
 * game_file present); otherwise keep polling. `timeout` is terminal.
 */
export function orderPhase(
  order: Pick<GameOrder, 'status' | 'play_url' | 'game_file' | 'unpacked_url'>
): WizardPhase {
  const s: GameOrderStatus = order.status
  if (s === 'failed') return 'failed'
  if (s === 'timeout') return 'timeout'
  if (s === 'completed' && orderPlayHref(order)) return 'done'
  return 'building'
}

/** Whether the elapsed wall-clock has blown the hard poll deadline. */
export function pollDeadlineExceeded(elapsedMs: number): boolean {
  return elapsedMs >= POLL_HARD_CAP_MS
}

/** Next progress-bar value: climbs by `step` toward the cap, never
 *  decreasing, and never reaching 100% until the caller forces it on done. */
export function nextProgress(current: number, step = 6): number {
  return Math.min(PROGRESS_CAP, Math.max(current, current + step))
}
