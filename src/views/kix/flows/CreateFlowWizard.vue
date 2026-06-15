<script setup lang="ts">
  /**
   * CreateFlowWizard — the Flows 4-step creation flow.
   *
   * Source: portal.html #view-flows wizard (1559-1722). Rebuilt as an
   * art-design-pro ElDialog:
   *   1. Campaign  — pick a starter template (grid) or start blank → POST /flows
   *   2. Customize — name + start/end dates + read-only step preview → PUT /flows/{id}
   *   3. Simulate  — audience + base-rate → POST /flows/{id}/simulate (funnel + cost)
   *   4. Published — confirmation → emits `created` so the list reloads
   *
   * Backend computes templates / create / update / simulate / publish; the
   * funnel/cards are rendered from its response. Formatting + normalisation
   * live in flowWizardModel.ts (unit-tested).
   */
  import { ref, computed, onBeforeUnmount } from 'vue'
  import {
    listFlowTemplates,
    createFlow,
    updateFlow,
    simulateFlow,
    publishFlow
  } from '@/api/portal-admin/flows'
  import type { FlowTemplate, CampaignFlow, FlowSimulation } from '@/api/portal-admin/types'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'
  import {
    normalizeTemplates,
    funnelBars,
    simCards,
    validateSimInputs,
    publishedSentence,
    DEFAULT_AUDIENCE,
    DEFAULT_BASE_REPEAT_RATE
  } from './flowWizardModel'

  const props = defineProps<{ modelValue: boolean }>()
  const emit = defineEmits<{ 'update:modelValue': [boolean]; created: [] }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  type Step = 1 | 2 | 3 | 4
  const step = ref<Step>(1)
  const error = ref<string | null>(null)
  const busy = ref(false)

  // step 1
  const templates = ref<FlowTemplate[]>([])
  const templatesLoading = ref(false)

  // working flow
  const flow = ref<CampaignFlow | null>(null)
  const name = ref('')
  const startDate = ref('')
  const endDate = ref('')

  // step 3
  const audience = ref(DEFAULT_AUDIENCE)
  const baseRate = ref(DEFAULT_BASE_REPEAT_RATE)
  const sim = ref<FlowSimulation | null>(null)

  const bars = computed(() => funnelBars(sim.value))
  const cards = computed(() => simCards(sim.value))

  function reset() {
    step.value = 1
    error.value = null
    busy.value = false
    flow.value = null
    name.value = ''
    startDate.value = ''
    endDate.value = ''
    audience.value = DEFAULT_AUDIENCE
    baseRate.value = DEFAULT_BASE_REPEAT_RATE
    sim.value = null
  }

  async function open1() {
    templatesLoading.value = true
    error.value = null
    try {
      const res = await listFlowTemplates()
      templates.value = normalizeTemplates(res.data)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      templatesLoading.value = false
    }
  }

  // open templates when the dialog opens
  function onOpen() {
    reset()
    open1()
  }

  async function pick(templateId?: string) {
    busy.value = true
    error.value = null
    try {
      const res = await createFlow(resolveBrandId(), templateId ? { template_id: templateId } : {})
      flow.value = res.data
      name.value = res.data.name ?? ''
      startDate.value = res.data.start_date ?? ''
      endDate.value = res.data.end_date ?? ''
      step.value = 2
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      busy.value = false
    }
  }

  async function toSimulate() {
    if (!flow.value) return
    busy.value = true
    error.value = null
    try {
      const res = await updateFlow(flow.value.flow_id, resolveBrandId(), {
        name: name.value,
        start_date: startDate.value,
        end_date: endDate.value
      })
      flow.value = res.data
      step.value = 3
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      busy.value = false
    }
  }

  async function runSim() {
    if (!flow.value) return
    const v = validateSimInputs(Number(audience.value), Number(baseRate.value))
    if (v) {
      error.value = v
      return
    }
    busy.value = true
    error.value = null
    try {
      const res = await simulateFlow(flow.value.flow_id, resolveBrandId(), {
        audience_size: Number(audience.value),
        base_repeat_rate: Number(baseRate.value),
        start_date: startDate.value,
        end_date: endDate.value
      })
      sim.value = res.data
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      busy.value = false
    }
  }

  async function publish() {
    if (!flow.value) return
    busy.value = true
    error.value = null
    try {
      await publishFlow(flow.value.flow_id, resolveBrandId())
      step.value = 4
      emit('created')
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      busy.value = false
    }
  }

  const publishedMsg = computed(() =>
    publishedSentence(name.value, startDate.value, endDate.value, flow.value?.steps?.length)
  )

  function buildAnother() {
    onOpen()
  }
  function close() {
    visible.value = false
  }

  onBeforeUnmount(() => {})
</script>

