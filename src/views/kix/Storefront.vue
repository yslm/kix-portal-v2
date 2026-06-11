<script setup lang="ts">
  /**
   * Storefront view — Plan 5 Task 4.
   *
   * Source: `kix-platform/landing/portal.html`, `<section
   * id="view-storefront">` (lines 2664-2710) + the helpers
   * `kixStorefrontBrand()` / `kixRenderStorefrontUrl()` /
   * `kixCopyEmbedSnippet()` at line 5368-5388. The legacy section
   * bundles in one place:
   *
   *   - Page header + subtitle ("The public-facing brand page customers
   *     land on after scanning your in-store QR.") at portal.html line
   *     2666-2667
   *   - "Open public page ↗" CTA in the head — opens `/sf/{bid}` in a
   *     new tab (the storefront router 302-redirects to
   *     `/landing/storefront.html?b=<bid>`).
   *   - Preview card (line 2671-2682) — 96×96 brand-color avatar tile +
   *     display name + tagline + two CTAs ("Play to win" / "View
   *     rewards"). The legacy inline IIFE at line 2682-2693 hydrates
   *     the avatar letter + display name from `localStorage.kix_brand_name`
   *     as a CLIENT-SIDE defensive fill — but the real source of truth
   *     is the public storefront profile at
   *       GET /api/v1/storefront/{brand_id}
   *     which returns the configured `display_name`, `logo_url`,
   *     `brand_color`, `bio`, follower_count, avg_rating + rating_count
   *     (see `get_storefront` at app/routers/storefront.py line 462-484).
   *   - Public URL card (line 2700-2707) — full `window.location.origin
   *     + '/sf/' + bid` rendered in a `<code>` block the merchant
   *     copies into their QR code / website nav.
   *   - Embed snippet card (line 2706-2710) — a `<textarea>` with an
   *     `<iframe>` snippet pointing at `/landing/play.html?brand=<bid>
   *     &embed=1&channel=website`, plus a "Copy embed code" CTA.
   *
   * Plan 5 T4 ports: page header + "Open public page ↗" CTA + preview
   * card driven by the REAL storefront profile (logo / initial letter
   * fallback + brand_color tile + display_name + bio) + Public URL
   * block + Embed snippet block (read-only textarea + Copy CTA).
   * DEFERRED (legacy still owns these surfaces):
   *   - Customization EDITOR — POST /api/v1/storefront/{bid}/configure
   *     form for display_name / bio / logo_url / brand_color / hero
   *     image / featured games / vouchers / socials / custom_sections.
   *     The endpoint exists (storefront.py line 258-309) but requires
   *     file upload + multi-section editor that exceeds the four-state
   *     read pattern this slice ports.
   *   - Follower / rating analytics strip — the fields ARE on the
   *     wire (typed in `StorefrontProfile`), but rendering them as a
   *     stats grid is folded into the deferred customization editor
   *     since they're "configure + react" data, not "page works" data.
   *   - "Play to win" / "View rewards" preview CTAs — marketing
   *     decoration that target the public page; can be folded back in
   *     once a real iframe-hosted preview lands.
   *   - The legacy localStorage avatar/name hydration IIFE
   *     (portal.html line 2682-2693) — superseded by the real GET
   *     /storefront/{bid} fetch in v2.
   *
   * Same template as Plan 3/4/5 T1/T2/T3: port a thin honest slice of
   * a real endpoint, defer the rest behind a clear comment. Visually
   * this is two stacked cards (preview · URL+embed) rather than the
   * table/grid layout of the earlier ports.
   *
   * State machine: loading → (data | empty | error). The "empty"
   * branch covers the 404 path — when the brand has no
   * `config:{bid}` AND no `brand:{bid}:games` set (truly unknown
   * brand). This is unreachable for any signed-in merchant in
   * practice (signup always seeds the config blob), but we surface a
   * defensive flat fallback that still renders the URL + embed
   * snippet keyed on the brand id alone. That way a misconfigured
   * brand still gets a copy-able URL.
   *
   * Endpoint: GET /api/v1/storefront/{brand_id}. Brand resolved via
   * `resolveBrandId()` (NOT JWT-inferred — same as Settings.vue,
   * Games.vue, Overview.vue) because the storefront router is
   * unauthenticated by design (world-readable public page).
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { fetchStorefront } from '@/api/portal-admin/storefront'
  import type { StorefrontProfile } from '@/api/portal-admin/types'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const profile = ref<StorefrontProfile | null>(null)

  // The active brand id — captured once at load() so the URL/embed
  // blocks render consistently even if `resolveBrandId()` would
  // return a different value on a later tick (e.g. brand switcher
  // mid-render). Initialised eagerly so the "no fetch yet" loading
  // skeleton can still show the URL card.
  const brandId = ref<string>(resolveBrandId())

  const pageTitle = computed(() => t('portal.storefront.title'))
  const pageSubtitle = computed(() => t('portal.storefront.subtitle'))

  /**
   * Display name fallback — mirrors the legacy IIFE chain at
   * portal.html line 2685-2688: profile.display_name → brandId →
   * "Your storefront". The hard-coded "Toast Box" / "T" leak the
   * Trinity-fix comment at line 2670-2674 calls out is solved here
   * by reading the server-authoritative display_name FIRST.
   */
  const displayName = computed<string>(() => {
    return profile.value?.display_name || brandId.value || 'Your storefront'
  })

  /**
   * Avatar initial — first letter of the resolved display_name,
   * uppercased. Matches the legacy `(name.trim()[0] || 'T').toUpperCase()`
   * at portal.html line 2690.
   */
  const avatarLetter = computed<string>(() => {
    const name = displayName.value.trim()
    return (name[0] || 'T').toUpperCase()
  })

  /**
   * Brand colour — backs the avatar tile. Legacy uses `var(--brand)`
   * (the portal's CSS variable, set to #00FC00 by default). We mirror
   * that default (matching the server's default at
   * storefront.py line 84: `brand_color: str = Field(default="#00FC00")`).
   */
  const brandColor = computed<string>(() => {
    return profile.value?.brand_color || '#00FC00'
  })

  /**
   * Bio / tagline copy — server-configured. Falls back to the legacy
   * static string "Earn rewards every time you visit · 每次到店都有奖"
   * (portal.html line 2680) when the brand hasn't filled in a bio
   * yet — keeps the preview card from looking empty.
   */
  const bio = computed<string>(() => {
    return profile.value?.bio?.trim() || 'Earn rewards every time you visit · 每次到店都有奖'
  })

  /**
   * Public absolute URL — mirrors `kixRenderStorefrontUrl()` at
   * portal.html line 5371-5374: `window.location.origin + '/sf/' +
   * brandId`. The `/sf/` short URL 302-redirects to the longer
   * `/landing/storefront.html?b=<bid>` path (app/main.py line
   * 2040-2042). We use `/sf/` so the merchant gets the short
   * shareable URL, not the implementation detail.
   */
  const publicUrl = computed<string>(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return origin + '/sf/' + brandId.value
  })

  /**
   * Embed snippet — mirrors `kixRenderStorefrontUrl()` at portal.html
   * line 5376-5382. An `<iframe>` pointing at the play page with
   * `embed=1&channel=website` query params (the server reads these
   * and turns off the standalone chrome, attributing the channel to
   * "website" in analytics).
   */
  const embedSnippet = computed<string>(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return (
      '<iframe src="' +
      origin +
      '/landing/play.html?brand=' +
      encodeURIComponent(brandId.value) +
      '&embed=1&channel=website" style="width:100%;height:640px;border:0;border-radius:12px" title="Play & win"></iframe>'
    )
  })

  /**
   * `true` when the loaded profile is the server-synthesised default
   * (no merchant config has run yet). Surfaces a small muted hint so
   * the merchant knows the page IS live but is generic until they
   * customise it. Matches the `is_default` flag set by
   * `_synthesize_profile()` at storefront.py line 215.
   */
  const isDefault = computed<boolean>(() => Boolean(profile.value?.is_default))

  async function load() {
    loading.value = true
    error.value = null
    // Re-resolve in case the brand switcher has changed between
    // mounts. Defensive only — most pages live for one resolution.
    brandId.value = resolveBrandId()

    try {
      const res = await fetchStorefront(brandId.value)
      const data = res.data
      if (data && typeof data === 'object') {
        profile.value = data
      } else {
        profile.value = null
      }
    } catch (e: unknown) {
      // 404 here means the brand has no config AND no games — the
      // "genuinely unknown brand" path at storefront.py line 195.
      // Unreachable in practice for a signed-in merchant but we
      // surface it as `profile = null` so the view still renders the
      // URL + embed blocks (keyed on brandId alone).
      const msg = e instanceof Error ? e.message : String(e)
      if (/404/.test(msg) || /not.*configured/i.test(msg)) {
        profile.value = null
      } else {
        error.value = msg
      }
    } finally {
      loading.value = false
    }
  }

  function openPublicPage(): void {
    if (typeof window !== 'undefined') {
      window.open('/sf/' + brandId.value, '_blank')
    }
  }

  async function copyEmbedSnippet(): Promise<void> {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(embedSnippet.value)
    } catch {
      // Clipboard write failures are silent — same as the legacy
      // `navigator.clipboard.writeText(eb.value)` at portal.html line
      // 5387, which doesn't surface errors either.
    }
  }

  onMounted(load)
