import { http } from './http'
import type { BrandGame, ApiListResponse } from './types'

/**
 * art-design-pro's `http.get<T>(config)` takes a single config object and
 * returns the unwrapped payload (T) directly — not an AxiosResponse<T>.
 * See src/utils/http/index.ts:204 (api.get) and :192 (returns res.data.data).
 */
export const listBrandGames = (brand: string) =>
  http.get<ApiListResponse<BrandGame> | BrandGame[]>({
    url: '/api/v1/portal-admin/brand-games',
    params: { brand }
  })
