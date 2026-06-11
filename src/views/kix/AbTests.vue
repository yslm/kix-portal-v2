<script setup lang="ts">
  /**
   * AbTests view — Plan 4 Task 5.
   *
   * Source: `kix-platform/landing/portal.html`, `<section id="view-abtests">`
   * (lines 1911-1928) + legacy fetcher `kixLoadAbTests()` (~line 6965)
   * + table renderer (line 6986-7008). The legacy section bundles in
   * one section:
   *
   *   - Page header + "+ New test" CTA (lines 1912-1918)
   *   - Tests table (`#abtests-tbody` at line 1922) with columns
   *     Test · Variant A · Variant B · Lift · p-value · Status · action
   *   - Inline `kixCreateAbTest()` modal (`#abtest-modal` at line 7036)
   *     for spinning up a new test from two existing campaigns
   *   - Per-row "Ship B" + "View" CTAs that hit results / ship endpoints
   *   - Fail-closed empty state — different copy when `campaign_count<2`
   *     ("Create at least 2 campaigns to A/B test.") vs the normal
   *     "No A/B tests yet — click + New test to compare two campaigns."
   *
   * Plan 4 T5 ports ONLY the page header + a single-page list of tests.
   * The table columns shipped here are the minimum useful set per the
   * Plan 4 directive: **name · status · variants count · created_at**.
   * Variants count is always 2 in the current schema (one A + one B —
   * the create modal is a fixed two-variant picker) — we surface it
   * literally rather than inventing a synthetic count so the column
   * stays honest. Everything else is DEFERRED:
   *   - New-test create modal (`kixCreateAbTest()` + POST `/ab-tests`)
   *   - Results dashboard (`kixAbTestView()` + GET `/ab-tests/<id>/results`)
   *   - Ship-winner CTA (`kixAbTestShip()` + POST `/ab-tests/<id>/ship`)
   *   - Variant editor — currently lives inside the create modal
   *   - Lift / p-value formatted columns with green/red colouring
   *   - Fail-closed dual empty state ("+ New test" vs "Go to Campaigns →")
   *     driven by `can_create` / `campaign_count` from the wrapper
   *
   * Same template as Plan 4 T1-T4: port a thin honest slice of a real
   * endpoint, defer the rest behind a clear comment.
   *
   * State machine: loading → (data | empty | error). Empty-state copy
   * mirrors the legacy "No A/B tests yet" string (portal.html line 6977)
   * with the "+ New test" CTA dropped — the create form is deferred and
   * will restore the CTA when it lands.
   *
   * Endpoint: GET /api/v1/portal-admin/ab-tests. Brand inferred from JWT
   * by the portal-admin router — no explicit `?brand=` param, same as
   * `listCustomers()` / `listAudiences()`.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listAbTests } from '@/api/portal-admin/abtests'
  import type { AbTest } from '@/api/portal-admin/types'
  import StatusBadge from '@/components/StatusBadge.vue'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const abtests = ref<AbTest[]>([])

  const pageTitle = computed(() => t('portal.abtests.title'))
  const pageSubtitle = computed(() => t('portal.abtests.subtitle'))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listAbTests()
      const data = res.data
      if (Array.isArray(data)) {
        abtests.value = data
      } else if (data && typeof data === 'object') {
        const d = data as { items?: AbTest[]; abtests?: AbTest[]; ab_tests?: AbTest[] }
        abtests.value = d.items ?? d.abtests ?? d.ab_tests ?? []
      } else {
        abtests.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Row key — `id` is required by the portal-admin AB-test record (the
   * FastAPI route always emits it, both for redis-persisted rows and the
   * demo seed). The array-index fallback is defensive against schema
   * drift, matching the convention in Audiences / CustomerList.
   */
  function rowKey(t: AbTest, idx: number): string {
    return t.id ?? `idx-${idx}`
  }

  /**
   * Variants count — the current schema is fixed two-variant (one A
   * campaign + one B campaign — see `ABTestCreate` at
   * portal_admin.py:2595). We surface the count derived from the
   * campaign_*_id presence so the column reflects what the wire data
   * actually carries. Demo + real rows always satisfy both, so this
   * effectively always returns 2 today — the function guards against
   * future N-variant schema evolution without lying about the data.
   */
  function variantsCount(t: AbTest): number {
    let n = 0
    if (t.campaign_a_id) n += 1
    if (t.campaign_b_id) n += 1
    return n
  }

  onMounted(load)
</script>

<template>
  <div class="kix-abtests p-8 space-y-6">
    <!-- Page header (mirrors `<div class="ent-page-head">` at portal.html line 1912) -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- A/B tests table · 4-state -->
    <section
      v-if="loading"
      class="text-gray-400 text-sm py-6 text-center"
      data-testid="abtests-loading"
    >
      Loading A/B tests…
    </section>

    <section
      v-else-if="error"
      class="text-red-600 text-sm py-6 text-center"
      data-testid="abtests-error"
    >
      Failed to load: {{ error }}
    </section>

    <!--
      Empty-state — mirrors the legacy "No A/B tests yet" string at
      portal.html line 6977. The legacy copy also offers a "+ New test"
      CTA (or a "Go to Campaigns →" button when the brand has < 2
      campaigns); both are trimmed here because the create modal is
      deferred to a later Plan 4 sub-task.
    -->
    <section
      v-else-if="abtests.length === 0"
      class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
      data-testid="abtests-empty"
    >
      No A/B tests yet — variant comparisons will appear here.
    </section>

    <section v-else class="space-y-3" data-testid="abtests-list">
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-4 py-2 font-medium">Test</th>
              <th class="px-4 py-2 font-medium">Status</th>
              <th class="px-4 py-2 font-medium text-right">Variants</th>
              <th class="px-4 py-2 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(test, idx) in abtests"
              :key="rowKey(test, idx)"
              class="border-t border-gray-100 hover:bg-gray-50"
              data-testid="abtest-row"
            >
              <td class="px-4 py-2 font-medium text-gray-900">{{ test.name ?? '—' }}</td>
              <td class="px-4 py-2">
                <StatusBadge :status="test.status" />
              </td>
              <td class="px-4 py-2 text-right tabular-nums">{{ variantsCount(test) }}</td>
              <td class="px-4 py-2 text-gray-600">{{ test.created_at ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
