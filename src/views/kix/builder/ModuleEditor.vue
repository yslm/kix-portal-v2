<script setup lang="ts">
  /**
   * ModuleEditor — a generic dialog that renders one Builder module's fields
   * from its `FieldSpec[]` (builderForms.MODULE_FIELDS) and emits the edited
   * values on Save. Field types: select / number / toggle / weekday (7-day
   * mask) / safety (enable toggle + optional threshold).
   *
   * State lives in the parent (Builder.vue); this dialog edits a local copy
   * and only commits on Save, so Cancel discards. Dynamic option lists (the
   * voucher template select, keyed by vertical) are injected via
   * `dynamicOptions`.
   */
  import { ref, computed, watch } from 'vue'
  import { MODULE_FIELDS, type FieldValues, type SelectOption } from './builderForms'
  import type { BuildModuleId } from './builderModel'

  const props = defineProps<{
    modelValue: boolean
    moduleId: BuildModuleId | null
    title: string
    initial: FieldValues
    dynamicOptions?: Record<string, SelectOption[]>
  }>()
  const emit = defineEmits<{
    'update:modelValue': [boolean]
    save: [FieldValues]
    'field-change': [{ field: string; value: unknown }]
  }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  const fields = computed(() => (props.moduleId ? MODULE_FIELDS[props.moduleId] : []))
  const draft = ref<FieldValues>({})

  // Re-seed the local copy whenever the dialog opens for a module.
  watch(
    () => [props.modelValue, props.moduleId] as const,
    ([open]) => {
      if (open) draft.value = JSON.parse(JSON.stringify(props.initial ?? {}))
    },
    { immediate: true }
  )

  const WEEKDAYS = [
    { d: 1, label: 'Mon' },
    { d: 2, label: 'Tue' },
    { d: 3, label: 'Wed' },
    { d: 4, label: 'Thu' },
    { d: 5, label: 'Fri' },
    { d: 6, label: 'Sat' },
    { d: 0, label: 'Sun' }
  ]

  function optionsFor(fieldId: string, fallback?: SelectOption[]): SelectOption[] {
    return props.dynamicOptions?.[fieldId] ?? fallback ?? []
  }

  function setField(id: string, value: unknown) {
    draft.value[id] = value
    emit('field-change', { field: id, value })
  }

  /** Select model-value, typed for ElSelect — kept in a helper so the
   *  template binding has no `|` (eslint reads it as a deprecated filter). */
  function selectModel(id: string): string | number {
    return draft.value[id] as string | number
  }

  function toggleDay(d: number) {
    const mask = (draft.value.weekday_mask as number[]) ?? []
    draft.value.weekday_mask = mask.includes(d) ? mask.filter((x) => x !== d) : [...mask, d]
  }

  function dayActive(d: number) {
    return ((draft.value.weekday_mask as number[]) ?? []).includes(d)
  }

  // safety helpers — each safety field is { enabled, threshold? }
  function safety(id: string): { enabled?: boolean; threshold?: number } {
    return (draft.value[id] as { enabled?: boolean; threshold?: number }) ?? {}
  }
  function setSafetyEnabled(id: string, enabled: boolean) {
    draft.value[id] = { ...safety(id), enabled }
  }
  function setSafetyThreshold(id: string, threshold: number) {
    draft.value[id] = { ...safety(id), threshold }
  }

  function save() {
    emit('save', JSON.parse(JSON.stringify(draft.value)))
    visible.value = false
  }
</script>

<template>
  <ElDialog v-model="visible" :title="title" width="520px" data-testid="module-editor">
    <div class="space-y-4">
      <div v-for="f in fields" :key="f.id" data-testid="editor-field">
        <label class="block text-sm font-medium text-gray-700 mb-1">{{ f.label }}</label>

        <!-- select -->
        <ElSelect
          v-if="f.type === 'select'"
          :model-value="selectModel(f.id)"
          class="w-full"
          :data-testid="`field-${f.id}`"
          @update:model-value="(v: string | number | boolean) => setField(f.id, v)"
        >
          <ElOption
            v-for="o in optionsFor(f.id, f.options)"
            :key="String(o.value)"
            :label="o.label"
            :value="o.value"
          />
        </ElSelect>

        <!-- number -->
        <div v-else-if="f.type === 'number'" class="flex items-center gap-2">
          <ElInputNumber
            :model-value="draft[f.id] as number"
            :min="f.min"
            :max="f.max"
            :data-testid="`field-${f.id}`"
            @update:model-value="(v: number | undefined) => setField(f.id, v ?? f.min ?? 0)"
          />
          <span v-if="f.suffix" class="text-xs text-gray-400">{{ f.suffix }}</span>
        </div>

        <!-- toggle -->
        <ElSwitch
          v-else-if="f.type === 'toggle'"
          :model-value="Boolean(draft[f.id])"
          :data-testid="`field-${f.id}`"
          @update:model-value="(v: string | number | boolean) => setField(f.id, Boolean(v))"
        />

        <!-- weekday mask -->
        <div
          v-else-if="f.type === 'weekday'"
          class="flex flex-wrap gap-2"
          :data-testid="`field-${f.id}`"
        >
          <button
            v-for="w in WEEKDAYS"
            :key="w.d"
            type="button"
            class="px-3 py-1.5 rounded-lg text-sm border transition-colors"
            :class="
              dayActive(w.d)
                ? 'bg-theme text-white border-theme'
                : 'bg-white text-gray-600 border-gray-200 hover:border-theme'
            "
            :data-testid="`dow-${w.d}`"
            @click="toggleDay(w.d)"
          >
            {{ w.label }}
          </button>
        </div>

        <!-- safety rule: enable + optional threshold -->
        <div
          v-else-if="f.type === 'safety'"
          class="flex items-center gap-3"
          :data-testid="`field-${f.id}`"
        >
          <ElSwitch
            :model-value="Boolean(safety(f.id).enabled)"
            :data-testid="`safety-toggle-${f.id}`"
            @update:model-value="
              (v: string | number | boolean) => setSafetyEnabled(f.id, Boolean(v))
            "
          />
          <ElInputNumber
            v-if="f.min !== undefined && safety(f.id).enabled"
            :model-value="safety(f.id).threshold"
            :min="f.min"
            :max="f.max"
            size="small"
            :data-testid="`safety-threshold-${f.id}`"
            @update:model-value="
              (v: number | undefined) => setSafetyThreshold(f.id, v ?? f.min ?? 0)
            "
          />
          <span v-if="f.suffix && safety(f.id).enabled" class="text-xs text-gray-400">{{
            f.suffix
          }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <ElButton data-testid="editor-cancel" @click="visible = false">Cancel</ElButton>
      <ElButton type="primary" data-testid="editor-save" @click="save">Save</ElButton>
    </template>
  </ElDialog>
</template>