<template>
  <ElDialog
    v-model="visible"
    title="Build a campaign flow"
    width="720px"
    :close-on-click-modal="false"
    data-testid="create-flow-wizard"
    @open="onOpen"
  >
    <!-- step rail -->
    <div class="flex items-center gap-2 mb-5 text-xs font-medium" data-testid="flow-steprail">
      <span
        v-for="(s, i) in ['Campaign', 'Customize', 'Simulate', 'Published']"
        :key="i"
        class="px-2.5 py-1 rounded-full"
        :class="
          step === i + 1
            ? 'bg-theme text-white'
            : step > i + 1
              ? 'bg-theme/10 text-theme'
              : 'bg-g-100 text-gray-400'
        "
      >
        {{ i + 1 }} · {{ s }}
      </span>
    </div>

    <p v-if="error" data-testid="flow-error" class="text-red-600 text-sm mb-3">{{ error }}</p>

    <!-- Step 1 · Pick template -->
    <section v-if="step === 1" data-testid="flow-step-1" class="space-y-3">
      <p class="text-sm text-gray-500"
        >Pick a starting campaign — each is a proven multi-step flow you can tune.</p
      >
      <div v-if="templatesLoading" class="text-gray-400 text-sm py-8 text-center"
        >Loading templates…</div
      >
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          v-for="tpl in templates"
          :key="tpl.template_id"
          type="button"
          class="art-card text-left p-4 flex flex-col gap-1.5 transition-transform hover:-translate-y-0.5"
          :data-testid="`flow-template-${tpl.template_id}`"
          :disabled="busy"
          @click="pick(tpl.template_id)"
        >
          <span class="text-2xl">{{ tpl.icon || '🎯' }}</span>
          <span class="font-semibold text-gray-900 leading-tight">{{ tpl.name }}</span>
          <span class="text-xs text-gray-500 line-clamp-2">{{ tpl.summary }}</span>
          <span class="text-[11px] text-gray-400 mt-1">
            {{ tpl.steps_count ?? '?' }} steps · {{ tpl.default_duration_days ?? '?' }} days
          </span>
        </button>
      </div>
      <div class="text-center pt-1">
        <ElButton link type="primary" data-testid="flow-blank" :disabled="busy" @click="pick()">
          Start blank instead →
        </ElButton>
      </div>
    </section>

    <!-- Step 2 · Customize -->
    <section v-else-if="step === 2" data-testid="flow-step-2" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label class="block">
          <span class="text-sm font-medium text-gray-700">Campaign name</span>
          <ElInput v-model="name" data-testid="flow-name" class="mt-1" />
        </label>
        <label class="block">
          <span class="text-sm font-medium text-gray-700">Start date</span>
          <ElInput v-model="startDate" type="date" data-testid="flow-start" class="mt-1" />
        </label>
        <label class="block">
          <span class="text-sm font-medium text-gray-700">End date</span>
          <ElInput v-model="endDate" type="date" data-testid="flow-end" class="mt-1" />
        </label>
      </div>

      <div v-if="flow?.steps?.length" class="art-card p-4" data-testid="flow-step-preview">
        <p class="text-sm font-medium text-gray-700 mb-2">Step preview</p>
        <ol class="space-y-2">
          <li v-for="(s, i) in flow.steps" :key="i" class="flex items-start gap-2 text-sm">
            <span class="shrink-0 size-5 rounded-full flex-cc bg-theme/10 text-theme text-xs">{{
              i + 1
            }}</span>
            <span class="text-gray-600">{{ s.label || s.step_id }}</span>
          </li>
        </ol>
      </div>

      <div class="flex justify-between">
        <ElButton data-testid="flow-back-1" @click="step = 1">← Back</ElButton>
        <ElButton type="primary" :loading="busy" data-testid="flow-to-simulate" @click="toSimulate">
          Simulate →
        </ElButton>
      </div>
    </section>

    <!-- Step 3 · Simulate -->
    <section v-else-if="step === 3" data-testid="flow-step-3" class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label class="block">
          <span class="text-sm font-medium text-gray-700">Audience size</span>
          <ElInput
            v-model.number="audience"
            type="number"
            data-testid="flow-audience"
            class="mt-1"
          />
        </label>
        <label class="block">
          <span class="text-sm font-medium text-gray-700">Current base repeat rate</span>
          <ElInput
            v-model.number="baseRate"
            type="number"
            :step="0.05"
            data-testid="flow-baserate"
            class="mt-1"
          />
        </label>
      </div>
      <ElButton type="primary" :loading="busy" data-testid="flow-run-sim" @click="runSim"
        >Run simulation</ElButton
      >

      <template v-if="sim">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="flow-sim-cards">
          <article v-for="(c, i) in cards" :key="i" class="art-card px-4 py-3">
            <span class="text-xs text-gray-500">{{ c.label }}</span>
            <div class="text-lg font-semibold tabular-nums mt-1">{{ c.value }}</div>
          </article>
        </div>

        <p v-if="sim.summary_sentence" class="text-sm text-gray-600" data-testid="flow-sim-summary">
          {{ sim.summary_sentence }}
        </p>

        <div class="art-card p-4" data-testid="flow-funnel">
          <p class="text-sm font-medium text-gray-700 mb-3">Step-by-step funnel</p>
          <div v-for="(b, i) in bars" :key="i" class="mb-2 last:mb-0">
            <div class="flex justify-between text-xs text-gray-500 mb-0.5">
              <span>{{ b.label }}</span>
              <span class="tabular-nums">{{ b.completers.toLocaleString('en-US') }}</span>
            </div>
            <div class="h-2 bg-g-100 rounded-full overflow-hidden">
              <div class="h-full bg-theme rounded-full" :style="{ width: b.pct + '%' }" />
            </div>
          </div>
        </div>
      </template>

      <div class="flex justify-between">
        <ElButton data-testid="flow-back-2" @click="step = 2">← Back</ElButton>
        <ElButton
          type="primary"
          :loading="busy"
          :disabled="!sim"
          data-testid="flow-publish"
          @click="publish"
        >
          Publish →
        </ElButton>
      </div>
    </section>

    <!-- Step 4 · Published -->
    <section v-else data-testid="flow-step-4" class="space-y-5 py-2 text-center">
      <div class="text-4xl">🚀</div>
      <h3 class="font-semibold text-gray-900 text-lg">Your flow is live</h3>
      <p class="text-sm text-gray-600" data-testid="flow-published-msg">{{ publishedMsg }}</p>
      <div class="flex justify-center gap-2">
        <ElButton data-testid="flow-done" @click="close">← Back to My Flows</ElButton>
        <ElButton type="primary" data-testid="flow-another" @click="buildAnother"
          >+ Build another</ElButton
        >
      </div>
    </section>
  </ElDialog>
</template>
