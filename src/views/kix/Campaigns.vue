<script setup lang="ts">
  /**
   * Campaigns view — third real P0 view migrated from
   * `kix-platform/landing/portal.html` (#view-campaigns, lines 1785–1817;
   * fetcher `kixLoadCampaignsList()` ~line 5321).
   *
   * Plan 3 Task 3 ports the LIST table + page header only. The legacy view
   * also exposes a status-filter strip (All/Active/Paused/Pending/Ended),
   * a search box, a CSV export button, and a "+ Create campaign" CTA that
   * jumps to the Builder. All of these are intentionally DEFERRED so this
   * first cut stays a thin, honest read-only mirror of the GET endpoint.
   *
   * State machine: loading → (data | empty | error). Each branch renders
   * an honest, non-fake placeholder. No optimistic placeholders, no fake
   * rows.
   *
   * Endpoint: GET /api/v1/portal-admin/campaigns (auth-only — brand comes
   * from the JWT). Response is a BARE ARRAY in normal operation but we
   * also accept `{ campaigns }` / `{ items }` wrapper shapes (the legacy
   * renderer's "Marathon fix" — see portal.html line 5329-5332).
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { listCampaigns } from '@/api/portal-admin/campaigns'
  import type { Campaign } from '@/api/portal-admin/types'
  import { fmtSgd } from '@/utils/format/currency'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const campaigns = ref<Campaign[]>([])

  const pageTitle = computed(() => t('portal.campaigns.title'))
  const pageSubtitle = computed(() => t('portal.campaigns.subtitle'))

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listCampaigns()
      const data = res.data
      // Accept both bare-array and `{ campaigns }` / `{ items }` shapes.
      if (Array.isArray(data)) {
        campaigns.value = data
      } else if (data && typeof data === 'object') {
        campaigns.value = data.campaigns ?? data.items ?? []
      } else {
        campaigns.value = []
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  // Prefer raw numeric `*_sgd` fields formatted client-side, fall back to
  // server-side pre-formatted `*_str` if that's all the backend sent.
  function budgetCell(c: Campaign): string {
    if (typeof c.budget_sgd === 'number') return fmtSgd(c.budget_sgd)
    return c.budget_str ?? '—'
  }

  function spendCell(c: Campaign): string {
    if (typeof c.spend_sgd === 'number') return fmtSgd(c.spend_sgd)
    return c.spend_str ?? fmtSgd(0)
  }

  onMounted(load)
</script>

<template>
  <div class="kix-campaigns p-8 space-y-6">
    <!-- Page header -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- Campaigns list -->
    <section class="space-y-3">
      <div v-if="loading" class="text-gray-400 text-sm py-6 text-center"> Loading campaigns… </div>

      <div v-else-if="error" class="text-red-600 text-sm py-6 text-center">
        Failed to load: {{ error }}
      </div>

      <div v-else-if="campaigns.length === 0" class="text-gray-400 text-sm py-6 text-center">
        No campaigns yet.
      </div>

      <div
        v-else
        class="bg-white border border-gray-200 rounded-xl overflow-hidden"
        data-testid="campaigns-table-card"
      >
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th class="px-4 py-2 font-medium">Status</th>
              <th class="px-4 py-2 font-medium">Name</th>
              <th class="px-4 py-2 font-medium">Objective</th>
              <th class="px-4 py-2 font-medium text-right">Budget</th>
              <th class="px-4 py-2 font-medium text-right">Spend</th>
              <th class="px-4 py-2 font-medium text-right">Impressions</th>
              <th class="px-4 py-2 font-medium text-right">Conversions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="c in campaigns"
              :key="c.id"
              class="border-t border-gray-100 hover:bg-gray-50"
              data-testid="campaign-row"
            >
              <td class="px-4 py-2">
                <span
                  class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="
                    c.status === 'active'
                      ? 'bg-green-50 text-green-700'
                      : c.status === 'paused'
                        ? 'bg-yellow-50 text-yellow-700'
                        : c.status === 'ended'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-gray-50 text-gray-500'
                  "
                  >{{ c.status ?? '—' }}</span
                >
              </td>
              <td class="px-4 py-2 font-medium text-gray-900">{{ c.name }}</td>
              <td class="px-4 py-2 text-gray-600">{{ c.objective ?? '—' }}</td>
              <td class="px-4 py-2 text-right tabular-nums">{{ budgetCell(c) }}</td>
              <td class="px-4 py-2 text-right tabular-nums">{{ spendCell(c) }}</td>
              <td class="px-4 py-2 text-right tabular-nums">{{ c.impressions ?? 0 }}</td>
              <td class="px-4 py-2 text-right tabular-nums">{{ c.conversions ?? 0 }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
