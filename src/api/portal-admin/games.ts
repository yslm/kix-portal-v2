import { http } from './http'
import type { BrandGame, ApiListResponse } from './types'

export const listBrandGames = (brand: string) =>
  http.get<ApiListResponse<BrandGame> | BrandGame[]>('/api/v1/portal-admin/brand-games', {
    params: { brand }
  })
