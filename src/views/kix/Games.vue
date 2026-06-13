<script setup lang="ts">
  /**
   * Games view — rebuilt onto art-design-pro components (Week 8).
   *
   * Source: `kix-platform/landing/portal.html` (#view-games, lines
   * 1195-1304; fetcher `kixLoadMyGames()` ~line 7467).
   *
   * Rebuilds the "My Games" gallery as polished `.art-card` game cards
   * (cover image with a deterministic gradient+emoji fallback, name, slug,
   * status badge, Play / Customize actions) plus a KPI summary strip
   * (card-list anatomy, same as Campaigns / Overview MetricCards) and an
   * empty-state hero.
   *
   * Endpoint: GET /api/v1/portal-admin/brand-games?brand=<id> (real;
   * portal_admin.py ~line 4482). Field reconciliation + KPIs + cover
   * palette live in `games/gamesModel.ts`. Play opens the real play
   * target (play_url > game_file > unpacked_url); Customize is gated on a
   * real `order_id`.
   *
   * DEFERRED (next increment): the 4-step Smart-Recommend creation wizard
   * (describe → AI recommend → async build → launch checklist) and the
   * embedded gamification IDE "Customize" modal. The "+ Create game" CTA
   * and the Customize button route to the Builder for now.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { listBrandGames } from '@/api/portal-admin/games'
  import type { BrandGame } from '@/api/portal-admin/types'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'
  import StatusBadge from '@/components/StatusBadge.vue'
  import {
    normalizeGames,
    gameKpis,
    displayName,
    isPlayable,
    playHref,
    coverFallback
  } from './games/gamesModel'

  const { t } = useI18n()
  const router = useRouter()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const games = ref<BrandGame[]>([])

  const kpis = computed(() => gameKpis(games.value))
  const kpiCards = computed(() => [
    { icon: 'ri:gamepad-line', label: 'Total games', value: kpis.value.total },
    { icon: 'ri:play-circle-line', label: 'Active', value: kpis.value.active },
    { icon: 'ri:rocket-2-line', label: 'Playable', value: kpis.value.playable },
    { icon: 'ri:palette-line', label: 'Customizable', value: kpis.value.customizable }
  ])

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listBrandGames(resolveBrandId())
      games.value = normalizeGames(res.data)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function play(g: BrandGame) {
    const href = playHref(g)
    if (href) window.open(href, '_blank')
  }

  function customize() {
    // IDE modal deferred — route to the build surface for now.
    router.push('/builder')
  }

  function createGame() {
    router.push('/builder')
  }

  onMounted(load)
</script>

<template>
  <div class="kix-games p-5 space-y-5">
    <!-- Page header + primary CTA -->
    <header class="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold">{{ t('portal.games.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('portal.games.subtitle') }}</p>
      </div>
      <ElButton type="primary" data-testid="create-game" @click="createGame">
        + Create game
      </ElButton>
    </header>

    <!-- KPI summary strip — canonical art-design-pro card-list anatomy -->
    <div data-testid="game-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <article
        v-for="(card, i) in kpiCards"
        :key="i"
        class="art-card relative flex flex-col justify-center h-28 px-5"
      >
        <span class="text-g-700 text-sm">{{ card.label }}</span>
        <span class="text-[26px] font-medium mt-2 tabular-nums leading-tight">{{
          card.value
        }}</span>
        <div
          class="absolute top-0 bottom-0 right-5 m-auto size-12.5 rounded-xl flex-cc bg-theme/10"
        >
          <ArtSvgIcon :icon="card.icon" class="text-xl text-theme" />
        </div>
      </article>
    </div>

    <!-- States -->
    <div v-if="loading" class="text-gray-400 text-sm py-10 text-center">Loading games…</div>

    <div v-else-if="error" data-testid="games-error" class="text-red-600 text-sm py-10 text-center">
      Failed to load games: {{ error }}
    </div>

    <!-- Empty-state hero -->
    <div
      v-else-if="games.length === 0"
      data-testid="games-empty-hero"
      class="art-card flex flex-col items-center justify-center text-center py-16 px-6"
    >
      <div class="size-16 rounded-2xl flex-cc bg-theme/10 mb-4">
        <ArtSvgIcon icon="ri:gamepad-line" class="text-3xl text-theme" />
      </div>
      <h2 class="text-xl font-semibold">Create your first game</h2>
      <p class="text-sm text-gray-500 mt-2 max-w-md">
        Tell us what you sell and we'll match a gamified campaign from the template library, branded
        for you — describe, pick, go live.
      </p>
      <ElButton type="primary" class="mt-5" data-testid="create-game-empty" @click="createGame">
        + Create game
      </ElButton>
    </div>

    <!-- Card gallery -->
    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      data-testid="games-grid"
    >
      <article
        v-for="g in games"
        :key="g.id"
        class="art-card overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
        data-testid="game-card"
      >
        <!-- Cover: real image, else deterministic gradient + emoji -->
        <div class="relative h-32 flex-cc">
          <img
            v-if="g.cover_url"
            :src="g.cover_url"
            :alt="displayName(g)"
            class="absolute inset-0 size-full object-cover"
          />
          <div
            v-else
            class="absolute inset-0 flex-cc text-4xl"
            :style="{ background: coverFallback(g).gradient }"
          >
            {{ coverFallback(g).emoji }}
          </div>
          <StatusBadge v-if="g.status" :status="g.status" class="absolute top-2 right-2" />
        </div>

        <!-- Body -->
        <div class="p-4 flex flex-col gap-1 flex-1">
          <h3 class="font-semibold text-gray-900 leading-tight">{{ displayName(g) }}</h3>
          <p v-if="g.game_slug" class="text-xs text-gray-400 font-mono">{{ g.game_slug }}</p>

          <!-- Actions -->
          <div class="flex items-center gap-2 mt-3">
            <ElButton
              v-if="isPlayable(g)"
              size="small"
              type="primary"
              :data-testid="`play-${g.id}`"
              @click="play(g)"
            >
              ▶ Play
            </ElButton>
            <ElButton
              v-if="g.order_id"
              size="small"
              :data-testid="`customize-${g.id}`"
              @click="customize"
            >
              Customize
            </ElButton>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
