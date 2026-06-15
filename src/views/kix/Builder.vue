<script setup lang="ts">
  /**
   * Builder view — entry surface + the 6 module sub-forms + publish.
   *
   * Source: portal.html #view-builder (846-1190). The opportunity-score hero
   * (big score + bar + hints) and the 6 build-block cards land from the
   * Week 8o entry rebuild; this increment ships the deferred FEATURE:
   *
   *  - each block opens a ModuleEditor dialog with its real fields
   *    (game / voucher / rule / schedule / safety / tournament)
   *  - saving a module re-scores live (POST /builder/opportunity-score with
   *    the assembled cfg) and snapshots a per-brand draft to localStorage
   *  - "Save draft" persists; "Publish" validates, configures rule + schedule
   *    server-side, then POSTs /builder/publish — handling the KYC 403 gate
   *    and navigating to Campaigns on success.
   *
   * Pure logic (field specs, collectors, cfg/publish assembly, validation,
   * draft persistence) lives in builder/builderForms.ts (unit-tested).
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import {
    fetchOpportunityScore,
    fetchVoucherTemplates,
    configureRule,
    configureSchedule,
    publishCampaign
  } from '@/api/portal-admin/builder'
  import type { OpportunityScore, VoucherTemplate } from '@/api/portal-admin/types'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'
  import { BUILD_MODULES, scoreTone, potentialGain, scorePct } from './builder/builderModel'
  import type { BuildModuleId } from './builder/builderModel'
  import {
    defaultState,
    loadDraft,
    saveDraft,
    isConfigured,
    assembleScoreCfg,
    assemblePublishBody,
    validatePublish,
    collectRule,
    collectSchedule,
    type BuilderState,
    type FieldValues,
    type SelectOption
  } from './builder/builderForms'
  import ModuleEditor from './builder/ModuleEditor.vue'

  const { t } = useI18n()
  const router = useRouter()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const opp = ref<OpportunityScore | null>(null)

  const state = ref<BuilderState>(loadDraft(resolveBrandId()) ?? defaultState())

  // editor dialog
  const editorOpen = ref(false)
  const editingModule = ref<BuildModuleId | null>(null)
  const voucherTemplates = ref<SelectOption[]>([])

  // publish state
  const publishing = ref(false)
  const publishResult = ref<{ ok: boolean; text: string } | null>(null)
  const validationErrors = ref<string[]>([])

  const score = computed(() => opp.value?.score ?? 0)
  const pct = computed(() => scorePct(score.value))
  const tone = computed(() => scoreTone(score.value))
  const gain = computed(() => potentialGain(opp.value))

  const toneClass = computed(() =>
    tone.value === 'high' ? 'text-success' : tone.value === 'mid' ? 'text-theme' : 'text-danger'
  )
  const barClass = computed(() =>
    tone.value === 'high' ? 'bg-success' : tone.value === 'mid' ? 'bg-theme' : 'bg-danger'
  )

  const editorTitle = computed(() => {
    const m = BUILD_MODULES.find((b) => b.id === editingModule.value)
    return m ? t(m.i18nKey) : ''
  })
  const editorInitial = computed<FieldValues>(() =>
    editingModule.value ? state.value[editingModule.value] : {}
  )
  const dynamicOptions = computed(() => ({ template_id: voucherTemplates.value }))

  async function rescore() {
    try {
      const res = await fetchOpportunityScore(assembleScoreCfg(state.value))
      opp.value = res.data
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchOpportunityScore(assembleScoreCfg(state.value))
      opp.value = res.data
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
    loadVoucherTemplates(String(state.value.voucher.vertical ?? 'bubble_tea'))
  }

  async function loadVoucherTemplates(vertical: string) {
    try {
      const res = await fetchVoucherTemplates(vertical)
      const list = res.data?.templates ?? res.data?.items ?? []
      voucherTemplates.value = list.map((tpl: VoucherTemplate) => ({
        value: tpl.id,
        label: tpl.label || tpl.label_zh_sg || tpl.id
      }))
      // auto-select the backend default when none chosen yet (legacy as_default)
      const def = list.find((tpl) => tpl.is_default) ?? list[0]
      if (def && !state.value.voucher.template_id) state.value.voucher.template_id = def.id
    } catch {
      voucherTemplates.value = []
    }
  }

  function openModule(id: BuildModuleId) {
    editingModule.value = id
    editorOpen.value = true
  }

  function onFieldChange({ field, value }: { field: string; value: unknown }) {
    // refetch voucher templates when the vertical changes inside the editor
    if (editingModule.value === 'voucher' && field === 'vertical') {
      loadVoucherTemplates(String(value))
    }
  }

  function onModuleSave(values: FieldValues) {
    if (!editingModule.value) return
    state.value[editingModule.value] = values
    saveDraft(resolveBrandId(), state.value)
    publishResult.value = null
    validationErrors.value = []
    rescore()
  }

  function configured(id: BuildModuleId) {
    return isConfigured(id, state.value)
  }

  function onSaveDraft() {
    saveDraft(resolveBrandId(), state.value)
    publishResult.value = { ok: true, text: 'Draft saved on this device.' }
  }

  async function onPublish() {
    validationErrors.value = validatePublish(state.value)
    if (validationErrors.value.length > 0) return

    publishing.value = true
    publishResult.value = null
    const brand = resolveBrandId()
    try {
      // rule + schedule are read server-side at publish — persist them first
      await configureRule({ brand_id: brand, ...collectRule(state.value.rule) })
      await configureSchedule({ brand_id: brand, ...collectSchedule(state.value.schedule) })
      const name = `Campaign · ${new Date().toISOString().slice(0, 10)}`
      const res = await publishCampaign(assemblePublishBody(brand, name, state.value))
      const data = res.data
      if (data?.ok) {
        publishResult.value = { ok: true, text: `Published · ${data.campaign?.id ?? ''}` }
        setTimeout(() => router.push('/campaigns'), 800)
      } else {
        publishResult.value = { ok: false, text: data?.error || 'Publish failed.' }
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string; next?: string } } }
      if (err?.response?.status === 403 && err.response.data?.error === 'kyc_required') {
        publishResult.value = { ok: false, text: 'Add a payment method to publish.' }
        const next = err.response.data?.next
        if (next && typeof window !== 'undefined') window.location.href = next
      } else {
        publishResult.value = { ok: false, text: e instanceof Error ? e.message : String(e) }
      }
    } finally {
      publishing.value = false
    }
  }

  onMounted(load)
</script>

<template>
  <div class="kix-builder p-5 space-y-5">
    <header class="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-2xl font-bold">{{ t('portal.builder.title') }}</h1>
        <p class="text-sm text-gray-500 mt-1">{{ t('portal.builder.sub') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <ElButton data-testid="builder-save-draft" @click="onSaveDraft">Save draft</ElButton>
        <ElButton
          type="primary"
          :loading="publishing"
          data-testid="builder-publish"
          @click="onPublish"
        >
          Publish campaign
        </ElButton>
      </div>
    </header>

    <!-- publish feedback -->
    <div
      v-if="publishResult"
      data-testid="publish-result"
      class="text-sm rounded-lg px-3 py-2"
      :class="publishResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'"
    >
      {{ publishResult.ok ? '✓' : '⚠' }} {{ publishResult.text }}
    </div>
    <ul
      v-if="validationErrors.length"
      data-testid="publish-errors"
      class="text-sm rounded-lg px-3 py-2 bg-amber-50 text-amber-700 list-disc pl-6"
    >
      <li v-for="(e, i) in validationErrors" :key="i">{{ e }}</li>
    </ul>

    <!-- Opportunity-score hero card -->
    <div
      v-if="loading"
      data-testid="opp-score-loading"
      class="text-gray-400 text-sm py-10 text-center"
    >
      Loading opportunity score…
    </div>
    <div
      v-else-if="error"
      data-testid="opp-score-error"
      class="text-red-600 text-sm py-10 text-center"
    >
      Failed to load opportunity score: {{ error }}
    </div>

    <ElCard v-else-if="opp" shadow="never" data-testid="opp-score-card">
      <div class="flex flex-col md:flex-row md:items-center gap-6">
        <div class="shrink-0 md:w-64">
          <div class="text-xs font-bold tracking-wider uppercase text-gray-500 mb-1">
            {{ t('portal.builder.opp.label') }}
          </div>
          <div class="flex items-end gap-1 leading-none">
            <span
              class="text-5xl font-extrabold tabular-nums"
              :class="toneClass"
              data-testid="opp-score-val"
              >{{ score }}</span
            >
            <span class="text-base font-semibold text-gray-400 mb-1">/100</span>
          </div>
          <div class="mt-3 h-2 w-full bg-g-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="barClass"
              :style="{ width: pct + '%' }"
            />
          </div>
          <div v-if="gain > 0" class="text-xs text-gray-400 mt-2">
            <span class="text-success font-semibold">+{{ gain }}</span> potential from the tips →
          </div>
        </div>

        <ul
          v-if="opp.hints && opp.hints.length > 0"
          class="flex-1 list-none p-0 m-0 space-y-2"
          data-testid="opp-score-hints"
        >
          <li
            v-for="(h, i) in opp.hints"
            :key="i"
            class="flex items-start gap-2 text-sm text-gray-600"
          >
            <span
              class="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded bg-success/10 text-success tabular-nums"
              >+{{ h.points }}</span
            >
            <span>{{ h.label }}</span>
          </li>
        </ul>
        <div
          v-else
          class="flex-1 text-sm text-success font-semibold flex items-center"
          data-testid="opp-score-good"
        >
          {{ t('portal.builder.opp.good') }}
        </div>
      </div>
    </ElCard>

    <!-- Build blocks -->
    <ElCard shadow="never">
      <template #header>
        <span class="font-semibold text-gray-900">Build blocks</span>
      </template>
      <div
        class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
        data-testid="module-gallery"
      >
        <button
          v-for="m in BUILD_MODULES"
          :key="m.id"
          type="button"
          class="art-card relative flex flex-col items-center gap-3 px-3 py-5 transition-transform duration-200 hover:-translate-y-0.5"
          :data-testid="`module-${m.id}`"
          @click="openModule(m.id)"
        >
          <span
            v-if="configured(m.id)"
            class="absolute top-2 right-2 size-4 rounded-full flex-cc bg-success text-white text-[10px]"
            :data-testid="`module-done-${m.id}`"
            >✓</span
          >
          <div class="size-12 rounded-xl flex-cc bg-theme/10">
            <ArtSvgIcon :icon="m.icon" class="text-xl text-theme" />
          </div>
          <span class="text-sm font-medium text-gray-900 text-center">{{ t(m.i18nKey) }}</span>
        </button>
      </div>
    </ElCard>

    <ModuleEditor
      v-model="editorOpen"
      :module-id="editingModule"
      :title="editorTitle"
      :initial="editorInitial"
      :dynamic-options="dynamicOptions"
      @save="onModuleSave"
      @field-change="onFieldChange"
    />
  </div>
</template>
