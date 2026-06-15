<script setup lang="ts">
  /**
   * IssuanceTab — issued / claimed / redeemed counts per coupon template
   * (legacy kixCQLoadIssuance ~5839 → GET /coupons/issuance-summary).
   */
  import { ref, onMounted } from 'vue'
  import { fetchIssuanceSummary } from '@/api/portal-admin/rewards'
  import type { IssuanceRow } from '@/api/portal-admin/types'
  import { normalizeIssuance } from './rewardsTabsModel'

  const loading = ref(true)
  const error = ref<string | null>(null)
  const rows = ref<IssuanceRow[]>([])

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchIssuanceSummary()
      rows.value = normalizeIssuance(res.data)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<template>
  <div data-testid="rewards-issuance">
    <div v-if="loading" class="text-gray-400 text-sm py-10 text-center">Loading issuance…</div>
    <div
      v-else-if="error"
      data-testid="issuance-error"
      class="text-red-600 text-sm py-10 text-center"
    >
      {{ error }}
    </div>
    <div v-else-if="rows.length === 0" class="text-gray-400 text-sm py-12 text-center">
      No coupons issued yet.
    </div>

    <table v-else class="w-full text-sm" data-testid="issuance-table">
      <thead>
        <tr class="text-left text-gray-500 border-b">
          <th class="py-2 font-medium">Coupon template</th>
          <th class="py-2 font-medium text-right">Issued</th>
          <th class="py-2 font-medium text-right">Claimed</th>
          <th class="py-2 font-medium text-right">Redeemed</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(r, i) in rows"
          :key="i"
          class="border-b last:border-0"
          data-testid="issuance-row"
        >
          <td class="py-2 text-gray-900">{{ r.template_name || `#${r.coupon_template_id}` }}</td>
          <td class="py-2 text-right tabular-nums">{{
            (r.issued ?? 0).toLocaleString('en-US')
          }}</td>
          <td class="py-2 text-right tabular-nums">{{
            (r.claimed ?? 0).toLocaleString('en-US')
          }}</td>
          <td class="py-2 text-right tabular-nums text-success font-medium">
            {{ (r.redeemed ?? 0).toLocaleString('en-US') }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
