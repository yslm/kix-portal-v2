/**
 * useNonCriticalCard.spec.ts
 *
 * Unit tests for the shared non-critical-card data-loading composable.
 * Tests run the composable inside a minimal Vue component setup via
 * @vue/test-utils `mount` + `defineComponent`, which exercises the Vue
 * reactivity system (ref / computed) in the same environment as the
 * real card components.
 *
 * Coverage:
 *   1. Initial state — loading=true, error=null, data=null, visible=false
 *   2. Resolve with data → loading=false, data set, visible=true
 *   3. isReady predicate: returns false → visible stays false despite data
 *   4. isReady predicate: returns true → visible=true
 *   5. Reject → loading=false, error set (Error.message), visible=false
 *   6. Reject with non-Error → error is String(e)
 *   7. reload() re-runs the cycle (resets loading/error, fetches again)
 *
 * Fetchers are plain vi.fn() mocks — no network, no timers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, onMounted } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useNonCriticalCard } from '../useNonCriticalCard'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mount a tiny host component that calls useNonCriticalCard and exposes its
 *  return value on the component instance so tests can inspect it. */
function mountWithComposable<T>(
  fetcher: () => Promise<{ data: T }>,
  options?: { isReady?: (data: T) => boolean }
) {
  let exposed: ReturnType<typeof useNonCriticalCard<T>>

  const Host = defineComponent({
    setup() {
      const result = useNonCriticalCard(fetcher, options)
      exposed = result
      onMounted(result.reload)
      return result
    },
    template: '<div />'
  })

  const wrapper = mount(Host)
  // exposed is assigned synchronously inside setup() before mount returns
  return { wrapper, getResult: () => exposed }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('useNonCriticalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts in loading=true, error=null, data=null, visible=false', () => {
    // Fetcher never resolves during this test
    const fetcher = vi.fn(() => new Promise<{ data: string }>(() => {}))

    const { getResult } = mountWithComposable(fetcher)
    const { loading, error, data, visible } = getResult()

    expect(loading.value).toBe(true)
    expect(error.value).toBe(null)
    expect(data.value).toBe(null)
    expect(visible.value).toBe(false)
  })

  it('sets data and visible=true when the fetcher resolves', async () => {
    const payload = { id: 1, name: 'test' }
    const fetcher = vi.fn().mockResolvedValueOnce({ data: payload })

    const { getResult } = mountWithComposable(fetcher)
    await flushPromises()

    const { loading, error, data, visible } = getResult()

    expect(loading.value).toBe(false)
    expect(error.value).toBe(null)
    expect(data.value).toEqual(payload)
    expect(visible.value).toBe(true)
  })

  it('keeps visible=false when isReady returns false for the resolved data', async () => {
    type ItemPayload = { items: number[] }
    const payload: ItemPayload = { items: [] }
    const fetcher = vi
      .fn<() => Promise<{ data: ItemPayload }>>()
      .mockResolvedValueOnce({ data: payload })

    const { getResult } = mountWithComposable<ItemPayload>(fetcher, {
      isReady: (d) => d.items.length > 0
    })
    await flushPromises()

    const { loading, error, data, visible } = getResult()

    expect(loading.value).toBe(false)
    expect(error.value).toBe(null)
    expect(data.value).toEqual(payload)
    // isReady returned false → card must stay hidden
    expect(visible.value).toBe(false)
  })

  it('makes visible=true when isReady returns true for the resolved data', async () => {
    type ItemPayload = { items: number[] }
    const payload: ItemPayload = { items: [1, 2] }
    const fetcher = vi
      .fn<() => Promise<{ data: ItemPayload }>>()
      .mockResolvedValueOnce({ data: payload })

    const { getResult } = mountWithComposable<ItemPayload>(fetcher, {
      isReady: (d) => d.items.length > 0
    })
    await flushPromises()

    const { visible } = getResult()
    expect(visible.value).toBe(true)
  })

  it('sets error and keeps visible=false when the fetcher rejects with an Error', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('network failure'))

    const { getResult } = mountWithComposable(fetcher)
    await flushPromises()

    const { loading, error, data, visible } = getResult()

    expect(loading.value).toBe(false)
    expect(error.value).toBe('network failure')
    expect(data.value).toBe(null)
    expect(visible.value).toBe(false)
  })

  it('coerces non-Error rejection to a string', async () => {
    // Rejecting with a plain string (not an Error instance)
    const fetcher = vi.fn().mockRejectedValueOnce('timeout')

    const { getResult } = mountWithComposable(fetcher)
    await flushPromises()

    const { error, visible } = getResult()

    expect(error.value).toBe('timeout')
    expect(visible.value).toBe(false)
  })

  it('reload() re-runs the fetch cycle, resetting loading/error and updating data', async () => {
    const firstPayload = { count: 1 }
    const secondPayload = { count: 2 }
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ data: firstPayload })
      .mockResolvedValueOnce({ data: secondPayload })

    const { getResult } = mountWithComposable(fetcher)
    await flushPromises()

    expect(getResult().data.value).toEqual(firstPayload)

    // Trigger a second fetch via reload()
    getResult().reload()

    // While in flight, loading should be true again
    expect(getResult().loading.value).toBe(true)

    await flushPromises()

    expect(getResult().loading.value).toBe(false)
    expect(getResult().data.value).toEqual(secondPayload)
    expect(getResult().visible.value).toBe(true)
  })

  it('reload() after an error can recover: sets data, clears error, visible=true', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('first fail'))
      .mockResolvedValueOnce({ data: { ok: true } })

    const { getResult } = mountWithComposable(fetcher)
    await flushPromises()

    // After first (failed) fetch
    expect(getResult().error.value).toBe('first fail')
    expect(getResult().visible.value).toBe(false)

    // Reload — second fetch succeeds
    getResult().reload()
    await flushPromises()

    expect(getResult().error.value).toBe(null)
    expect(getResult().data.value).toEqual({ ok: true })
    expect(getResult().visible.value).toBe(true)
  })
})
