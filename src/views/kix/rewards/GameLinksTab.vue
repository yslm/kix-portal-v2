<script setup lang="ts">
  /**
   * GameLinksTab — bind a coupon template + distribution rule to each brand
   * game (legacy kixCQLoadGameLinks ~5717 / save ~5819). Read brand-games,
   * edit per-row, PUT the binding.
   */
  import { ref, onMounted } from 'vue'
  import { fetchGameLinks, saveGameBinding } from '@/api/portal-admin/rewards'
  import type { GameLink, RewardTemplate } from '@/api/portal-admin/types'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'
  import { normalizeGameLinks, DISTRIBUTION_OPTIONS } from './rewardsTabsModel'

  const props = defineProps<{ templates: RewardTemplate[] }>()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const links = ref<GameLink[]>([])
  const savingId = ref<string | number | null>(null)
  const savedId = ref<string | number | null>(null)

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchGameLinks()
      links.value = normalizeGameLinks(res.data)
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  async function save(link: GameLink) {
    if (link.game_id == null) return
    savingId.value = link.game_id
    savedId.value = null
    try {
      await saveGameBinding(link.game_id, resolveBrandId(), {
        coupon_template_id: link.coupon_template_id ?? null,
        distribution_rule: (link.distribution_rule as 'on_win' | 'none') ?? 'none'
      })
      savedId.value = link.game_id
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      savingId.value = null
    }
  }

  onMounted(load)
</script>

<template>
  <div data-testid="rewards-game-links">
    <div v-if="loading" class="text-gray-400 text-sm py-10 text-center">Loading game links…</div>
    <div
      v-else-if="error"
      data-testid="game-links-error"
      class="text-red-600 text-sm py-10 text-center"
    >
      {{ error }}
    </div>
    <div v-else-if="links.length === 0" class="text-gray-400 text-sm py-12 text-center">
      No games to bind yet — build a game first.
    </div>

    <div v-else class="space-y-3">
      <article
        v-for="link in links"
        :key="String(link.game_id)"
        class="art-card p-4 flex flex-col sm:flex-row sm:items-end gap-3"
        data-testid="game-link-row"
      >
        <div class="flex-1 min-w-0">
          <p class="font-medium text-gray-900 truncate">{{ link.name || link.game_slug }}</p>
          <p class="text-xs text-gray-400 font-mono">{{ link.game_slug }}</p>
        </div>

        <label class="block">
          <span class="text-xs text-gray-500">Coupon template</span>
          <ElSelect
            v-model="link.coupon_template_id"
            class="w-44 mt-1"
            clearable
            placeholder="None"
            :data-testid="`gl-template-${link.game_id}`"
          >
            <ElOption
              v-for="tpl in props.templates"
              :key="tpl.prize_id ?? tpl.id ?? tpl.name"
              :label="tpl.name"
              :value="Number(tpl.prize_id ?? tpl.id)"
            />
          </ElSelect>
        </label>

        <label class="block">
          <span class="text-xs text-gray-500">Distribution</span>
          <ElSelect
            v-model="link.distribution_rule"
            class="w-36 mt-1"
            :data-testid="`gl-rule-${link.game_id}`"
          >
            <ElOption
              v-for="o in DISTRIBUTION_OPTIONS"
              :key="o.value"
              :label="o.label"
              :value="o.value"
            />
          </ElSelect>
        </label>

        <ElButton
          type="primary"
          :loading="savingId === link.game_id"
          :data-testid="`gl-save-${link.game_id}`"
          @click="save(link)"
        >
          {{ savedId === link.game_id ? 'Saved ✓' : 'Save' }}
        </ElButton>
      </article>
    </div>
  </div>
</template>
