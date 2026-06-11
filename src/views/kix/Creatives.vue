<script setup lang="ts">
  /**
   * Creatives view (asset library grid) — Plan 5 Task 7.
   *
   * Source: `kix-platform/landing/portal.html`, `<section id="view-creatives">`
   * (lines 1871-1907) + the legacy fetcher / renderer pair
   * `kixLoadCreatives()` (~line 6907) and `_kixRenderCreativesRows()`
   * (~line 6877-6905), plus the legacy fallback at line 6919-6940.
   * The legacy section bundles in one place:
   *
   *   - Page header + subtitle ("Logos, hero images, color tokens, and
   *     brand voice — auto-embedded into every game you ship.") at
   *     portal.html line 1873-1875.
   *   - "+ Upload asset" CTA (line 1877) — triggers a hidden
   *     `<input type="file" multiple>` whose change handler calls
   *     `kixUploadCreatives(this.files)`. Real S3 wiring goes via
   *     `/api/v1/assets/upload` but the legacy build POSTs a metadata-
   *     only record to `/api/v1/portal/settings/creatives/<bid>`
   *     instead (portal.html line 6860-6868).
   *   - Brand kit hero card (line 1881-1903) — three decorative tiles:
   *     a "T" primary-logo placeholder, a 2x2 brand-colour swatch grid,
   *     and an "Aa" typography card. Pure decoration — no data on the
   *     wire.
   *   - Recent uploads grid (`#creative-uploads` at line 1904) — auto-
   *     rendered by the inlined card loop in `_kixRenderCreativesRows()`.
   *     Each card shows: kind (image/video) · filename (escaped + 30-char
   *     slice) · size in KB · uploaded-at (`formatted_display`). Default
   *     empty-state copy: "No uploads yet. Drop images to embed them
   *     into your next game." (portal.html line 6886).
   *
   * Plan 5 T7 ports ONLY: page header + read-only asset library grid.
   * DEFERRED (legacy still owns these surfaces):
   *   - "+ Upload asset" CTA + hidden file input + POST metadata-only
   *     registration (`kixUploadCreatives()` at line 6844). Requires
   *     file-handling + per-file progress + the legacy fallback shim —
   *     outside the four-state read pattern.
   *   - Brand-kit hero card (logo / colours / typography tiles) — pure
   *     decoration. Can be folded back in once the brand-profile editor
   *     surfaces `logo_url` / `brand_color`.
   *   - Per-card preview thumbnail — the legacy renderer doesn't render
   *     one either (just emits a card with name / kind / size / date),
   *     so the first cut matches.
   *   - Per-card edit / delete actions — not in the legacy view either.
   *   - Brand-kit linking (typography / colour tokens tying assets to
   *     the storefront profile — a future cross-surface integration).
   *   - Pagination controls (Prev / Next + page label) — would require
   *     porting `kixPaginate*` helpers and bumping to the `/page`
   *     endpoint shape `{ items, total, has_more }`.
   *
   * Same four-state template as Plan 3/4/5 T1-T6: port a thin honest
   * slice of a real endpoint, defer the rest behind a clear comment.
   * Visually closer to the Templates / Cases card grids than to the
   * Campaigns / Customers / Audiences tables.
   *
   * State machine: loading → (data | empty | error). Empty-state copy
   * mirrors the legacy fallback at portal.html line 6886 — "No uploads
   * yet. Drop images to embed them into your next game." — we surface
   * a flat-text variant ("No uploads yet.") so the deferred upload
   * CTA's copy doesn't drift onto the page before the CTA itself
   * lands.
   *
   * Endpoint: GET /api/v1/portal/settings/creatives/<brand_id>. Brand
   * id is in the URL path — settings-router pattern, NOT the JWT-
   * inferred /portal-admin/ shape used by Geofences / Customers /
   * Audiences. Falls back to 'demo_brand' (matches the legacy
   * `_t44Bid()` helper default when `kix_brand_id` is unset).
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listCreatives } from '@/api/portal-admin/creatives'
  import type {
    CreativeAsset,
    CreativesListResponse,
    SettingsTimestamp
  } from '@/api/portal-admin/types'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const assets = ref<CreativeAsset[]>([])

  const pageTitle = computed(() => t('portal.creatives.title'))
  const pageSubtitle = computed(() => t('portal.creatives.subtitle'))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listCreatives()
      const data: CreativesListResponse | undefined = res.data
      if (Array.isArray(data)) {
        assets.value = data
      } else if (data && typeof data === 'object') {
        const d = data as {
          items?: CreativeAsset[]
          creatives?: CreativeAsset[]
        }
        assets.value = d.items ?? d.creatives ?? []
      } else {
        assets.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Per-card kind subscript. Mirrors the legacy renderer's
   * `const kind = c.kind || 'image';` at portal.html line 6894 —
   * backend may omit `kind` for very old metadata-only rows, in
   * which case the 'image' default kicks in.
   */
  function kindFor(asset: CreativeAsset): string {
    return asset.kind || 'image'
  }

  /**
   * Per-card size display. Mirrors `${Math.round(c.bytes / 1024)} KB`
   * at portal.html line 6895 — em-dash fallback when `bytes` is
   * absent (same `c.bytes ? ... : '—'` ternary as the legacy code).
   */
  function sizeFor(asset: CreativeAsset): string {
    if (typeof asset.bytes !== 'number' || asset.bytes <= 0) return '—'
    return `${Math.round(asset.bytes / 1024)} KB`
  }

  /**
   * Per-card uploaded-at display. Settings-router convention is the
   * pre-formatted wrapper `{ formatted_display, iso8601 }` — the
   * legacy renderer reads `c.uploaded_at?.formatted_display` at
   * portal.html line 6898 with an em-dash fallback. We also accept
   * a raw ISO string for defensive parity (in case the schema
   * evolves to emit it un-wrapped).
   */
  function uploadedAtFor(asset: CreativeAsset): string {
    const ts: SettingsTimestamp | undefined = asset.uploaded_at
    if (!ts) return '—'
    if (typeof ts === 'string') return ts
    return ts.formatted_display ?? ts.iso8601 ?? '—'
  }

  /**
   * Per-card filename display. Mirrors the legacy renderer at
   * portal.html line 6896 which reads `c.filename || ''` and runs
   * `.replace(/[<>&"]/g,'')` to strip injection chars. Vue's
   * `{{ }}` interpolation already escapes HTML, so the explicit
   * strip is unnecessary — but we apply a length-conscious truncation
   * so very long filenames don't blow out the grid. The legacy code
   * also slices to 30 chars in `_kixLoadCreativesLegacy` at line 6934.
   */
  function filenameFor(asset: CreativeAsset): string {
    return asset.filename || '—'
  }

  /**
   * Row key — `asset_id` is the canonical identifier when the
   * backend has promoted the metadata record to a real S3 asset.
   * Falls back to `filename` then array index for defensive parity
   * with Templates / Cases / Rules / Audiences / AbTests.
   */
  function rowKey(asset: CreativeAsset, idx: number): string {
    return asset.asset_id ?? asset.filename ?? `idx-${idx}`
  }

  onMounted(load)
