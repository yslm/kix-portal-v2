<script setup lang="ts">
  import { useRoute } from 'vue-router'
  const route = useRoute()
  const viewName = String(route.meta?.title ?? route.name ?? 'unknown')
</script>

<template>
  <div class="p-8">
    <el-card>
      <template #header>
        <span class="text-lg font-semibold">{{ viewName }}</span>
      </template>
      <p class="text-gray-500"> This view is a placeholder. Implementation lands in Week 2-7. </p>
      <p class="mt-4 text-sm text-gray-400">
        Route: <code>{{ route.fullPath }}</code>
      </p>
    </el-card>
  </div>
</template>
