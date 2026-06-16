<script setup lang="ts">
  /**
   * NewAudienceDialog — create an audience (legacy kixCreateAudience ~6903
   * → POST /portal/settings/audiences/{brand}). name + source + description.
   */
  import { ref, computed, watch } from 'vue'
  import { createAudience } from '@/api/portal-admin/audiences'

  const props = defineProps<{ modelValue: boolean }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; created: [] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  const SOURCES = [
    { value: 'custom', label: 'Custom list' },
    { value: 'filter', label: 'Filter / segment' }
  ]

  const name = ref('')
  const source = ref('custom')
  const description = ref('')
  const error = ref<string | null>(null)
  const apiError = ref<string | null>(null)
  const busy = ref(false)

  watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        name.value = ''
        source.value = 'custom'
        description.value = ''
        error.value = null
        apiError.value = null
      }
    }
  )

  async function save() {
    error.value = null
    if (!name.value.trim()) {
      error.value = 'Audience name is required'
      return
    }
    busy.value = true
    apiError.value = null
    try {
      await createAudience({
        name: name.value.trim(),
        source: source.value,
        description: description.value.trim() || null
      })
      emit('created')
      visible.value = false
    } catch (e: unknown) {
      apiError.value = e instanceof Error ? e.message : String(e)
    } finally {
      busy.value = false
    }
  }
</script>

<template>
  <ElDialog v-model="visible" title="New audience" width="460px" data-testid="new-audience-dialog">
    <div class="space-y-4">
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Name</span>
        <ElInput v-model="name" data-testid="aud-name" class="mt-1" />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Source</span>
        <ElSelect v-model="source" class="w-full mt-1" data-testid="aud-source">
          <ElOption v-for="s in SOURCES" :key="s.value" :label="s.label" :value="s.value" />
        </ElSelect>
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Description</span>
        <ElInput
          v-model="description"
          type="textarea"
          :rows="2"
          data-testid="aud-desc"
          class="mt-1"
        />
      </label>

      <p v-if="error" data-testid="aud-error" class="text-sm text-amber-700">{{ error }}</p>
      <p v-if="apiError" data-testid="aud-api-error" class="text-sm text-red-600">{{ apiError }}</p>
    </div>

    <template #footer>
      <ElButton data-testid="aud-cancel" @click="visible = false">Cancel</ElButton>
      <ElButton type="primary" :loading="busy" data-testid="aud-save" @click="save"
        >Create</ElButton
      >
    </template>
  </ElDialog>
</template>
