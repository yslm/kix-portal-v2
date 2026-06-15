<script setup lang="ts">
  /**
   * Storefront view — rebuilt onto art-design-pro components (Week 8n).
   *
   * Source: portal.html #view-storefront (lines 2664-2710), helpers
   * `kixRenderStorefrontUrl()` (~line 5371). Rebuilds the public-page
   * preview + share blocks onto `.art-card`s, and SURFACES the real
   * follower/rating/featured analytics the legacy view typed but never
   * rendered as a card-list KPI strip. Logic in `storefront/storefrontModel.ts`.
   *
   * Endpoint: GET /api/v1/storefront/{brand_id} (unauthenticated public
   * profile; brand via resolveBrandId()). Real fields: display_name / bio /
   * brand_color / logo_url / is_default / follower_count / avg_rating /
   * rating_count / featured_games.
   *
   * DEFERRED (not a restyle): the customization EDITOR (display_name / bio /
   * logo / brand_color / hero / featured games / socials / custom sections
   * POST), the "Play to win" / "View rewards" preview CTAs.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { fetchStorefront } from '@/api/portal-admin/storefront'
  import type { StorefrontProfile } from '@/api/portal-admin/types'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'
  import {
    displayName as nameOf,
    avatarLetter,
    brandColor,
    bio as bioOf,
    isDefault as isDefaultOf,
    publicUrl as urlOf,
    embedSnippet as embedOf,
    storefrontKpis
  } from './storefront/storefrontModel'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const profile = ref<StorefrontProfile | null>(null)
  const brandId = ref<string>(resolveBrandId())

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const displayName = computed(() => nameOf(profile.value, brandId.value))
  const avatar = computed(() => avatarLetter(displayName.value))
  const color = computed(() => brandColor(profile.value))
  const bio = computed(() => bioOf(profile.value))
  const isDefault = computed(() => isDefaultOf(profile.value))
  const publicUrl = computed(() => urlOf(origin, brandId.value))
  const embedSnippet = computed(() => embedOf(origin, brandId.value))

  const kpis = computed(() => storefrontKpis(profile.value))
  const kpiCards = computed(() => [
    {
      icon: 'ri:user-heart-line',
      label: 'Followers',
      value: kpis.value.followers.toLocaleString('en-US')
    },
    { icon: 'ri:star-line', label: 'Avg rating', value: kpis.value.rating },
    {
      icon: 'ri:chat-quote-line',
      label: 'Ratings',
      value: kpis.value.ratingCount.toLocaleString('en-US')
    },
    { icon: 'ri:gamepad-line', label: 'Featured games', value: String(kpis.value.featuredGames) }
  ])

  async function load() {
    loading.value = true
    error.value = null
    brandId.value = resolveBrandId()
    try {
      const res = await fetchStorefront(brandId.value)
      profile.value = res.data && typeof res.data === 'object' ? res.data : null
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/404/.test(msg) || /not.*configured/i.test(msg)) profile.value = null
      else error.value = msg
    } finally {
      loading.value = false
    }
  }

  function openPublicPage(): void {
    if (typeof window !== 'undefined') window.open('/sf/' + brandId.value, '_blank')
  }

  async function copyEmbedSnippet(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(embedSnippet.value)
    } catch {
      // silent — same as the legacy clipboard write
    }
  }

  onMounted(load)
</script>

<template>
  <div class="kix-storefront p-5 space-y-5">
    <header class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold">{{ t('portal.storefront.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('portal.storefront.subtitle') }}</p>
      </div>
      <ElButton data-testid="storefront-open-public" @click="openPublicPage">
        Open public page ↗
      </ElButton>
    </header>

    <div v-if="error" data-testid="storefront-error" class="text-red-600 text-sm py-10 text-center">
      Failed to load storefront: {{ error }}
    </div>

    <template v-else-if="!loading">
      <!-- Analytics KPI strip — real fields the legacy view never rendered -->
      <div data-testid="storefront-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- Preview card -->
        <ElCard shadow="never" data-testid="storefront-preview">
          <div class="flex flex-col items-center text-center gap-3 py-4">
            <div
              class="size-24 rounded-2xl flex-cc text-white text-4xl font-extrabold"
              :style="{ backgroundColor: color }"
              data-testid="storefront-avatar"
            >
              {{ avatar }}
            </div>
            <h2 class="text-lg font-semibold text-gray-900" data-testid="storefront-display-name">
              {{ displayName }}
            </h2>
            <p class="text-sm text-gray-500 max-w-sm" data-testid="storefront-bio">{{ bio }}</p>
            <span
              v-if="isDefault"
              class="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600"
              data-testid="storefront-default-hint"
            >
              Default profile · customize to brand this page
            </span>
            <span v-if="!profile" class="text-xs text-gray-400" data-testid="storefront-empty-hint">
              Storefront not configured yet — share the URL to go live with the default page.
            </span>
          </div>
        </ElCard>

        <!-- Public URL + embed snippet card -->
        <ElCard shadow="never" data-testid="storefront-share">
          <template #header>
            <span class="font-semibold text-gray-900">Share &amp; embed</span>
          </template>
          <div class="space-y-4">
            <div class="space-y-1">
              <div class="text-sm font-medium text-gray-900">Public URL</div>
              <code
                class="block text-xs font-mono p-3 bg-g-100 rounded break-all"
                data-testid="storefront-public-url"
              >
                {{ publicUrl }}
              </code>
            </div>
            <div class="space-y-2">
              <div class="text-sm font-medium text-gray-900">Embed on your website</div>
              <textarea
                readonly
                rows="3"
                class="w-full text-xs font-mono p-3 bg-g-100 rounded resize-none"
                :value="embedSnippet"
                data-testid="storefront-embed-snippet"
              />
              <ElButton size="small" data-testid="storefront-embed-copy" @click="copyEmbedSnippet">
                Copy embed code
              </ElButton>
            </div>
          </div>
        </ElCard>
      </div>
    </template>
  </div>
</template>
