<script setup lang="ts">
  /**
   * Rules (Automations) view — Plan 4 Task 6.
   *
   * Source: `kix-platform/landing/portal.html`, `<section id="view-rules">`
   * (lines 1933-1955) + legacy fetcher `kixLoadRules()` (~line 7185) +
   * table renderer (lines 7206-7232). The legacy section bundles in
   * one place:
   *
   *   - Page header + "Audit log" + "+ Create rule" CTAs (line 1934-1943)
   *   - Rules table (`#rules-tbody` at line 1947) with columns
   *     On · Rule · Condition · Action · Scope · Last triggered · actions
   *   - Per-row On / Off / Notify only toggle buttons that PATCH
   *     `/api/v1/portal-admin/automations/<id>/state`
   *     (`kixToggleAutomation()` at line 7238)
   *   - Empty-state copy gated on `empty_state_hint` from the wrapper,
   *     with a "Source: redis · Updated <rel>" footer line
   *   - The "+ Create rule" CTA actually navigates to the Flows wizard
   *     (line 1941: `onclick="kixSwitchView('flows')"`) — there is no
   *     dedicated rule create form in the current portal
   *   - A separate dry-run endpoint at line 10495 (`POST /rules/dry-run`)
   *     used by the inline rule builder preview pane
   *
   * Plan 4 T6 ports ONLY the page header + a single-page list of rules.
   * The table columns shipped here mirror the legacy: **name · state ·
   * condition · action · scope · last triggered**. Everything else is
   * DEFERRED:
   *   - Per-row On / Off / Notify only toggle buttons + the PATCH
   *     `/automations/<id>/state` call
   *   - "+ Create rule" CTA (legacy redirects to Flows)
   *   - Audit log modal
   *   - Dry-run endpoint + inline rule builder preview
   *   - `Source: redis · Updated <rel>` footer line on the empty state
   *
   * Same template as Plan 4 T1-T5: port a thin honest slice of a real
   * endpoint, defer the rest behind a clear comment.
   *
   * Naming note: the route + view-id stay "rules" (legacy convention,
   * Wave4 W4-C·B36 doesn't rename routes mid-flight) but the rendered
   * page title is "Automations" — same as the legacy `<h1>` at line
   * 1936. State badge uses the shared `<StatusBadge>` for parity with
   * other Plan 4 views; the `notify_only` value falls through to the
   * gray-pill default (safe), matching the legacy "Notify only" badge.
   *
   * State machine: loading → (data | empty | error). Empty-state copy
   * mirrors the legacy `empty_state_hint || 'No automation rules yet.'`
   * (portal.html line 7201).
   *
   * Endpoint: GET /api/v1/portal-admin/automations. Brand inferred from
   * JWT by the portal-admin router — no explicit `?brand=` param, same
   * as `listAbTests()` / `listCustomers()` / `listAudiences()`.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listRules } from '@/api/portal-admin/rules'
  import type { Rule } from '@/api/portal-admin/types'
  import StatusBadge from '@/components/StatusBadge.vue'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const rules = ref<Rule[]>([])

  const pageTitle = computed(() => t('portal.rules.title'))
  const pageSubtitle = computed(() => t('portal.rules.subtitle'))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listRules()
      const data = res.data
      if (Array.isArray(data)) {
        rules.value = data
      } else if (data && typeof data === 'object') {
        const d = data as { items?: Rule[]; rules?: Rule[]; automations?: Rule[] }
        rules.value = d.items ?? d.rules ?? d.automations ?? []
      } else {
        rules.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Row key — `id` is required by the portal-admin Rule record (the
   * FastAPI route always emits it, both for redis-persisted rows and the
   * demo seed). The array-index fallback is defensive against schema
   * drift, matching the convention in Audiences / AbTests / CustomerList.
   */
  function rowKey(r: Rule, idx: number): string {
    return r.id ?? `idx-${idx}`
  }

  /**
   * State-to-StatusBadge mapping — the legacy badge taxonomy is three
   * values (`on` / `off` / `notify_only`) while the shared
   * `<StatusBadge>` colour map keys off (`active` / `inactive` / …).
   * We project the rule state onto that vocabulary so green/gray
   * conveys the same intent as the legacy "On"/"Off" pill. The
   * `notify_only` case falls through to the unknown-but-truthy gray
   * default — safe, and visually distinct from the bare empty case.
   */
  function stateForBadge(state: string | undefined): string | undefined {
    if (state === 'on') return 'active'
    if (state === 'off') return 'inactive'
    return state // 'notify_only' or other → gray pill fallback in StatusBadge
  }

  onMounted(load)
</script>

<template>
  <div class="kix-rules p-8 space-y-6">
    <!-- Page header (mirrors `<div class="ent-page-head">` at portal.html line 1934) -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- Rules table · 4-state -->
    <section
      v-if="loading"
      class="text-gray-400 text-sm py-6 text-center"
      data-testid="rules-loading"
    >
      Loading rules…
    </section>

    <section
      v-else-if="error"
      class="text-red-600 text-sm py-6 text-center"
      data-testid="rules-error"
    >
      Failed to load: {{ error }}
    </section>

    <!--
      Empty-state — mirrors the legacy "No automation rules yet" string at
      portal.html line 7201. The legacy copy also offers a "+ Create rule"
      CTA (which actually navigates to the Flows wizard); it is trimmed
      here because that flow stays in the legacy view for now and the
      DEFERRED create path is documented in rules.ts.
    -->
    <section
      v-else-if="rules.length === 0"
      class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
      data-testid="rules-empty"
    >
      No automation rules yet.
    </section>

    <section v-else class="space-y-3" data-testid="rules-list">
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-4 py-2 font-medium">On</th>
              <th class="px-4 py-2 font-medium">Rule</th>
              <th class="px-4 py-2 font-medium">Condition</th>
              <th class="px-4 py-2 font-medium">Action</th>
              <th class="px-4 py-2 font-medium">Scope</th>
              <th class="px-4 py-2 font-medium">Last triggered</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(rule, idx) in rules"
              :key="rowKey(rule, idx)"
              class="border-t border-gray-100 hover:bg-gray-50"
              data-testid="rule-row"
            >
              <td class="px-4 py-2">
                <StatusBadge :status="stateForBadge(rule.state)" />
              </td>
              <td class="px-4 py-2 font-medium text-gray-900">{{ rule.name ?? '—' }}</td>
              <td class="px-4 py-2 text-gray-600 font-mono text-xs">
                {{ rule.condition ?? '—' }}
              </td>
              <td class="px-4 py-2 text-gray-600">{{ rule.action ?? '—' }}</td>
              <td class="px-4 py-2 text-gray-600">{{ rule.scope ?? '—' }}</td>
              <td class="px-4 py-2 text-gray-600">{{ rule.last_triggered_at ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
