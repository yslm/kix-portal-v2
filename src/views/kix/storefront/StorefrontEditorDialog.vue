<script setup lang="ts">
  /**
   * StorefrontEditorDialog — edit the public profile
   * (POST /storefront/{brand}/configure, storefront.py ~262). Core fields:
   * display name / bio / brand colour / featured game slugs.
   */
  import { ref, computed, watch } from 'vue'
  import { configureStorefront } from '@/api/portal-admin/storefront'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'
  import type { StorefrontProfile } from '@/api/portal-admin/types'

  const props = defineProps<{ modelValue: boolean; profile: StorefrontProfile | null }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  const displayName = ref('')
  const bio = ref('')
  const brandColor = ref('#00FC00')
  const featured = ref('')
  const error = ref<string | null>(null)
  const apiError = ref<string | null>(null)
  const busy = ref(false)

  watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        const p = props.profile
        displayName.value = p?.display_name ?? ''
        bio.value = p?.bio ?? ''
        brandColor.value = p?.brand_color ?? '#00FC00'
        featured.value = (p?.featured_games ?? []).join(', ')
        error.value = null
        apiError.value = null
      }
    },
    { immediate: true }
  )

  async function save() {
    error.value = null
    if (!displayName.value.trim()) {
      error.value = 'Display name is required'
      return
    }
    busy.value = true
    apiError.value = null
    try {
      await configureStorefront(resolveBrandId(), {
        display_name: displayName.value.trim(),
        bio: bio.value.trim() || null,
        brand_color: brandColor.value,
        featured_games: featured.value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      })
      emit('saved')
      visible.value = false
    } catch (e: unknown) {
      apiError.value = e instanceof Error ? e.message : String(e)
    } finally {
      busy.value = false
    }
  }
</script>

<template>
  <ElDialog v-model="visible" title="Edit storefront" width="480px" data-testid="storefront-editor">
    <div class="space-y-4">
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Display name</span>
        <ElInput v-model="displayName" data-testid="sf-name" class="mt-1" />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Bio</span>
        <ElInput v-model="bio" type="textarea" :rows="2" data-testid="sf-bio" class="mt-1" />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Brand colour</span>
        <div class="flex items-center gap-2 mt-1">
          <input
            type="color"
            v-model="brandColor"
            data-testid="sf-color"
            class="h-9 w-12 rounded border"
          />
          <ElInput v-model="brandColor" class="flex-1" />
        </div>
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Featured game slugs (comma-separated)</span>
        <ElInput v-model="featured" data-testid="sf-featured" class="mt-1" />
      </label>

      <p v-if="error" data-testid="sf-error" class="text-sm text-amber-700">{{ error }}</p>
      <p v-if="apiError" data-testid="sf-api-error" class="text-sm text-red-600">{{ apiError }}</p>
    </div>

    <template #footer>
      <ElButton data-testid="sf-cancel" @click="visible = false">Cancel</ElButton>
      <ElButton type="primary" :loading="busy" data-testid="sf-save" @click="save">Save</ElButton>
    </template>
  </ElDialog>
</template>
