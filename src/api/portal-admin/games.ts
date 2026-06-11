import { http } from './http'
import type { BrandGame, ApiListResponse } from './types'

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
