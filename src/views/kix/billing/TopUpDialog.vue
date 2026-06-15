<script setup lang="ts">
  /**
   * TopUpDialog — add funds to the wallet (legacy kixTopupWallet ~3722
   * → POST /portal-admin/wallet/topup). Surfaces the 402 KYC gate.
   */
  import { ref, computed, watch } from 'vue'
  import { topupWallet } from '@/api/portal-admin/billing'

  const props = defineProps<{ modelValue: boolean }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; done: [] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  const PRESETS = [50, 100, 250, 500]
  const amount = ref(100)
  const error = ref<string | null>(null)
  const result = ref<{ ok: boolean; text: string } | null>(null)
  const busy = ref(false)

  watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        amount.value = 100
        error.value = null
        result.value = null
      }
    }
  )

  async function topup() {
    error.value = null
    const amt = Number(amount.value)
    if (!Number.isFinite(amt) || amt <= 0 || amt > 10000) {
      error.value = 'Enter an amount between 1 and 10,000'
      return
    }
    busy.value = true
    result.value = null
    try {
      await topupWallet(amt)
      result.value = { ok: true, text: `Topped up S$${amt.toLocaleString('en-US')}` }
      emit('done')
      setTimeout(() => (visible.value = false), 700)
    } catch (e: unknown) {
      const err = e as {
        response?: { status?: number; data?: { detail?: { error?: string; next?: string } } }
      }
      if (err?.response?.status === 402) {
        result.value = { ok: false, text: 'Add a payment method before topping up.' }
        const next = err.response.data?.detail?.next
        if (next && typeof window !== 'undefined') window.location.href = next
      } else {
        result.value = { ok: false, text: e instanceof Error ? e.message : String(e) }
      }
    } finally {
      busy.value = false
    }
  }
</script>

<template>
  <ElDialog v-model="visible" title="Top up wallet" width="420px" data-testid="topup-dialog">
    <div class="space-y-4">
      <div class="flex flex-wrap gap-2">
        <button
          v-for="p in PRESETS"
          :key="p"
          type="button"
          class="px-4 py-2 rounded-lg border text-sm"
          :class="
            amount === p ? 'bg-theme text-white border-theme' : 'border-gray-200 hover:border-theme'
          "
          :data-testid="`topup-preset-${p}`"
          @click="amount = p"
        >
          S${{ p }}
        </button>
      </div>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Amount (SGD)</span>
        <ElInput v-model.number="amount" type="number" data-testid="topup-amount" class="mt-1" />
      </label>
      <p v-if="error" data-testid="topup-error" class="text-sm text-amber-700">{{ error }}</p>
      <p
        v-if="result"
        data-testid="topup-result"
        class="text-sm"
        :class="result.ok ? 'text-success' : 'text-red-600'"
      >
        {{ result.text }}
      </p>
    </div>

    <template #footer>
      <ElButton data-testid="topup-cancel" @click="visible = false">Cancel</ElButton>
      <ElButton type="primary" :loading="busy" data-testid="topup-confirm" @click="topup"
        >Top up</ElButton
      >
    </template>
  </ElDialog>
</template>
