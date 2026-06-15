<script setup lang="ts">
  /**
   * RedemptionTab — look up a voucher by code, then redeem it at the counter
   * (legacy kixCQLookup ~5853 + kixCQRedeem ~5866).
   */
  import { ref } from 'vue'
  import { lookupVoucher, redeemVoucher } from '@/api/portal-admin/rewards'
  import type { VoucherLookup } from '@/api/portal-admin/types'
  import StatusBadge from '@/components/StatusBadge.vue'
  import { isRedeemable, voucherTitle } from './rewardsTabsModel'

  const code = ref('')
  const looking = ref(false)
  const redeeming = ref(false)
  const voucher = ref<VoucherLookup | null>(null)
  const result = ref<{ ok: boolean; text: string } | null>(null)

  async function lookup() {
    if (!code.value.trim()) return
    looking.value = true
    result.value = null
    voucher.value = null
    try {
      const res = await lookupVoucher(code.value.trim())
      voucher.value = res.data
    } catch (e: unknown) {
      result.value = { ok: false, text: e instanceof Error ? e.message : 'Voucher not found' }
    } finally {
      looking.value = false
    }
  }

  async function redeem() {
    if (!voucher.value) return
    redeeming.value = true
    result.value = null
    try {
      const res = await redeemVoucher({
        code: voucher.value.code,
        voucher_id: voucher.value.voucher_id
      })
      if (res.data?.ok) {
        result.value = { ok: true, text: 'Redeemed ✓' }
        voucher.value = { ...voucher.value, status: 'redeemed' }
      } else {
        result.value = { ok: false, text: res.data?.error || 'Redeem failed' }
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      result.value = {
        ok: false,
        text: err?.response?.data?.error || (e instanceof Error ? e.message : 'Redeem failed')
      }
    } finally {
      redeeming.value = false
    }
  }
</script>

<template>
  <div data-testid="rewards-redemption" class="max-w-lg space-y-4">
    <p class="text-sm text-gray-500"
      >Scan or type a voucher code to verify and redeem at the counter.</p
    >
    <div class="flex items-center gap-2">
      <ElInput
        v-model="code"
        placeholder="Voucher code"
        data-testid="redeem-code"
        class="flex-1"
        @keyup.enter="lookup"
      />
      <ElButton :loading="looking" data-testid="redeem-lookup" @click="lookup">Look up</ElButton>
    </div>

    <article v-if="voucher" class="art-card p-4 space-y-2" data-testid="voucher-card">
      <div class="flex items-start justify-between gap-2">
        <h3 class="font-semibold text-gray-900">{{ voucherTitle(voucher) }}</h3>
        <StatusBadge v-if="voucher.status" :status="voucher.status" />
      </div>
      <p class="text-xs text-gray-400">
        Code: <span class="font-mono">{{ voucher.code || voucher.voucher_id }}</span>
        <span v-if="voucher.expires || voucher.expires_at">
          · Expires {{ voucher.expires || voucher.expires_at }}</span
        >
      </p>
      <ElButton
        type="primary"
        :loading="redeeming"
        :disabled="!isRedeemable(voucher)"
        data-testid="redeem-now"
        @click="redeem"
      >
        {{ isRedeemable(voucher) ? 'Redeem now' : 'Not redeemable' }}
      </ElButton>
    </article>

    <p
      v-if="result"
      data-testid="redeem-result"
      class="text-sm"
      :class="result.ok ? 'text-success' : 'text-red-600'"
    >
      {{ result.text }}
    </p>
  </div>
</template>
