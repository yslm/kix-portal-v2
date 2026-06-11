<script setup lang="ts">
  /**
   * Geofences view (stores / locations table) — Plan 5 Task 6.
   *
   * Source: `kix-platform/landing/portal.html`, `<section id="view-geofences">`
   * (lines 2161-2205) + the legacy fetcher `kixLoadGeofences()` (~line
   * 4722) + the inlined table renderer at ~line 4734-4742. The legacy
   * section bundles in one place:
   *
   *   - Page header + subtitle ("Each store is a geofence — staff QR /
   *     redeem / location-trigger campaigns key off this list.") at
   *     portal.html line 2163-2164
   *   - "+ Add store" CTA (line 2170) — opens an inline slide-in form
   *     with name + address-autocomplete + draggable map pin + radius
   *     slider; submits to POST `/api/v1/portal-admin/locations`.
   *   - Inline Add-store form (line 2179-2199) — Mapbox-primary /
   *     Nominatim-fallback address widget + hidden geocoded state
   *     capture + Save / Cancel CTAs.
   *   - Stores list table (`#locations-list` at line 2201) — auto-
   *     rendered by the inlined loop in `kixLoadGeofences()`. Columns:
   *     ID · Name · Address · Radius · Status. The status pill is
   *     hard-coded to "Active" by the legacy renderer (no per-row
   *     status flag on the wire).
   *
   * Plan 5 T6 ports ONLY the page header + the read-only stores table.
   * DEFERRED (legacy still owns these surfaces):
   *   - "+ Add store" CTA + the slide-in form + POST flow
   *   - Mapbox / Nominatim address autocomplete widget
   *   - Draggable map pin + map drawing editor
   *   - Radius slider with live "X m" preview
   *   - Hidden geocoded-state capture (place_id / geocoded_address /
   *     resolved_lat / resolved_lng)
   *   - Per-row Edit / Delete actions (not in the legacy view either —
   *     a future slice can layer PATCH / DELETE onto the same endpoint
   *     family)
   *
   * Same four-state template as Plan 3/4/5 T1-T5: port a thin honest
   * slice of a real endpoint, defer the rest behind a clear comment.
   * Visually closer to the Campaigns / Customers / Audiences tables
   * than to the Templates / Cases card grids.
   *
   * State machine: loading → (data | empty | error). Empty-state copy
   * mirrors the legacy fallback at portal.html line 4732 — "No stores
   * yet. Click + Add store to create your first geofence." — we surface
   * a flat-text variant ("No stores yet.") so the deferred CTA's copy
   * doesn't drift onto the page before the CTA itself lands.
   *
   * Endpoint: GET /api/v1/portal-admin/locations. Brand inferred from
   * the JWT (`get_current_brand` dependency, no `?brand=` param — same
   * pattern as listCustomers() / listAudiences() / listRules() /
   * listAbTests() / listTemplates() / fetchWallet()).
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listGeofences } from '@/api/portal-admin/geofences'
  import type { GeofencesListResponse, Location } from '@/api/portal-admin/types'
  import StatusBadge from '@/components/StatusBadge.vue'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const stores = ref<Location[]>([])

  const pageTitle = computed(() => t('portal.geofences.title'))
  const pageSubtitle = computed(() => t('portal.geofences.subtitle'))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listGeofences()
      const data: GeofencesListResponse | undefined = res.data
      if (Array.isArray(data)) {
        stores.value = data
      } else if (data && typeof data === 'object') {
        const d = data as { locations?: Location[]; items?: Location[] }
        stores.value = d.locations ?? d.items ?? []
      } else {
        stores.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Per-row radius display. Mirrors the legacy renderer's
   * `${l.radius_m||50} m` read at portal.html line 4737 — backend may
   * omit the field for very old rows added before Wave1 PR-3, in which
   * case the 50 m default kicks in (matches the slider's default value
   * at portal.html line 2192).
   */
  function radiusDisplay(loc: Location): string {
    const r = typeof loc.radius_m === 'number' ? loc.radius_m : 50
    return `${r} m`
  }

  /**
   * Per-row status. Legacy view hard-codes "Active" for every row (no
   * per-row status flag on the wire — see portal.html line 4737). We
   * surface the same default through `<StatusBadge status="active">` so
   * the column renders cleanly; if the backend later starts emitting a
   * real `status` field, the StatusBadge mapping picks it up
   * automatically (active / inactive / draft / pending).
   */
  function statusFor(loc: Location): string {
    return loc.status || 'active'
  }

  /**
   * Row key — `id` is the canonical identifier (the legacy renderer uses
   * it as the `<code>` cell content). Array-index fallback is defensive
   * against schema drift, matching the convention in Templates / Rules /
   * Audiences / AbTests / Cases.
   */
  function rowKey(loc: Location, idx: number): string {
    return loc.id ?? `idx-${idx}`
  }

  onMounted(load)
</script>

<template>
  <div class="kix-geofences p-8 space-y-6">
    <!-- Page header (mirrors `.ent-page-head` at portal.html line 2162-2165) -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- Stores list · 4-state -->
    <section
      v-if="loading"
      class="text-gray-400 text-sm py-6 text-center"
      data-testid="geofences-loading"
    >
      Loading stores…
    </section>

    <section
      v-else-if="error"
      class="text-red-600 text-sm py-6 text-center"
      data-testid="geofences-error"
    >
      Failed to load: {{ error }}
    </section>

    <!--
      Empty-state — mirrors the legacy "No stores yet. Click + Add store
      to create your first geofence." copy at portal.html line 4732. We
      surface a flat-text variant so the deferred "+ Add store" CTA's
      copy doesn't drift onto the page before the CTA itself lands.
    -->
    <section
      v-else-if="stores.length === 0"
      class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
      data-testid="geofences-empty"
    >
      No stores yet.
    </section>

    <!-- Stores table · mirrors the legacy `.etable` block at portal.html line 4735 -->
    <section
      v-else
      class="bg-white border border-gray-200 rounded-lg overflow-hidden"
      data-testid="geofences-table"
    >
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
          <tr>
            <th class="text-left font-medium px-4 py-2 w-40">ID</th>
            <th class="text-left font-medium px-4 py-2">Name</th>
            <th class="text-left font-medium px-4 py-2">Address</th>
            <th class="text-right font-medium px-4 py-2 w-24">Radius</th>
            <th class="text-left font-medium px-4 py-2 w-28">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="(loc, idx) in stores" :key="rowKey(loc, idx)" data-testid="geofences-row">
            <td class="px-4 py-3 text-xs font-mono text-gray-500 break-all">
              <code>{{ loc.id }}</code>
            </td>
            <td class="px-4 py-3 font-semibold text-gray-900">{{ loc.name || '—' }}</td>
            <td class="px-4 py-3 text-gray-600">{{ loc.address || '—' }}</td>
            <td class="px-4 py-3 text-right tabular-nums text-gray-900">
              {{ radiusDisplay(loc) }}
            </td>
            <td class="px-4 py-3">
              <StatusBadge :status="statusFor(loc)" />
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
