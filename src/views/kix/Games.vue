<script setup lang="ts">
  /**
   * Games view — fourth real P0 view migrated from
   * `kix-platform/landing/portal.html` (#view-games, lines 1195–1304;
   * fetcher `kixLoadMyGames()` ~line 7434).
   *
   * Plan 3 Task 4 ports the "My Games" gallery ONLY — the merchant's
   * existing games as cards, with an empty-state hero when the brand has
   * none. The legacy section also hosts:
   *  - the 4-step Smart-Recommend creation wizard (step 1 textarea,
   *    step 2 recommendations, step 3 launch progress, step 4 done)
   *  - per-card "▶ Play" + "Customize" actions (open external play URL
   *    and the gamification IDE modal respectively)
   *  - the slug-based SVG cover fallback + Nano Banana cover hydration
   *  - the recommendation fallback flow (sample_brander down, etc.)
   *
   * All of the above is DEFERRED so this first cut stays a thin,
   * honest read-only mirror of the GET endpoint. Same template as
   * Campaigns (Plan 3 T3) / Settings (Plan 3 T2) / Overview (Plan 3 T0).
   *
   * State machine: loading → (data | empty | error). No optimistic
   * placeholders, no fake cards. The "create your first game" hero is
   * the empty-state branch.
   *
   * Endpoint: GET /api/v1/portal-admin/brand-games?brand=<brand_id>.
   * Brand id resolved via the shared `resolveBrandId()` helper. The
   * legacy renderer reads `(data && data.games) || []` — we accept the
   * same wrapper plus bare arrays / `{ items }` for defensive parity.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listBrandGames } from '@/api/portal-admin/games'
  import type { BrandGame } from '@/api/portal-admin/types'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'
  import StatusBadge from '@/components/StatusBadge.vue'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const games = ref<BrandGame[]>([])

  const pageTitle = computed(() => t('portal.games.title'))
  const pageSubtitle = computed(() => t('portal.games.subtitle'))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listBrandGames(resolveBrandId())
      const data = res.data
      if (Array.isArray(data)) {
        games.value = data
      } else if (data && typeof data === 'object') {
        const d = data as { games?: BrandGame[]; items?: BrandGame[] }
        games.value = d.games ?? d.items ?? []
      } else {
        games.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Mirrors the legacy renderer's name fallback chain (portal.html line
   * 7481): name → brand_game_name → game_name → game_slug → 'Untitled'.
   */
  function displayName(g: BrandGame): string {
    return g.name || g.brand_game_name || g.game_name || g.game_slug || 'Untitled'
  }

  /**
   * Mirrors the legacy renderer's slug column (small grey text under the
   * card title). May be empty for older payloads.
   */
  function displaySlug(g: BrandGame): string {
    return g.game_slug ?? ''
  }

  onMounted(load)
</script>

<template>
  <div class="kix-games p-8 space-y-6">
    <!-- Page header -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- My Games gallery -->
    <section v-if="loading" class="text-gray-400 text-sm py-6 text-center">
      Loading games…
    </section>

    <section v-else-if="error" class="text-red-600 text-sm py-6 text-center">
      Failed to load: {{ error }}
    </section>

    <!-- Empty-state hero — placeholder for the Smart-Recommend wizard. -->
    <section
      v-else-if="games.length === 0"
      class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
      data-testid="games-empty-hero"
    >
      No games yet. Create your first one to get started.
    </section>

    <section
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      data-testid="games-grid"
    >
      <article
        v-for="g in games"
        :key="g.id"
        class="bg-white border border-gray-200 rounded-lg p-4 space-y-2"
        data-testid="game-card"
      >
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-gray-900">{{ displayName(g) }}</h3>
          <StatusBadge v-if="g.status" :status="g.status" />
        </div>
        <p v-if="displaySlug(g)" class="text-xs text-gray-400 font-mono">{{ displaySlug(g) }}</p>
      </article>
    </section>
  </div>
</template>
