<script setup lang="ts">
  /**
   * PaymentMethodDialog — add a card (legacy kixAddPaymentMethod ~6215
   * → POST /portal/settings/payment-methods/{brand}).
   */
  import { ref, computed, watch } from 'vue'
  import { addPaymentMethod } from '@/api/portal-admin/billing'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'

  const props = defineProps<{ modelValue: boolean }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; added: [] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  const BRANDS = ['visa', 'mastercard', 'amex', 'other']
  const cardBrand = ref('visa')
  const last4 = ref('')
  const holder = ref('')
  const expMonth = ref(1)
  const expYear = ref(2027)
  const setDefault = ref(true)
  const error = ref<string | null>(null)
  const apiError = ref<string | null>(null)
  const busy = ref(false)

  watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        cardBrand.value = 'visa'
        last4.value = ''
        holder.value = ''
        expMonth.value = 1
        expYear.value = 2027
        setDefault.value = true
        error.value = null
        apiError.value = null
      }
    }
  )

  async function save() {
    error.value = null
    if (!/^\d{4}$/.test(last4.value)) {
      error.value = 'Last 4 digits required'
      return
    }
    if (!holder.value.trim()) {
      error.value = 'Cardholder name required'
      return
    }
    busy.value = true
    apiError.value = null
    try {
      await addPaymentMethod(resolveBrandId(), {
        type: 'card',
        brand: cardBrand.value,
        last4: last4.value,
        holder_name: holder.value.trim(),
        exp_month: Number(expMonth.value),
        exp_year: Number(expYear.value),
        set_default: setDefault.value
      })
      emit('added')
      visible.value = false
    } catch (e: unknown) {
      apiError.value = e instanceof Error ? e.message : String(e)
    } finally {
      busy.value = false
    }
  }
</script>

<template>
  <ElDialog v-model="visible" title="Add payment method" width="460px" data-testid="payment-dialog">
    <div class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="text-sm font-medium text-gray-700">Card brand</span>
          <ElSelect v-model="cardBrand" class="w-full mt-1" data-testid="pay-brand">
            <ElOption v-for="b in BRANDS" :key="b" :label="b" :value="b" />
          </ElSelect>
        </label>
        <label class="block">
          <span class="text-sm font-medium text-gray-700">Last 4 digits</span>
          <ElInput v-model="last4" maxlength="4" data-testid="pay-last4" class="mt-1" />
        </label>
      </div>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Cardholder name</span>
        <ElInput v-model="holder" data-testid="pay-holder" class="mt-1" />
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="text-sm font-medium text-gray-700">Exp month</span>
          <ElInputNumber
            v-model="expMonth"
            :min="1"
            :max="12"
            data-testid="pay-month"
            class="mt-1"
          />
        </label>
        <label class="block">
          <span class="text-sm font-medium text-gray-700">Exp year</span>
          <ElInputNumber
            v-model="expYear"
            :min="2026"
            :max="2099"
            data-testid="pay-year"
            class="mt-1"
          />
        </label>
      </div>
      <p v-if="error" data-testid="pay-error" class="text-sm text-amber-700">{{ error }}</p>
      <p v-if="apiError" data-testid="pay-api-error" class="text-sm text-red-600">{{ apiError }}</p>
    </div>

    <template #footer>
      <ElButton data-testid="pay-cancel" @click="visible = false">Cancel</ElButton>
      <ElButton type="primary" :loading="busy" data-testid="pay-save" @click="save"
        >Add card</ElButton
      >
    </template>
  </ElDialog>
</template>
