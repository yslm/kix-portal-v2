<script setup lang="ts">
  /**
   * TierEditorDialog — edit the full VIP tier ladder and PUT it
   * (legacy kixSaveVipTiers ~4165 → PUT /loyalty-tiers). Add/remove rows,
   * edit name/min_xp/perk; validated against the backend guard before save.
   */
  import { ref, computed, watch } from 'vue'
  import { saveLoyaltyTiers } from '@/api/portal-admin/vip-tiers'
  import { validateTiers, type EditableTier } from './vipTiersModel'

  const props = defineProps<{ modelValue: boolean; tiers: EditableTier[] }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  const rows = ref<EditableTier[]>([])
  const errors = ref<string[]>([])
  const apiError = ref<string | null>(null)
  const saving = ref(false)

  watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        rows.value = (
          props.tiers.length ? props.tiers : [{ name: 'Bronze', min_xp: 0, perk: '' }]
        ).map((t) => ({ name: t.name, min_xp: Number(t.min_xp) || 0, perk: t.perk ?? '' }))
        errors.value = []
        apiError.value = null
      }
    },
    { immediate: true }
  )

  function addRow() {
    const last = rows.value[rows.value.length - 1]
    rows.value.push({ name: '', min_xp: (Number(last?.min_xp) || 0) + 500, perk: '' })
  }
  function removeRow(i: number) {
    rows.value.splice(i, 1)
  }

  async function save() {
    errors.value = validateTiers(rows.value)
    if (errors.value.length) return
    saving.value = true
    apiError.value = null
    try {
      await saveLoyaltyTiers(
        rows.value.map((t) => ({
          name: t.name.trim(),
          min_xp: Number(t.min_xp),
          perk: t.perk.trim()
        }))
      )
      emit('saved')
      visible.value = false
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      apiError.value = err?.response?.data?.detail || (e instanceof Error ? e.message : String(e))
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <ElDialog v-model="visible" title="Edit tier ladder" width="640px" data-testid="tier-editor">
    <div class="space-y-2">
      <div v-for="(row, i) in rows" :key="i" class="flex items-center gap-2" data-testid="tier-row">
        <ElInput
          v-model="row.name"
          placeholder="Tier name"
          class="w-40"
          :data-testid="`tier-name-${i}`"
        />
        <ElInputNumber v-model="row.min_xp" :min="0" :data-testid="`tier-xp-${i}`" />
        <ElInput
          v-model="row.perk"
          placeholder="Perk"
          class="flex-1"
          :data-testid="`tier-perk-${i}`"
        />
        <button
          class="text-gray-300 hover:text-red-500 px-1"
          :data-testid="`tier-remove-${i}`"
          @click="removeRow(i)"
        >
          ✕
        </button>
      </div>
      <ElButton link type="primary" data-testid="tier-add" @click="addRow">+ Add tier</ElButton>

      <ul
        v-if="errors.length"
        data-testid="tier-errors"
        class="text-sm text-amber-700 list-disc pl-5"
      >
        <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
      </ul>
      <p v-if="apiError" data-testid="tier-api-error" class="text-sm text-red-600">{{
        apiError
      }}</p>
    </div>

    <template #footer>
      <ElButton data-testid="tier-cancel" @click="visible = false">Cancel</ElButton>
      <ElButton type="primary" :loading="saving" data-testid="tier-save" @click="save"
        >Save tiers</ElButton
      >
    </template>
  </ElDialog>
</template>
