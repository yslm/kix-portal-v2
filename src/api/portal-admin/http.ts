/**
 * Stable import path for KiX API calls.
 * Backed by `kixHttp` — a dedicated axios instance that returns raw JSON
 * (no art-design-pro BaseResponse envelope unwrapping). See `src/utils/http/kixHttp.ts`.
 */
export { kixHttp as http } from '@/utils/http/kixHttp'
