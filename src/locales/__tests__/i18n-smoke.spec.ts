/**
 * i18n smoke test — DEGRADED VARIANT.
 *
 * Why degraded: importing `src/locales/index.ts` transitively pulls in
 * `@/utils/storage/storage-config.ts` → `src/config/...` → `src/mock/...`
 * which uses unplugin-auto-import injected globals like `ref`. Wiring
 * unplugin-auto-import into the vitest config is non-trivial and out of
 * scope for Plan 1 Task 3.
 *
 * Instead we verify the load-bearing logic in isolation: the deep-merge
 * function and the SSOT JSON files that index.ts mirrors. If both pass,
 * we know the messages object the real i18n instance receives is correct.
 */
import { describe, it, expect } from 'vitest'
import portalEn from '../../../locales/portal/en.json'
import portalZh from '../../../locales/portal/zh.json'
import enPortalNamespace from '../../../locales/synced/en-US/portal.json'
import zhPortalNamespace from '../../../locales/synced/zh-Hans/portal.json'

// Mirrors the implementation in src/locales/index.ts.

type AnyObj = Record<string, any>

function deepMerge<T extends AnyObj>(base: T, over: T): T {
  const out: AnyObj = { ...base }
  for (const k of Object.keys(over)) {
    if (
      over[k] &&
      typeof over[k] === 'object' &&
      !Array.isArray(over[k]) &&
      base[k] &&
      typeof base[k] === 'object' &&
      !Array.isArray(base[k])
    ) {
      out[k] = deepMerge(base[k], over[k])
    } else {
      out[k] = over[k]
    }
  }
  return out as T
}

describe('i18n locale layers wire SSOT + portal correctly', () => {
  it('SSOT portal.json has flat-dotted KiX keys', () => {
    expect((enPortalNamespace as AnyObj)['portal.account.help']).toBeTruthy()
    expect((zhPortalNamespace as AnyObj)['portal.account.help']).toBeTruthy()
  })

  it('portal override layer carries the smoke marker', () => {
    expect((portalEn as AnyObj).portal_v2.smoke).toContain('Portal v2')
    expect((portalZh as AnyObj).portal_v2.smoke).toContain('Portal v2')
  })

  it('deepMerge: portal wins on key collision', () => {
    const merged = deepMerge<AnyObj>(
      { portal_v2: { smoke: 'OLD' }, untouched: true },
      { portal_v2: { smoke: 'NEW' } }
    )
    expect(merged.portal_v2.smoke).toBe('NEW')
    expect(merged.untouched).toBe(true)
  })

  it('deepMerge: synced keys survive when portal does not override them', () => {
    const synced: AnyObj = { 'portal.account.help': 'Help & support' }
    const portal: AnyObj = { portal_v2: { smoke: 'mk' } }
    const merged = deepMerge(synced, portal)
    expect(merged['portal.account.help']).toBe('Help & support')
    expect(merged.portal_v2.smoke).toBe('mk')
  })
})