</script>

<template>
  <div class="kix-creatives p-8 space-y-6">
    <!-- Page header (mirrors `.ent-page-head` at portal.html line 1872-1876) -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- Asset library · 4-state -->
    <section
      v-if="loading"
      class="text-gray-400 text-sm py-6 text-center"
      data-testid="creatives-loading"
    >
      Loading creatives…
    </section>

    <section
      v-else-if="error"
      class="text-red-600 text-sm py-6 text-center"
      data-testid="creatives-error"
    >
      Failed to load: {{ error }}
    </section>

    <!--
      Empty-state — mirrors the legacy "No uploads yet. Drop images to
      embed them into your next game." copy at portal.html line 6886.
      We surface a flat-text variant so the deferred "+ Upload asset"
      CTA's copy doesn't drift onto the page before the CTA itself
      lands.
    -->
    <section
      v-else-if="assets.length === 0"
      class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
      data-testid="creatives-empty"
    >
      No uploads yet.
    </section>

    <!--
      Asset grid · mirrors the legacy card layout at portal.html line
      6893-6901 (`.reco-card` per asset). Card shows: kind subscript
      (image/video) · filename · size in KB · uploaded-at.
    -->
    <section
      v-else
      class="grid gap-4"
      style="grid-template-columns: repeat(auto-fill, minmax(180px, 1fr))"
      data-testid="creatives-grid"
    >
      <article
        v-for="(asset, idx) in assets"
        :key="rowKey(asset, idx)"
        class="border border-gray-200 rounded-lg bg-white p-4 flex flex-col gap-1"
        data-testid="creatives-card"
      >
        <div class="text-xs uppercase tracking-wide text-gray-500">
          {{ kindFor(asset) }}
        </div>
        <div class="font-semibold text-sm text-gray-900 break-all">
          {{ filenameFor(asset) }}
        </div>
        <div class="text-xs text-gray-500 tabular-nums">
          {{ sizeFor(asset) }} · {{ uploadedAtFor(asset) }}
        </div>
      </article>
    </section>
  </div>
</template>
