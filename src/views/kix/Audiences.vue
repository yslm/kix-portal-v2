<script setup lang="ts">
  /**
   * Audiences view — Plan 4 Task 4.
   *
   * Source: `kix-platform/landing/portal.html`, `<section id="view-audiences">`
   * (lines 1822-1866). The legacy section bundles in one section:
   *
   *   - Page header + "+ New audience" CTA (lines 1823-1829)
   *   - Inline new-audience form (`#audience-new-form` at line 1830-1857)
   *     · name + source select + quick-segment preset select
   *     · advanced JSON-DSL textarea + description input
   *   - Audiences table (`#audiences-tbody` at line 1861) with columns
   *     Audience · Source · Size · Last refreshed · Status · row-edit btn
   *   - Pagination footer appended by `_kixEnsurePagFooter()` (line 6805)
   *
   * Plan 4 T4 ports ONLY the page header + a single-page audiences table
   * fed by the simpler `/api/v1/portal-admin/audiences` GET endpoint —
   * see `audiences.ts` for the trade-off rationale. Everything else is
   * DEFERRED:
   *   - New-audience form (name / source / preset / DSL / description)
   *   - Per-row "Edit" rename button (`kixEditAudience()` line 6830)
   *   - Pagination prev / next + total
   *   - StatusBadge column (portal-admin route has no `status` field;
   *     comes with the paginated settings route)
   *   - RFM summary integration powering the preset quick-segments
   *
   * Same template as Plan 4 T1-T3: port a thin honest slice of a real
   * endpoint, defer the rest behind a clear comment.
   *
   * State machine: loading → (data | empty | error). Empty-state copy
   * mirrors the legacy "No audiences yet. Click + New audience to create
   * one." string (portal.html line 6777). We drop the "+ New audience"
   * suggestion in the empty-state body because the CTA is deferred — the
   * copy will be restored when the form lands.
   *
   * Endpoint: GET /api/v1/portal-admin/audiences (brand inferred from
   * JWT by the portal-admin router — no explicit `?brand=` param, same
   * as `listCustomers()`).
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listAudiences } from '@/api/portal-admin/audiences'
  import type { Audience } from '@/api/portal-admin/types'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const audiences = ref<Audience[]>([])

  const pageTitle = computed(() => t('portal.audiences.title'))
  const pageSubtitle = computed(() => t('portal.audiences.subtitleFull'))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listAudiences()
      const data = res.data
      if (Array.isArray(data)) {
        audiences.value = data
      } else if (data && typeof data === 'object') {
        const d = data as { audiences?: Audience[]; items?: Audience[] }
        audiences.value = d.audiences ?? d.items ?? []
      } else {
        audiences.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Row key — `id` is required by the portal-admin Audience pydantic
   * model (see app/routers/portal_admin.py:185-192), but we still guard
   * with the array index for defensive correctness against schema drift.
   */
  function rowKey(a: Audience, idx: number): string {
    return a.id ?? `idx-${idx}`
  }

  /**
   * Format `size_estimate` as a locale-grouped integer. Legacy renderer
   * at portal.html:6783 does `(a.size||0).toLocaleString()` — we mirror
   * the toLocaleString convention against the portal-admin
   * `size_estimate` field. Missing / null → 0 (same as legacy).
   */
  function formatSize(a: Audience): string {
    const n = a.size_estimate ?? 0
    return n.toLocaleString()
  }

  onMounted(load)
</script>

<template>
  <div class="kix-audiences p-8 space-y-6">
    <!-- Page header (mirrors `<div class="ent-page-head">` at portal.html line 1823) -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- Audiences table · 4-state -->
    <section
      v-if="loading"
      class="text-gray-400 text-sm py-6 text-center"
      data-testid="audiences-loading"
    >
      Loading audiences…
    </section>

    <section
      v-else-if="error"
      class="text-red-600 text-sm py-6 text-center"
      data-testid="audiences-error"
    >
      Failed to load: {{ error }}
    </section>

    <!--
      Empty-state — mirrors the legacy "No audiences yet" string at
      portal.html line 6777. The legacy copy also suggests clicking
      "+ New audience" to create one; we trim that hint until the form
      lands in a future Plan 4 sub-task.
    -->
    <section
      v-else-if="audiences.length === 0"
      class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
      data-testid="audiences-empty"
    >
      No audiences yet — saved customer segments will appear here.
    </section>

    <section v-else class="space-y-3" data-testid="audiences-list">
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-4 py-2 font-medium">Audience</th>
              <th class="px-4 py-2 font-medium">Type</th>
              <th class="px-4 py-2 font-medium text-right">Size</th>
              <th class="px-4 py-2 font-medium">Created</th>
              <th class="px-4 py-2 font-medium">Last used</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(a, idx) in audiences"
              :key="rowKey(a, idx)"
              class="border-t border-gray-100 hover:bg-gray-50"
              data-testid="audience-row"
            >
              <td class="px-4 py-2 font-medium text-gray-900">{{ a.name }}</td>
              <td class="px-4 py-2">
                <span
                  v-if="a.type"
                  class="text-xs px-2 py-0.5 rounded-full inline-block bg-gray-50 text-gray-600"
                >
                  {{ a.type }}
                </span>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="px-4 py-2 text-right tabular-nums">{{ formatSize(a) }}</td>
              <td class="px-4 py-2 text-gray-600">{{ a.created_at ?? '—' }}</td>
              <td class="px-4 py-2 text-gray-600">{{ a.last_used_at ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
