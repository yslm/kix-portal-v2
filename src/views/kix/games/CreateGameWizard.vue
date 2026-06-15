<script setup lang="ts">
  /**
   * CreateGameWizard — the Games Smart-Recommend creation flow.
   *
   * Source: kix-platform/landing/portal.html — the 4-step `#view-games`
   * wizard (`kixRecommendGames` ~7708 / `kixSelectGame` ~7989 / order poll
   * ~8107). Rebuilt as an art-design-pro ElDialog with 4 steps:
   *
   *   1. Describe  — free-text business description → POST /games/recommend
   *   2. Pick      — ranked matches (score / reason / difficulty) → POST /games/build
   *   3. Building  — async build; polls GET /games/orders/{id} (smooth bar)
   *   4. Launch    — Play now / Add another + the 3-step launch checklist
   *
   * Fail-soft: a 502/503/504 on /recommend swaps to the fixed starter set
   * (no API). A build timeout shows a Retry. Pure decision logic lives in
   * `wizardModel.ts` (unit-tested); this component owns only the timers,
   * the dialog chrome, and the API calls.
   */
  import { ref, computed, onBeforeUnmount } from 'vue'
  import { useRouter } from 'vue-router'
  import { recommendGames, buildGame, getGameOrder } from '@/api/portal-admin/games'
  import type { GameRecommendation } from '@/api/portal-admin/types'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'
  import {
    STARTER_GAMES,
    isServiceUnavailable,
    errorStatus,
    normalizeRecommendations,
    scorePct,
    difficultyLabel,
    orderPlayHref,
    orderPhase,
    pollDeadlineExceeded,
    nextProgress,
    POLL_INTERVAL_MS,
    PROGRESS_START
  } from './wizardModel'

  const props = defineProps<{ modelValue: boolean }>()
  const emit = defineEmits<{
    'update:modelValue': [boolean]
    built: []
  }>()

  const router = useRouter()

  type Step = 1 | 2 | 3 | 4
  const step = ref<Step>(1)
  const description = ref('')
  const recommendations = ref<GameRecommendation[]>([])
  const selected = ref<GameRecommendation | null>(null)
  const fallbackMode = ref(false)
  const recommending = ref(false)
  const error = ref<string | null>(null)

  // build / poll state
  const progress = ref(PROGRESS_START)
  const buildName = ref('')
  const playHref = ref('')
  const timedOut = ref(false)
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let pollStart = 0

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  const canRecommend = computed(() => description.value.trim().length > 0 && !recommending.value)

  function reset() {
    stopPoll()
    step.value = 1
    description.value = ''
    recommendations.value = []
    selected.value = null
    fallbackMode.value = false
    recommending.value = false
    error.value = null
    progress.value = PROGRESS_START
    buildName.value = ''
    playHref.value = ''
    timedOut.value = false
  }

  function close() {
    visible.value = false
    // defer reset so the dialog close transition doesn't flash step 1
    setTimeout(reset, 200)
  }

  function stopPoll() {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  // --- Step 1 → 2: AI recommend (fail-soft to starters) -------------------
  async function recommend() {
    if (!canRecommend.value) return
    recommending.value = true
    error.value = null
    fallbackMode.value = false
    try {
      const res = await recommendGames({
        business_description: description.value.trim(),
        top_n: 6
      })
      recommendations.value = normalizeRecommendations(res.data)
      if (recommendations.value.length === 0) {
        recommendations.value = STARTER_GAMES
        fallbackMode.value = true
      }
    } catch (e: unknown) {
      if (isServiceUnavailable(errorStatus(e))) {
        recommendations.value = STARTER_GAMES
        fallbackMode.value = true
      } else {
        error.value = e instanceof Error ? e.message : String(e)
        recommending.value = false
        return
      }
    }
    recommending.value = false
    step.value = 2
  }

  function reDescribe() {
    step.value = 1
  }

  // --- Step 2 → 3: build + poll -------------------------------------------
  async function select(game: GameRecommendation) {
    selected.value = game
    buildName.value = game.name || game.slug
    error.value = null
    timedOut.value = false
    progress.value = PROGRESS_START
    step.value = 3
    try {
      const brand = resolveBrandId()
      const res = await buildGame({
        business_description: description.value.trim(),
        game_slug: game.slug,
        brand_id: Number.parseInt(brand, 10) || 0,
        regenerate_assets: true
      })
      const order = res.data
      // R7 sync path: build already finished — jump straight to launch.
      if (orderPhase(order).valueOf() === 'done') {
        finish(orderPlayHref(order))
        return
      }
      startPoll(order.order_id)
    } catch (e: unknown) {
      // 504/502 gateway timeouts are expected on a long build — keep polling
      // off the build response is impossible (no order id), so surface it.
      error.value = e instanceof Error ? e.message : String(e)
      step.value = 2
    }
  }

  function startPoll(orderId: string) {
    pollStart = Date.now()
    const brand = resolveBrandId()
    const tick = async () => {
      if (pollDeadlineExceeded(Date.now() - pollStart)) {
        timedOut.value = true
        stopPoll()
        return
      }
      try {
        const res = await getGameOrder(orderId, brand)
        const phase = orderPhase(res.data)
        if (phase === 'done') {
          finish(orderPlayHref(res.data))
          return
        }
        if (phase === 'failed') {
          error.value = res.data.error || 'Build failed — please try again.'
          stopPoll()
          step.value = 2
          return
        }
        if (phase === 'timeout') {
          timedOut.value = true
          stopPoll()
          return
        }
        progress.value = nextProgress(progress.value)
      } catch {
        // transient poll error — keep trying until the deadline
        progress.value = nextProgress(progress.value)
      }
      pollTimer = setTimeout(tick, POLL_INTERVAL_MS)
    }
    pollTimer = setTimeout(tick, POLL_INTERVAL_MS)
  }

  function finish(href: string) {
    stopPoll()
    progress.value = 100
    playHref.value = href
    step.value = 4
    emit('built')
  }

  function retryBuild() {
    if (selected.value) select(selected.value)
  }

  // --- Step 4: launch -----------------------------------------------------
  function playNow() {
    if (playHref.value) window.open(playHref.value, '_blank')
  }

  function addAnother() {
    reset()
  }

  const CHECKLIST: { label: string; route: string }[] = [
    { label: 'Set the prize winners see', route: '/rewards' },
    { label: 'Load the voucher codes they redeem', route: '/rewards' },
    { label: 'Print the in-store QR poster', route: '/geofences' }
  ]

  function goChecklist(route: string) {
    close()
    router.push(route)
  }

  onBeforeUnmount(stopPoll)
</script>

<template>
  <ElDialog
    v-model="visible"
    :title="'Create a branded game'"
    width="640px"
    :close-on-click-modal="false"
    data-testid="create-game-wizard"
    @closed="reset"
  >
    <!-- Step 1 · Describe -->
    <section v-if="step === 1" data-testid="wizard-step-1" class="space-y-4">
      <p class="text-sm text-gray-500">
        Tell us what you sell and who your customers are — we'll match a gamified campaign from the
        template library and brand it for you.
      </p>
      <ElInput
        v-model="description"
        type="textarea"
        :rows="5"
        :maxlength="2000"
        show-word-limit
        data-testid="wizard-description"
        placeholder="e.g. I run a specialty coffee shop selling pour-overs and French pastries. Customers are 25-35 office workers."
      />
      <p v-if="error" data-testid="wizard-error" class="text-red-600 text-sm">{{ error }}</p>
      <div class="flex justify-end">
        <ElButton
          type="primary"
          :loading="recommending"
          :disabled="!canRecommend"
          data-testid="wizard-recommend"
          @click="recommend"
        >
          {{ recommending ? 'Analyzing templates…' : 'Smart Recommend' }}
        </ElButton>
      </div>
    </section>

    <!-- Step 2 · Pick -->
    <section v-else-if="step === 2" data-testid="wizard-step-2" class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-gray-600">
          {{
            fallbackMode
              ? 'Pick a starter game to get going.'
              : `Matched ${recommendations.length} games to your business.`
          }}
        </p>
        <ElButton link size="small" data-testid="wizard-redescribe" @click="reDescribe">
          ← Re-describe
        </ElButton>
      </div>

      <p v-if="error" data-testid="wizard-error" class="text-red-600 text-sm">{{ error }}</p>

      <div
        v-if="fallbackMode"
        data-testid="wizard-fallback-banner"
        class="text-xs rounded-lg px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200"
      >
        Smart recommend is offline right now — choose one of these proven starters.
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <article
          v-for="g in recommendations"
          :key="g.slug"
          class="art-card p-4 flex flex-col gap-2"
          data-testid="wizard-match"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <h4 class="font-semibold text-gray-900 leading-tight">{{ g.name || g.slug }}</h4>
              <p class="text-xs text-gray-400 font-mono">{{ g.slug }}</p>
            </div>
            <span
              v-if="scorePct(g.score)"
              class="text-xs font-semibold text-theme tabular-nums shrink-0"
              data-testid="wizard-match-score"
            >
              {{ scorePct(g.score) }}
            </span>
          </div>
          <p v-if="g.reason" class="text-xs text-gray-500 line-clamp-2">{{ g.reason }}</p>
          <span v-if="difficultyLabel(g.reskin_difficulty)" class="text-[11px] text-gray-400">
            {{ difficultyLabel(g.reskin_difficulty) }}
          </span>
          <ElButton
            type="primary"
            size="small"
            class="mt-1 self-start"
            :data-testid="`wizard-select-${g.slug}`"
            @click="select(g)"
          >
            Select this
          </ElButton>
        </article>
      </div>
    </section>

    <!-- Step 3 · Building -->
    <section v-else-if="step === 3" data-testid="wizard-step-3" class="space-y-4 py-4">
      <template v-if="!timedOut">
        <h3 class="font-semibold text-gray-900">Building your branded game…</h3>
        <p class="text-sm text-gray-500">
          Brand-fitted assets and game spec for <strong>{{ buildName }}</strong> are generating.
          Hang tight — this takes about a minute.
        </p>
        <ElProgress :percentage="progress" :stroke-width="10" data-testid="wizard-progress" />
      </template>
      <template v-else>
        <h3 class="font-semibold text-gray-900" data-testid="wizard-timeout">Still working…</h3>
        <p class="text-sm text-gray-500">
          The build is taking longer than usual. It may still finish in the background — check My
          Games shortly, or retry now.
        </p>
        <ElButton type="primary" data-testid="wizard-retry" @click="retryBuild"
          >Retry build</ElButton
        >
      </template>
    </section>

    <!-- Step 4 · Launch -->
    <section v-else data-testid="wizard-step-4" class="space-y-5 py-2">
      <div class="flex items-center gap-3">
        <div class="size-10 rounded-full flex-cc bg-green-100 text-green-600 text-xl">✓</div>
        <h3 class="font-semibold text-gray-900 text-lg">Your game is live</h3>
      </div>

      <div class="flex gap-2">
        <ElButton v-if="playHref" type="primary" data-testid="wizard-play" @click="playNow">
          ▶ Play now
        </ElButton>
        <ElButton data-testid="wizard-add-another" @click="addAnother">+ Add another</ElButton>
      </div>

      <div class="art-card p-4">
        <p class="text-sm font-medium text-gray-700 mb-3">Finish setting up — 3 quick steps:</p>
        <ol class="space-y-2">
          <li
            v-for="(item, i) in CHECKLIST"
            :key="i"
            class="flex items-center justify-between gap-3 text-sm"
          >
            <span class="text-gray-600">{{ i + 1 }}. {{ item.label }}</span>
            <ElButton link type="primary" size="small" @click="goChecklist(item.route)">
              Open →
            </ElButton>
          </li>
        </ol>
      </div>
    </section>
  </ElDialog>
</template>
