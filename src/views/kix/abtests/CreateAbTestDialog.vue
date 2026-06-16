<script setup lang="ts">
  /**
   * CreateAbTestDialog — create an A/B test (legacy kixCreateAbTest ~7219
   * → POST /ab-tests). Name + two campaign pickers (loaded live) + metric.
   */
  import { ref, computed, watch } from 'vue'
  import { createAbTest } from '@/api/portal-admin/ab-tests'
  import { listCampaigns } from '@/api/portal-admin/campaigns'
  import type { Campaign, CampaignsListResponse } from '@/api/portal-admin/types'

  const props = defineProps<{ modelValue: boolean }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; created: [] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  const METRICS = ['CTR', 'CPA', 'Conversion', 'Redemption', 'Lift']

  const name = ref('')
  const campaignA = ref('')
  const campaignB = ref('')
  const metric = ref('CTR')
  const campaigns = ref<Campaign[]>([])
  const error = ref<string | null>(null)
  const apiError = ref<string | null>(null)
  const busy = ref(false)

  function normalizeCampaigns(raw: CampaignsListResponse): Campaign[] {
    if (Array.isArray(raw)) return raw
    if (raw && typeof raw === 'object') {
      const d = raw as { campaigns?: Campaign[]; items?: Campaign[] }
      return d.campaigns ?? d.items ?? []
    }
    return []
  }

  async function loadCampaigns() {
    try {
      const res = await listCampaigns()
      campaigns.value = normalizeCampaigns(res.data)
    } catch {
      campaigns.value = []
    }
  }

  watch(
    () => props.modelValue,
    (open) => {
      if (open) {
        name.value = ''
        campaignA.value = ''
        campaignB.value = ''
        metric.value = 'CTR'
        error.value = null
        apiError.value = null
        loadCampaigns()
      }
    },
    { immediate: true }
  )

  async function save() {
    error.value = null
    if (!name.value.trim()) {
      error.value = 'Test name is required'
      return
    }
    if (!campaignA.value || !campaignB.value) {
      error.value = 'Pick both campaigns to compare'
      return
    }
    if (campaignA.value === campaignB.value) {
      error.value = 'Pick two different campaigns'
      return
    }
    busy.value = true
    apiError.value = null
    try {
      await createAbTest({
        name: name.value.trim(),
        campaign_a_id: campaignA.value,
        campaign_b_id: campaignB.value,
        metric: metric.value
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
  <ElDialog v-model="visible" title="New A/B test" width="480px" data-testid="abtest-dialog">
    <div class="space-y-4">
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Test name</span>
        <ElInput v-model="name" data-testid="abt-name" class="mt-1" />
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="text-sm font-medium text-gray-700">Variant A</span>
          <ElSelect
            v-model="campaignA"
            class="w-full mt-1"
            data-testid="abt-a"
            placeholder="Campaign A"
          >
            <ElOption v-for="c in campaigns" :key="c.id" :label="c.name" :value="c.id" />
          </ElSelect>
        </label>
        <label class="block">
          <span class="text-sm font-medium text-gray-700">Variant B</span>
          <ElSelect
            v-model="campaignB"
            class="w-full mt-1"
            data-testid="abt-b"
            placeholder="Campaign B"
          >
            <ElOption v-for="c in campaigns" :key="c.id" :label="c.name" :value="c.id" />
          </ElSelect>
        </label>
      </div>
      <label class="block">
        <span class="text-sm font-medium text-gray-700">Metric</span>
        <ElSelect v-model="metric" class="w-full mt-1" data-testid="abt-metric">
          <ElOption v-for="m in METRICS" :key="m" :label="m" :value="m" />
        </ElSelect>
      </label>

      <p v-if="error" data-testid="abt-error" class="text-sm text-amber-700">{{ error }}</p>
      <p v-if="apiError" data-testid="abt-api-error" class="text-sm text-red-600">{{ apiError }}</p>
    </div>

    <template #footer>
      <ElButton data-testid="abt-cancel" @click="visible = false">Cancel</ElButton>
      <ElButton type="primary" :loading="busy" data-testid="abt-save" @click="save"
        >Create test</ElButton
      >
    </template>
  </ElDialog>
</template>
