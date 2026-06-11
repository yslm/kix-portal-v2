<script setup lang="ts">
  import { ref, onMounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { listBrandGames } from '@/api/portal-admin/games'

  const route = useRoute()
  const viewName = String(route.meta?.title ?? route.name ?? 'unknown')
  const legacyId = String(route.meta?.legacyViewId ?? '')

  const apiState = ref<{ loading: boolean; ok?: boolean; payload?: unknown; error?: string }>({
    loading: false
  })

  onMounted(async () => {
    if (legacyId !== 'view-games') return
    apiState.value = { loading: true }
    try {
      const brand = new URLSearchParams(window.location.search).get('brand') ?? 'demo'
      // kixHttp returns AxiosResponse<T> — raw JSON lives in res.data (no envelope unwrap).
      const res = await listBrandGames(brand)
      apiState.value = { loading: false, ok: true, payload: res.data }
    } catch (e: any) {
      apiState.value = { loading: false, ok: false, error: e?.message ?? String(e) }
    }
  })
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

      <div v-if="legacyId === 'view-games'" class="mt-6">
        <el-divider />
        <h3 class="font-semibold mb-2">Week 1 API smoke</h3>
        <p v-if="apiState.loading">Calling listBrandGames…</p>
        <p v-else-if="apiState.ok" class="text-green-600">
          OK — response received. Top-level keys:
          <code>{{ Object.keys((apiState.payload as object) || {}).join(', ') || '(empty)' }}</code>
        </p>
        <p v-else-if="apiState.ok === false" class="text-red-600">
          FAILED — {{ apiState.error }}
        </p>
      </div>
    </el-card>
  </div>
</template>
