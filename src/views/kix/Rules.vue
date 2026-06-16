<script setup lang="ts">
  /**
   * Rules (Automations) view — rebuilt onto art-design-pro components
   * (Week 8). Source: portal.html #view-rules (lines 1933-1955). Native
   * `ArtTable` + KPI strip + state filter + search. Logic in
   * `rules/rulesModel.ts`. Endpoint: GET /api/v1/portal-admin/automations
   * (brand from JWT). Real fields: id / name / state / condition / action
   * / scope / last_triggered_at. The per-row On/Off toggle (PATCH
   * /automations/<id>/state) is now live; create/edit/delete have no backend
   * (rules are configured via the Builder rule module). Audit log + dry-run
   * builder remain deferred.
   */
  import { computed, h, onMounted, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { ElSwitch, ElMessage } from 'element-plus'
  import { listRules, setRuleState } from '@/api/portal-admin/rules'
  import type { Rule } from '@/api/portal-admin/types'
  import type { ColumnOption } from '@/types/component'
  import StatusBadge from '@/components/StatusBadge.vue'
  import {
    normalizeRules,
    ruleKpis,
    filterRules,
    RULE_FILTERS,
    type RuleFilterKey
  } from './rules/rulesModel'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const all = ref<Rule[]>([])
  const stateFilter = ref<RuleFilterKey>('all')
  const query = ref('')
  const pagination = ref({ current: 1, size: 10, total: 0 })

  const filtered = computed(() =>
    filterRules(all.value, { state: stateFilter.value, query: query.value })
  )
  const paged = computed(() => {
    const s = (pagination.value.current - 1) * pagination.value.size
    return filtered.value.slice(s, s + pagination.value.size)
  })
  watch(
    filtered,
    (rows) => {
      pagination.value.total = rows.length
      pagination.value.current = 1
    },
    { immediate: true }
  )

  const kpis = computed(() => ruleKpis(all.value))
  const kpiCards = computed(() => [
    { icon: 'ri:flow-chart', label: 'Total rules', value: kpis.value.total },
    { icon: 'ri:toggle-line', label: 'On', value: kpis.value.on },
    { icon: 'ri:pause-circle-line', label: 'Off', value: kpis.value.off },
    { icon: 'ri:notification-3-line', label: 'Notify only', value: kpis.value.notifyOnly }
  ])

  const toggling = ref<Set<string>>(new Set())

  async function toggle(r: Rule, on: boolean) {
    if (!r.id) return
    const prev = r.state
    r.state = on ? 'on' : 'off' // optimistic
    toggling.value.add(r.id)
    try {
      await setRuleState(r.id, on ? 'on' : 'off')
    } catch (e: unknown) {
      r.state = prev // revert
      ElMessage.error(e instanceof Error ? e.message : 'Failed to update rule')
    } finally {
      toggling.value.delete(r.id)
    }
  }

  const columns = computed<ColumnOption<Rule>[]>(() => [
    {
      prop: 'state',
      label: 'State',
      width: 120,
      formatter: (r: Rule) =>
        r.state === 'notify_only'
          ? h(StatusBadge, { status: r.state })
          : h(ElSwitch, {
              modelValue: r.state === 'on',
              loading: r.id ? toggling.value.has(r.id) : false,
              'onUpdate:modelValue': (v: string | number | boolean) => toggle(r, Boolean(v))
            })
    },
    {
      prop: 'name',
      label: 'Rule',
      minWidth: 160,
      formatter: (r: Rule) => h('span', { class: 'font-medium text-gray-900' }, r.name ?? '—')
    },
    {
      prop: 'condition',
      label: 'Condition',
      minWidth: 160,
      formatter: (r: Rule) =>
        h('span', { class: 'text-sm text-gray-600 font-mono' }, r.condition ?? '—')
    },
    { prop: 'action', label: 'Action', width: 110, formatter: (r: Rule) => r.action ?? '—' },
    { prop: 'scope', label: 'Scope', width: 140, formatter: (r: Rule) => r.scope ?? '—' },
    {
      prop: 'last_triggered_at',
      label: 'Last triggered',
      width: 140,
      formatter: (r: Rule) => r.last_triggered_at ?? '—'
    }
  ])

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await listRules()
      all.value = normalizeRules(res.data)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function handleCurrentChange(c: number) {
    pagination.value.current = c
  }
  function handleSizeChange(s: number) {
    pagination.value.size = s
    pagination.value.current = 1
  }

  onMounted(load)
</script>

<template>
  <div class="kix-rules p-5 space-y-5">
    <header>
      <h1 class="text-2xl font-bold">{{ t('portal.rules.title') }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ t('portal.rules.subtitle') }}</p>
    </header>

    <div data-testid="rule-kpis" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <article
        v-for="(card, i) in kpiCards"
        :key="i"
        class="art-card relative flex flex-col justify-center h-28 px-5"
      >
        <span class="text-g-700 text-sm">{{ card.label }}</span>
        <span class="text-[26px] font-medium mt-2 tabular-nums leading-tight">{{
          card.value
        }}</span>
        <div
          class="absolute top-0 bottom-0 right-5 m-auto size-12.5 rounded-xl flex-cc bg-theme/10"
        >
          <ArtSvgIcon :icon="card.icon" class="text-xl text-theme" />
        </div>
      </article>
    </div>

    <ElCard class="art-table-card" shadow="never">
      <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div class="flex items-center gap-1 rounded-lg bg-g-100 p-1">
          <button
            v-for="f in RULE_FILTERS"
            :key="f.key"
            :data-testid="`rule-${f.key}`"
            class="px-3 py-1 text-sm rounded-md transition-colors"
            :class="
              stateFilter === f.key
                ? 'bg-white text-theme font-medium shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            "
            @click="stateFilter = f.key"
          >
            {{ f.label }}
          </button>
        </div>
        <ElInput
          v-model="query"
          data-testid="rules-search"
          placeholder="Search rules…"
          clearable
          class="max-w-xs"
        />
      </div>

      <div v-if="error" data-testid="rules-error" class="text-red-600 text-sm py-10 text-center">
        Failed to load rules: {{ error }}
      </div>
      <div
        v-else-if="!loading && all.length === 0"
        data-testid="rules-empty"
        class="text-gray-400 text-sm py-12 text-center"
      >
        No automation rules yet.
      </div>

      <ArtTable
        v-else
        :loading="loading"
        :data="paged"
        :columns="columns"
        :pagination="pagination"
        :show-table-header="false"
        @pagination:current-change="handleCurrentChange"
        @pagination:size-change="handleSizeChange"
      />
    </ElCard>
  </div>
</template>
