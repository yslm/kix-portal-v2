/**
 * fetchLiveMonitor() composition test — Reports · Live monitoring.
 *
 * `fetchLiveMonitor` fans out two independent GETs and folds them into a
 * single honest LiveMonitor reading:
 *   GET /monitoring/live  → { plays_today, plays_per_min }
 *   GET /ops/today        → { redemptions, plays, new_customers }
 *
 * Each leg is independently tolerated (same `.catch(() => null)` pattern
 * as the owner-report aggregator): if one endpoint 401s/503s, its fields
 * come back `null` and the view renders an em-dash — never a fabricated
 * number. Mirrors the legacy `kixLoadMonitoring()` partial tolerance.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
vi.mock('../http', () => ({ http: { get: (...args: unknown[]) => get(...args) } }))

import { fetchLiveMonitor } from '../reports'

beforeEach(() => {
  get.mockReset()
})

/** Route the mocked http.get by URL so each leg resolves independently. */
function routeGet(map: Record<string, unknown | Error>) {
  get.mockImplementation((url: string) => {
    const hit = Object.keys(map).find((k) => url.includes(k))
    if (hit === undefined) return Promise.reject(new Error(`unmocked ${url}`))
    const v = map[hit]
    return v instanceof Error ? Promise.reject(v) : Promise.resolve({ data: v })
  })
}

describe('fetchLiveMonitor', () => {
  it('folds both endpoints into the four live metrics', async () => {
    routeGet({
      '/monitoring/live': { plays_today: 318, plays_per_min: 2.4 },
      '/ops/today': { redemptions: 24, plays: 318, new_customers: 12 }
    })

    const { data } = await fetchLiveMonitor()

    expect(data.plays_per_min).toBe(2.4)
    expect(data.plays_today).toBe(318)
    expect(data.redemptions_today).toBe(24)
    expect(data.new_customers_today).toBe(12)
  })

  it('tolerates a failed /ops/today leg — its fields are null, live fields survive', async () => {
    routeGet({
      '/monitoring/live': { plays_today: 318, plays_per_min: 2.4 },
      '/ops/today': new Error('503')
    })

    const { data } = await fetchLiveMonitor()

    expect(data.plays_per_min).toBe(2.4)
    expect(data.plays_today).toBe(318)
    expect(data.redemptions_today).toBeNull()
    expect(data.new_customers_today).toBeNull()
  })

  it('falls back to /ops/today plays for plays_today when /monitoring/live fails', async () => {
    routeGet({
      '/monitoring/live': new Error('401'),
      '/ops/today': { redemptions: 9, plays: 140, new_customers: 6 }
    })

    const { data } = await fetchLiveMonitor()

    expect(data.plays_per_min).toBeNull()
    expect(data.plays_today).toBe(140)
    expect(data.redemptions_today).toBe(9)
    expect(data.new_customers_today).toBe(6)
  })

  it('returns all-null when both legs fail', async () => {
    routeGet({
      '/monitoring/live': new Error('401'),
      '/ops/today': new Error('401')
    })

    const { data } = await fetchLiveMonitor()

    expect(data.plays_per_min).toBeNull()
    expect(data.plays_today).toBeNull()
    expect(data.redemptions_today).toBeNull()
    expect(data.new_customers_today).toBeNull()
  })
})
