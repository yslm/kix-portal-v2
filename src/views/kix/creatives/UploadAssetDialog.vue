<script setup lang="ts">
  /**
   * UploadAssetDialog — upload a brand asset (legacy kixUploadPrizeImage ~5935
   * → POST /assets/upload, multipart). file + asset_type + name.
   */
  import { ref, computed, watch } from 'vue'
  import { uploadAsset } from '@/api/portal-admin/creatives'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'

  const props = defineProps<{ modelValue: boolean }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; uploaded: [] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  const TYPES = ['logo', 'hero_image', 'thumbnail', 'video', 'gif', 'audio', 'document', 'icon']
  const file = ref<File | null>(null)
  const assetType = ref('hero_image')
  const name = ref('')
  const error = ref<string | null>(null)
  const apiError = ref<string | null>(null)
  const busy = ref(false)

  watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        file.value = null
        assetType.value = 'hero_image'
        name.value = ''
        error.value = null
        apiError.value = null
      }
    }
  )

  function onFile(e: Event) {
    const input = e.target as HTMLInputElement
    file.value = input.files?.[0] ?? null
    if (file.value && !name.value) name.value = file.value.name
  }

  async function upload() {
    error.value = null
    if (!file.value) {
      error.value = 'Choose a file to upload'
      return
    }
    busy.value = true
    apiError.value = null
    try {
      const form = new FormData()
      form.append('file', file.value)
      form.append('brand_id', resolveBrandId())
      form.append('asset_type', assetType.value)
      form.append('name', name.value.trim() || file.value.name)
      await uploadAsset(form)
      emit('uploaded')
      visible.value = false
    } catch (e: unknown) {
      apiError.value = e instanceof Error ? e.message : String(e)
    } finally {
      busy.value = false
    }
  }
</script>

<template>
  <ElDialog v-model="visible" title="Upload asset" width="460px" data-testid="upload-dialog">
    <div class="space-y-4">
      <label class="block">
        <span class="text-sm font-medium text-gray-700">File</span>
        <input
          type="file"
          data-testid="upload-file"
          class="mt-1 block w-full text-sm"
          @change="onFile"
        />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Asset type</span>
        <ElSelect v-model="assetType" class="w-full mt-1" data-testid="upload-type">
          <ElOption v-for="ty in TYPES" :key="ty" :label="ty" :value="ty" />
        </ElSelect>
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Name</span>
        <ElInput v-model="name" data-testid="upload-name" class="mt-1" />
      </label>

      <p v-if="error" data-testid="upload-error" class="text-sm text-amber-700">{{ error }}</p>
      <p v-if="apiError" data-testid="upload-api-error" class="text-sm text-red-600">{{
        apiError
      }}</p>
    </div>

    <template #footer>
      <ElButton data-testid="upload-cancel" @click="visible = false">Cancel</ElButton>
      <ElButton type="primary" :loading="busy" data-testid="upload-submit" @click="upload"
        >Upload</ElButton
      >
    </template>
  </ElDialog>
</template>
