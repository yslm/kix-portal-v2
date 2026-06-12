/**
 * useNonCriticalCard — shared data-loading composable for non-critical
 * Overview cards (SetupGuideCard, NbaCard, StatusStrip).
 *
 * All three cards share an identical loading/error/data lifecycle:
 *   - `loading` starts true; cleared in the `finally` block
 *   - `error` captures the message on rejection; null otherwise
 *   - `data` is null until the fetch resolves
 *   - `visible` is false while loading or errored, and (optionally)
 *     while an `isReady` predicate returns false on the resolved data
 *   - `reload()` re-runs the same cycle (same semantics as the initial
 *     `onMounted(load)` each card sets up)
 *
 * The composable does NOT call `onMounted` — callers wire that themselves
 * (or let the migrated cards continue to call `onMounted(reload)`), which
 * keeps the mount lifecycle under the component's control.
 *
 * ### Usage
 * ```ts
 * const { loading, error, data, visible, reload } = useNonCriticalCard(
 *   () => fetchOverview(),           // fetcher: () => Promise<{ data: T }>
 *   { isReady: (d) => d !== null }   // optional extra gate
 * )
 * onMounted(reload)
 * ```
 *
 * @param fetcher  A zero-arg async function whose resolved value has a
 *                 `data` property carrying the payload (matches the shape
 *                 returned by kixHttp / http.get throughout this codebase).
 * @param options  Optional configuration object.
 * @param options.isReady  Extra visibility predicate called ONLY when data
 *                         is non-null and the fetch succeeded.  Defaults
 *                         to `() => true` (any non-null data is enough).
 */

import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

export interface UseNonCriticalCardOptions<T> {
  /** Extra predicate beyond "data loaded without error". */
  isReady?: (data: T) => boolean
}

export function useNonCriticalCard<T>(
  fetcher: () => Promise<{ data: T }>,
  options?: UseNonCriticalCardOptions<T>
): {
  loading: Ref<boolean>
  error: Ref<string | null>
  data: Ref<T | null>
  visible: ComputedRef<boolean>
  reload: () => Promise<void>
} {
  const loading = ref(true)
  const error = ref<string | null>(null)
  // Cast needed: Vue's ref generic overloads widen T|null in a way that
  // doesn't satisfy Ref<T|null> without an explicit assertion.
  const data = ref<T | null>(null) as Ref<T | null>

  const isReady = options?.isReady

  /** `visible` is the single truth-gate shared across all non-critical cards:
   *  show only when not loading, not errored, data is present, and any
   *  caller-supplied `isReady` predicate approves. */
  const visible = computed<boolean>(
    () =>
      !loading.value &&
      !error.value &&
      data.value !== null &&
      (isReady ? isReady(data.value as T) : true)
  )

  async function reload(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const res = await fetcher()
      data.value = res.data ?? null
    } catch (e: unknown) {
      // Non-critical card — swallow the error and render nothing, matching
      // the legacy `catch (_) { card.style.display = 'none' }` pattern.
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  return { loading, error, data, visible, reload }
}
