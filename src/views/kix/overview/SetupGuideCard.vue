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
  import { computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { fetchSetupGuide } from '@/api/portal-admin/overview'
  import type {
    SetupGuideResponse,
    SetupStep,
    SetupStepKey,
    SetupStepView
  } from '@/api/portal-admin/types'
  import { useNonCriticalCard } from '@/hooks/kix/useNonCriticalCard'

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

  const { data, visible, reload } = useNonCriticalCard<SetupGuideResponse>(
    () => fetchSetupGuide(),
    {
      /** Card only shows when at least one step exists AND the checklist
       * isn't already complete — mirrors the original visibility gate:
       *   `steps.length > 0 && !allDone`
       * where allDone = completeFlag || (total > 0 && done === total). */
      isReady: (d) => {
        const steps = d.steps ?? []
        const total = typeof d.total === 'number' ? d.total : steps.length
        const done = typeof d.done === 'number' ? d.done : steps.filter((s) => s.done).length
        const allDone = !!d.complete || (total > 0 && done === total)
        return steps.length > 0 && !allDone
      }
    }
  )

  onMounted(reload)

  /** Derived from the resolved payload — mirrors the original standalone refs:
   *  steps / doneWire / totalWire / completeFlag */
  const steps = computed<SetupStep[]>(() => data.value?.steps ?? [])
  const doneWire = computed<number | null>(() =>
    typeof data.value?.done === 'number' ? data.value.done : null
  )
  const totalWire = computed<number | null>(() =>
    typeof data.value?.total === 'number' ? data.value.total : null
  )

  /** Prefer the wire's `done` / `total` (server canonical); fall through to
   * a local recount of `steps` so the card stays honest if the backend ever
   * emits a mismatch. */
  const completed = computed(() => doneWire.value ?? steps.value.filter((s) => s.done).length)
  const total = computed(() => totalWire.value ?? steps.value.length)
  const progressPct = computed(() =>
    total.value > 0 ? Math.round((completed.value / total.value) * 100) : 0
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
