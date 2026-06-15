<script setup lang="ts">
  /**
   * AddStoreDialog — register a store/geofence (legacy kixAddLocation ~4748
   * → POST /geofence/stores/register). Name + address + radius. The backend
   * geocodes the address (place_id preferred); we send geocoded_address.
   */
  import { ref, computed, watch } from 'vue'
  import { registerStore } from '@/api/portal-admin/geofences'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'

  const props = defineProps<{ modelValue: boolean }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  const name = ref('')
  const address = ref('')
  const radius = ref(200)
  const error = ref<string | null>(null)
  const apiError = ref<string | null>(null)
  const saving = ref(false)

  watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        name.value = ''
        address.value = ''
        radius.value = 200
        error.value = null
        apiError.value = null
      }
    }
  )

  async function save() {
    error.value = null
    if (!name.value.trim()) {
      error.value = 'Store name is required'
      return
    }
    if (!address.value.trim()) {
      error.value = 'Address is required'
      return
    }
    saving.value = true
    apiError.value = null
    try {
      const brand = resolveBrandId()
      await registerStore({
        brand_id: Number.parseInt(brand, 10) || brand,
        name: name.value.trim(),
        geocoded_address: address.value.trim(),
        radius_meters: Number(radius.value)
      })
      emit('saved')
      visible.value = false
    } catch (e: unknown) {
      apiError.value = e instanceof Error ? e.message : String(e)
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <ElDialog v-model="visible" title="Add store" width="480px" data-testid="add-store-dialog">
    <div class="space-y-4">
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Store name</span>
        <ElInput
          v-model="name"
          placeholder="e.g. Orchard Flagship"
          data-testid="store-name"
          class="mt-1"
        />
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Address</span>
        <ElInput
          v-model="address"
          type="textarea"
          :rows="2"
          placeholder="Street, city, postal code"
          data-testid="store-address"
          class="mt-1"
        />
        <span class="text-xs text-gray-400"
          >We geocode this server-side to centre the geofence.</span
        >
      </label>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Geofence radius: {{ radius }} m</span>
        <ElSlider
          v-model="radius"
          :min="10"
          :max="2000"
          :step="10"
          data-testid="store-radius"
          class="mt-1"
        />
      </label>

      <p v-if="error" data-testid="store-error" class="text-sm text-amber-700">{{ error }}</p>
      <p v-if="apiError" data-testid="store-api-error" class="text-sm text-red-600">{{
        apiError
      }}</p>
    </div>

    <template #footer>
      <ElButton data-testid="store-cancel" @click="visible = false">Cancel</ElButton>
      <ElButton type="primary" :loading="saving" data-testid="store-save" @click="save"
        >Add store</ElButton
      >
    </template>
  </ElDialog>
</template>
