<script setup lang="ts">
  /**
   * StatusBadge — shared status pill for KiX portal list/detail views.
   *
   * Extracted in Plan 4 Task 0 after Plan 3 review noted that
   * `Campaigns.vue` + `Games.vue` both rendered status inline with
   * duplicated color-class maps. Upcoming P1 views (Flows, Rules,
   * A/B Tests, …) will display the same pill, so we centralise the
   * mapping before duplication compounds.
   *
   * Behaviour:
   *  - Known status → mapped colour pair (green / amber / gray / red).
   *  - Unknown but truthy status → falls back to gray pill (safe default).
   *  - Undefined / empty → em-dash placeholder (matches legacy convention
   *    used by `c.status ?? '—'` in Campaigns).
   */
  import { computed } from 'vue'

  const props = defineProps<{
    status?: string
  }>()

  const STATUS_STYLES: Record<string, string> = {
    active: 'bg-green-50 text-green-700',
    running: 'bg-green-50 text-green-700',
    passing: 'bg-green-50 text-green-700',
    paused: 'bg-amber-50 text-amber-700',
    pending: 'bg-amber-50 text-amber-700',
    draft: 'bg-gray-50 text-gray-500',
    inactive: 'bg-gray-50 text-gray-500',
    ended: 'bg-red-50 text-red-700',
    failed: 'bg-red-50 text-red-700',
    error: 'bg-red-50 text-red-700'
  }

  const colorClasses = computed(() =>
    props.status && STATUS_STYLES[props.status]
      ? STATUS_STYLES[props.status]
      : 'bg-gray-50 text-gray-500'
  )
</script>

<template>
  <span v-if="!status" class="text-gray-400">—</span>
  <span v-else class="text-xs px-2 py-0.5 rounded-full inline-block" :class="colorClasses">
    {{ status }}
  </span>
</template>
