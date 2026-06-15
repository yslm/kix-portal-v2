<script setup lang="ts">
  /**
   * NewTemplateDialog — create a reward template (legacy kixCreatePrize ~5958
   * → POST /coupon-templates). Conditional fields per offer_type.
   */
  import { ref, computed, watch } from 'vue'
  import { createRewardTemplate } from '@/api/portal-admin/rewards'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'
  import {
    blankTemplateForm,
    buildCreateBody,
    validateCreateTemplate,
    OFFER_TYPE_OPTIONS,
    type TemplateForm
  } from './rewardsTabsModel'

  const props = defineProps<{ modelValue: boolean }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; created: [] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  const form = ref<TemplateForm>(blankTemplateForm())
  const errors = ref<string[]>([])
  const saving = ref(false)
  const apiError = ref<string | null>(null)

  watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        form.value = blankTemplateForm()
        errors.value = []
        apiError.value = null
      }
    }
  )

  async function submit() {
    errors.value = validateCreateTemplate(form.value)
    if (errors.value.length) return
    saving.value = true
    apiError.value = null
    try {
      await createRewardTemplate(buildCreateBody(form.value, resolveBrandId()))
      emit('created')
      visible.value = false
    } catch (e: unknown) {
      apiError.value = e instanceof Error ? e.message : String(e)
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <ElDialog
    v-model="visible"
    title="New reward template"
    width="520px"
    data-testid="new-template-dialog"
  >
    <div class="space-y-4">
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Name</span>
        <ElInput v-model="form.name" data-testid="tpl-name" class="mt-1" />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Description</span>
        <ElInput
          v-model="form.description"
          type="textarea"
          :rows="2"
          data-testid="tpl-desc"
          class="mt-1"
        />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Offer type</span>
        <ElSelect v-model="form.offer_type" class="w-full mt-1" data-testid="tpl-offer">
          <ElOption
            v-for="o in OFFER_TYPE_OPTIONS"
            :key="o.value"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>
      </label>

      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="text-sm font-medium text-gray-700">Original price (SGD)</span>
          <ElInput
            v-model="form.original_price"
            type="number"
            data-testid="tpl-orig"
            class="mt-1"
          />
        </label>
        <label v-if="form.offer_type === 'percent_off'" class="block">
          <span class="text-sm font-medium text-gray-700">Discount %</span>
          <ElInput
            v-model="form.discount_percent"
            type="number"
            data-testid="tpl-discount"
            class="mt-1"
          />
        </label>
        <label v-if="form.offer_type === 'fixed_price'" class="block">
          <span class="text-sm font-medium text-gray-700">Final price (SGD)</span>
          <ElInput v-model="form.final_price" type="number" data-testid="tpl-final" class="mt-1" />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="text-sm font-medium text-gray-700">Inventory</span>
          <ElInput
            v-model="form.inventory_count"
            type="number"
            data-testid="tpl-inv"
            class="mt-1"
          />
        </label>
        <label class="block">
          <span class="text-sm font-medium text-gray-700">Expires on</span>
          <ElInput v-model="form.expires_on" type="date" data-testid="tpl-expires" class="mt-1" />
        </label>
      </div>

      <ul
        v-if="errors.length"
        data-testid="tpl-errors"
        class="text-sm text-amber-700 list-disc pl-5"
      >
        <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
      </ul>
      <p v-if="apiError" data-testid="tpl-api-error" class="text-sm text-red-600">{{ apiError }}</p>
    </div>

    <template #footer>
      <ElButton data-testid="tpl-cancel" @click="visible = false">Cancel</ElButton>
      <ElButton type="primary" :loading="saving" data-testid="tpl-submit" @click="submit"
        >Create</ElButton
      >
    </template>
  </ElDialog>
</template>
