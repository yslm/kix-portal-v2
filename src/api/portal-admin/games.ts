import { http } from './http'
import type {
  BrandGame,
  ApiListResponse,
  GameRecommendRequest,
  GameRecommendation,
  GameBuildRequest,
  GameBuildResponse,
  GameOrder
} from './types'

/**
 * Legacy `kixLoadMyGames()` reads the response as
 * `(data && data.games) || []`, so the canonical shape is
 * `{ games: BrandGame[] }`. We also tolerate bare arrays and the generic
 * `{ items: [...] }` wrapper to stay robust across backend variants.
 */
export type BrandGamesResponse =
  | { games?: BrandGame[]; items?: BrandGame[] }
  | BrandGame[]
  | ApiListResponse<BrandGame>

export const listBrandGames = (brand: string) =>
  http.get<BrandGamesResponse>('/api/v1/portal-admin/brand-games', {
    params: { brand }
  })

// ---------------------------------------------------------------------------
// Smart-Recommend creation wizard (deferred feature, now shipped)
// ---------------------------------------------------------------------------
//
// Legacy callers: kixRecommendGames (~7708) / kixSelectGame (~7989) /
// the order poll loop (~8107) in portal.html.

/**
 * POST /games/recommend — AI ranker over the template library.
 * Response is a bare array of ranked matches (legacy reads `r` directly).
 * A 502/503/504 here means `sample_brander` is unavailable → the caller
 * falls back to a fixed starter set (see wizardModel.STARTER_GAMES).
 */
export const recommendGames = (body: GameRecommendRequest) =>
  http.post<GameRecommendation[]>('/api/v1/portal-admin/games/recommend', body)

/**
 * POST /games/build — queue an async branded build. Returns immediately with
 * an `order_id` + `status` (usually `building`; the R7 sync path may return
 * `completed` with a `game_file` already set, letting the caller skip polling).
 */
export const buildGame = (body: GameBuildRequest) =>
  http.post<GameBuildResponse>('/api/v1/portal-admin/games/build', body)

/**
 * GET /games/orders/{order_id}?brand=<id> — poll one build order. The backend
 * verifies the order belongs to `brand` (cross-brand isolation).
 */
export const getGameOrder = (orderId: string, brand: string) =>
  http.get<GameOrder>(`/api/v1/portal-admin/games/orders/${encodeURIComponent(orderId)}`, {
    params: { brand }
  })
