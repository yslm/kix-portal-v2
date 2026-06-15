<script setup lang="ts">
  /**
   * NewCaseDialog — create a Case Studio prospect (legacy kixNewCase ~8551
   * → POST /case-studio/prospects). company_name + primary_url + vertical.
   */
  import { ref, computed, watch } from 'vue'
  import { createProspect } from '@/api/portal-admin/cases'

  const props = defineProps<{ modelValue: boolean }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; created: [] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  const VERTICALS = ['fnb', 'qcommerce', 'retail', 'service', 'other']

  const company = ref('')
  const url = ref('')
  const vertical = ref('fnb')
  const tagline = ref('')
  const error = ref<string | null>(null)
  const apiError = ref<string | null>(null)
  const saving = ref(false)

  watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        company.value = ''
        url.value = ''
        vertical.value = 'fnb'
        tagline.value = ''
        error.value = null
        apiError.value = null
      }
    }
  )

  async function save() {
    error.value = null
    if (!company.value.trim()) {
      error.value = 'Company name is required'
      return
    }
    if (!/^https?:\/\//.test(url.value.trim())) {
      error.value = 'A valid http(s) URL is required'
      return
    }
    saving.value = true
    apiError.value = null
    try {
      await createProspect({
        company_name: company.value.trim(),
        primary_url: url.value.trim(),
        vertical: vertical.value,
        tagline: tagline.value.trim()
      })
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
  <ElDialog v-model="visible" title="New case study" width="480px" data-testid="new-case-dialog">
    <div class="space-y-4">
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Company name</span>
        <ElInput v-model="company" data-testid="case-company" class="mt-1" />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Primary URL</span>
        <ElInput v-model="url" placeholder="https://…" data-testid="case-url" class="mt-1" />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Vertical</span>
        <ElSelect v-model="vertical" class="w-full mt-1" data-testid="case-vertical">
          <ElOption v-for="v in VERTICALS" :key="v" :label="v" :value="v" />
        </ElSelect>
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Tagline</span>
        <ElInput v-model="tagline" data-testid="case-tagline" class="mt-1" />
      </label>

      <p v-if="error" data-testid="case-error" class="text-sm text-amber-700">{{ error }}</p>
      <p v-if="apiError" data-testid="case-api-error" class="text-sm text-red-600">{{
        apiError
      }}</p>
    </div>

    <template #footer>
      <ElButton data-testid="case-cancel" @click="visible = false">Cancel</ElButton>
      <ElButton type="primary" :loading="saving" data-testid="case-save" @click="save"
        >Create</ElButton
      >
    </template>
  </ElDialog>
</template>
