<script setup lang="ts">
  /**
   * Overview · Setup guide card.
   *
   * Shopify-style persistent onboarding checklist for the shop. Ports the
   * legacy `#setup-guide-card` rendering (kix-platform/landing/portal.html
   * line 1324 + the `kixLoadSetupGuide()` fetcher at line 4199) onto
   * art-design-pro's Element Plus card / progress / button surfaces.
   *
   * Wire endpoint: GET /api/v1/portal-admin/setup-guide (see
   * src/api/portal-admin/overview.ts · `fetchSetupGuide`). Each step is
   * judged from REAL server-side Redis signals, so the checklist survives a
   * browser refresh or device switch — the legacy comment at portal_admin.py
   * line 3623-3637 calls this out explicitly.
   *
   * State machine (intentionally minimal, mirroring the legacy "additive"
   * behaviour at portal.html line 4204-4222):
   *   - loading              → render nothing (avoid layout flicker)
   *   - error                → render nothing (the card is non-critical)
   *   - data + all done      → render nothing (Shopify-style fade-out)
   *   - data + some not done → render the card
   *
   * Deferred from this first cut (legacy still owns these surfaces; see the
   * SetupStep / KIX_SETUP_STEPS comments at portal.html line 4150-4157):
   *   - Per-step inline SVG icons — v2 uses a single check / circle glyph
   *   - i18n keys (legacy uses `portal.setup.step.<key>`)
   *   - Per-step `count` subtext
   */
  import { computed, onMounted, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { fetchSetupGuide } from '@/api/portal-admin/overview'
  import type { SetupStep, SetupStepKey, SetupStepView } from '@/api/portal-admin/types'

  /**
   * English labels for the six canonical step keys. Pulled verbatim from
   * the legacy `KIX_SETUP_STEPS[<key>].en` entries (portal.html line
   * 4151-4156) so the merchant-facing copy is byte-identical. Wired as a
   * record (not a Map) so unknown keys fall through cleanly to a title-cased
   * fallback in `labelFor()`.
   */
  const STEP_LABELS: Record<string, string> = {
    build_game: 'Create your first game',
    set_prize: 'Set the prize (voucher codes auto-generate)',
    add_store_qr: 'Add your store & print the QR poster',
    first_player: 'First customer plays',
    first_win: 'First winner',
    first_redemption: 'First redemption at your counter'
  }

  /**
   * Map the backend's legacy view-id strings (emitted in `step.view`) to
   * the v2 router paths. Legacy values are `'games' | 'prizes' |
   * 'geofences' | 'overview' | 'vouchers'` (portal_admin.py line 3666-3678).
   * Unknown values fall through to `/overview` as a safe default — the
   * CTA still navigates, just to the home dashboard rather than 404.
   */
  const VIEW_TO_ROUTE: Record<string, string> = {
    games: '/games',
    prizes: '/prizes',
    geofences: '/geofences',
    overview: '/overview',
    vouchers: '/vouchers'
  }

  const router = useRouter()
  const loading = ref(true)
  const error = ref<string | null>(null)
  const steps = ref<SetupStep[]>([])
  const completeFlag = ref(false)
  const totalWire = ref<number | null>(null)
  const doneWire = ref<number | null>(null)

  /** Prefer the wire's `done` / `total` (server canonical); fall through to
   * a local recount of `steps` so the card stays honest if the backend ever
   * emits a mismatch. */
  const completed = computed(() => doneWire.value ?? steps.value.filter((s) => s.done).length)
  const total = computed(() => totalWire.value ?? steps.value.length)
  const progressPct = computed(() =>
    total.value > 0 ? Math.round((completed.value / total.value) * 100) : 0
  )
  const allDone = computed(
    () => completeFlag.value || (total.value > 0 && completed.value === total.value)
  )

  /** Mirror the legacy `KIX_SETUP_STEPS[s.key] || {en: s.key}` fallback so an
   * unknown key (added server-side ahead of the client) still renders a
   * human-readable row instead of an empty cell. */
  function labelFor(key: SetupStepKey): string {
    return STEP_LABELS[key] ?? key
  }

  function routeFor(view?: SetupStepView): string | null {
    if (!view) return null
    return VIEW_TO_ROUTE[view] ?? null
  }

  function handleCta(step: SetupStep) {
    const route = routeFor(step.view)
    if (route) router.push(route)
  }

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchSetupGuide()
      const payload = res.data
      steps.value = payload?.steps ?? []
      doneWire.value = typeof payload?.done === 'number' ? payload.done : null
      totalWire.value = typeof payload?.total === 'number' ? payload.total : null
      completeFlag.value = !!payload?.complete
    } catch (e: unknown) {
      // Non-critical card — swallow the error and render nothing, matching
      // the legacy `catch (_) { /* additive */ }` at portal.html line 4222.
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  /** Single truth-gate for visibility: the card only shows when we have
   * fetched data, the fetch didn't error, at least one step exists, and the
   * checklist isn't already complete. */
  const visible = computed(
    () => !loading.value && !error.value && steps.value.length > 0 && !allDone.value
  )
</script>

<template>
  <el-card v-if="visible" data-testid="setup-guide-card" shadow="never">
    <template #header>
      <div class="flex items-center justify-between">
        <span class="font-semibold text-sm">
          Set up your shop — {{ total }} steps to your first redemption
        </span>
        <span class="text-xs text-gray-500" data-testid="setup-guide-progress">
          {{ completed }} / {{ total }}
        </span>
      </div>
      <el-progress
        :percentage="progressPct"
        :show-text="false"
        class="mt-3"
        data-testid="setup-guide-bar"
      />
    </template>

    <ul class="flex flex-col gap-2">
      <li
        v-for="step in steps"
        :key="step.key"
        class="flex items-center gap-3 py-1"
        :data-testid="`setup-step-${step.key}`"
      >
        <span
          class="w-5 text-base leading-none flex-shrink-0"
          :class="step.done ? 'text-green-600' : 'text-gray-300'"
          aria-hidden="true"
        >
          {{ step.done ? '✓' : '○' }}
        </span>
        <span
          class="flex-1 text-sm"
          :class="step.done ? 'text-gray-400 line-through' : 'text-gray-800 font-medium'"
        >
          {{ labelFor(step.key) }}
        </span>
        <el-button
          v-if="!step.done && routeFor(step.view)"
          size="small"
          type="primary"
          link
          @click="handleCta(step)"
        >
          Continue →
        </el-button>
      </li>
    </ul>
  </el-card>
</template>
