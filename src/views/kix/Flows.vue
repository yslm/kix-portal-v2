<script setup lang="ts">
  /**
   * Flows view — first P1 view migrated from
   * `kix-platform/landing/portal.html` (#view-flows, lines 1526–1730;
   * fetcher `kixLoadFlows()` ~line 8750).
   *
   * Plan 4 Task 1 ports the page header + the "My flows" gallery ONLY.
   * The legacy section is much larger and also hosts:
   *  - the 4-step wizard (#flow-wizard-step1..4): pick template,
   *    customize amounts/dates, simulate funnel, publish summary
   *  - the templates grid (#flow-templates-grid) fed by
   *    `GET /api/v1/portal-admin/flows/templates`
   *  - the simulator panel (audience reach / completers / cost projection)
   *  - the "Start blank" + "Pick a campaign" entry CTAs
   *  - the reward-summary aside and per-step preview / edit modals
   *
   * All of the above is DEFERRED so this first cut stays a thin, honest
   * read-only mirror of the GET list endpoint. Same template as Plan 3
   * T3 (Campaigns) / T4 (Games).
   *
   * State machine: loading → (data | empty-hero | error). No optimistic
   * placeholders, no fake cards. The legacy view shows a separate
   * `#flows-empty-hero` for brand-new merchants — we render the same
   * empty-state copy in the empty branch.
   *
   * Endpoint: GET /api/v1/portal-admin/flows?brand=<brand_id>.
   * Brand id resolved via the shared `resolveBrandId()` helper, mirroring
   * the legacy `KIX_BRAND_ID` global. The legacy renderer reads
   * `(data && data.flows) || []` — we accept the same wrapper plus bare
   * arrays / `{ items }` for defensive parity.
   *
   * Wave4 W4-C · B36 note: the merchant-facing label for these artifacts
   * is "Campaign" (the thing they end up with). The internal data model
   * term remains "flow" — IDs, API paths and wire field names are not
   * renamed (see portal.html line 1532-1536). We follow the same split.
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listFlows } from '@/api/portal-admin/flows'
  import type { AutomationFlow } from '@/api/portal-admin/types'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'
  import StatusBadge from '@/components/StatusBadge.vue'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const flows = ref<AutomationFlow[]>([])

  const pageTitle = computed(() => t('portal.flows.title'))
  const pageSubtitle = computed(() => t('portal.flows.subtitle'))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listFlows(resolveBrandId())
      const data = res.data
      if (Array.isArray(data)) {
        flows.value = data
      } else if (data && typeof data === 'object') {
        const d = data as { flows?: AutomationFlow[]; items?: AutomationFlow[] }
        flows.value = d.flows ?? d.items ?? []
      } else {
        flows.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  /**
   * Legacy renderer prints the template id raw, falling back to the
   * literal string "custom" when the flow was created from blank (see
   * portal.html line 8779: `${esc(f.template_id || 'custom')}`).
   */
  function templateLabel(f: AutomationFlow): string {
    return f.template_id || 'custom'
  }

  /**
   * Legacy renderer prints the date window as `${start} → ${end}` with no
   * formatting — both fields are rendered raw (portal.html line 8777).
   * Em-dash placeholder keeps the visual alignment when either is absent.
   */
  function dateWindow(f: AutomationFlow): string {
    const start = f.start_date ?? '—'
    const end = f.end_date ?? '—'
    return `${start} → ${end}`
  }

  onMounted(load)
</script>

<template>
  <div class="kix-flows p-8 space-y-6">
    <!-- Page header -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- My Flows gallery -->
    <section v-if="loading" class="text-gray-400 text-sm py-6 text-center">
      Loading flows…
    </section>

    <section v-else-if="error" class="text-red-600 text-sm py-6 text-center">
      Failed to load: {{ error }}
    </section>

    <!--
      Empty-state hero — the legacy view exposes a "+ Pick a campaign" CTA
      that opens the 4-step wizard. The wizard is deferred (Plan 4 T1
      scope is list-only), so we render the hero copy without the CTA.
    -->
    <section
      v-else-if="flows.length === 0"
      class="text-gray-400 text-sm py-12 text-center border border-dashed border-gray-200 rounded-xl"
      data-testid="flows-empty-hero"
    >
      No flows yet. Build your first campaign flow to get started.
    </section>

    <section v-else class="space-y-3" data-testid="flows-list">
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-4 py-2 font-medium">Status</th>
              <th class="px-4 py-2 font-medium">Name</th>
              <th class="px-4 py-2 font-medium">Template</th>
              <th class="px-4 py-2 font-medium">Window</th>
              <th class="px-4 py-2 font-medium text-right">Steps</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="f in flows"
              :key="f.flow_id"
              class="border-t border-gray-100 hover:bg-gray-50"
              data-testid="flow-row"
            >
              <td class="px-4 py-2">
                <StatusBadge :status="f.status" />
              </td>
              <td class="px-4 py-2 font-medium text-gray-900">{{ f.name ?? '—' }}</td>
              <td class="px-4 py-2 text-gray-600 font-mono text-xs">{{ templateLabel(f) }}</td>
              <td class="px-4 py-2 text-gray-600">{{ dateWindow(f) }}</td>
              <td class="px-4 py-2 text-right tabular-nums">{{ f.steps_count ?? 0 }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