</script>

<template>
  <div class="kix-storefront p-8 space-y-6">
    <!-- Page header (mirrors `.ent-page-head` at portal.html line 2665-2668) -->
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
      </div>
      <button
        type="button"
        class="text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
        data-testid="storefront-open-public"
        @click="openPublicPage"
      >
        Open public page ↗
      </button>
    </header>

    <!-- 4-state for the preview card -->
    <section
      v-if="loading"
      class="text-gray-400 text-sm py-6 text-center"
      data-testid="storefront-loading"
    >
      Loading storefront…
    </section>

    <section
      v-else-if="error"
      class="text-red-600 text-sm py-6 text-center"
      data-testid="storefront-error"
    >
      Failed to load: {{ error }}
    </section>

    <template v-else>
      <!-- Preview card · mirrors portal.html line 2671-2682. Even when
           `profile` is null (404 fallback) we still render the preview
           keyed on the brand id alone — same intent as the legacy
           IIFE's "T" letter fallback. -->
      <section
        class="bg-white border border-gray-200 rounded-xl p-8 text-center space-y-3"
        data-testid="storefront-preview"
      >
        <div
          class="w-24 h-24 mx-auto rounded-2xl flex items-center justify-center text-white text-4xl font-extrabold"
          :style="{ backgroundColor: brandColor }"
          data-testid="storefront-avatar"
        >
          {{ avatarLetter }}
        </div>
        <h2 class="text-lg font-semibold text-gray-900" data-testid="storefront-display-name">
          {{ displayName }}
        </h2>
        <p class="text-sm text-gray-500" data-testid="storefront-bio">{{ bio }}</p>
        <p
          v-if="isDefault"
          class="text-xs text-amber-600 pt-1"
          data-testid="storefront-default-hint"
        >
          Default profile · customize to brand this page.
        </p>
        <p v-if="!profile" class="text-xs text-gray-400 pt-1" data-testid="storefront-empty-hint">
          Storefront not configured yet — share the URL below to go live with the default page.
        </p>
      </section>

      <!-- Public URL + embed snippet card · mirrors portal.html line 2700-2710 -->
      <section
        class="bg-white border border-gray-200 rounded-xl p-6 space-y-4"
        data-testid="storefront-share"
      >
        <header>
          <h2 class="text-sm font-semibold text-gray-900">Public URL</h2>
        </header>
        <code
          class="block text-xs font-mono p-3 bg-gray-50 border border-gray-200 rounded break-all"
          data-testid="storefront-public-url"
        >
          {{ publicUrl }}
        </code>

        <div class="pt-2 space-y-2">
          <div class="text-sm font-semibold text-gray-900">
            Embed the game on your own website
          </div>
          <textarea
            readonly
            rows="3"
            class="w-full text-xs font-mono p-3 bg-gray-50 border border-gray-200 rounded"
            :value="embedSnippet"
            data-testid="storefront-embed-snippet"
          />
          <button
            type="button"
            class="text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50"
            data-testid="storefront-embed-copy"
            @click="copyEmbedSnippet"
          >
            Copy embed code
          </button>
        </div>
      </section>
    </template>
  </div>
</template>
