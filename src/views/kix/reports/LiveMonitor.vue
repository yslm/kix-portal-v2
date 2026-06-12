<script setup lang="ts">
  /**
   * Reports · Live monitoring · "Live now".
   *
   * Ports the legacy `#view-reports` monitoring panel (portal.html lines
   * 2061-2072) onto an `.art-card` stat strip. Four honest tiles, each
   * backed by a real endpoint via the composed `fetchLiveMonitor()`:
   *   Plays / min · Plays today · Redemptions today · New customers today
   *
   * The legacy "p95 latency" and "error rate" tiles are intentionally
   * DROPPED — `portal.html` hardcoded them and no backend source exists.
   * "No fake data": we only render metrics with a real data source.
   *
   * State machine (non-critical card): loading / error / all-null reading
   * → render nothing. A reading of literal zeros IS shown — "0 plays/min"
   * is a real live signal, not missing data. The card hides only when
   * BOTH source legs failed (every field null).
   */
  import { computed, onMounted } from 'vue'
  import { fetchLiveMonitor } from '@/api/portal-admin/reports'
  import type { LiveMonitor } from '@/api/portal-admin/types'
  import { useNonCriticalCard } from '@/hooks/kix/useNonCriticalCard'

  const { data, visible, reload } = useNonCriticalCard<LiveMonitor>(
    () => fetchLiveMonitor(),
    /** Show when any leg resolved (≥1 non-null field). All-null = both
     *  endpoints failed → hide, same fail-soft as every other card. */
    {
      isReady: (d) =>
        d.plays_per_min != null ||
        d.plays_today != null ||
        d.redemptions_today != null ||
        d.new_customers_today != null
    }
  )

  onMounted(reload)

  /** Fixed tile order. Each reads one folded field; null → em-dash. */
  const tiles = computed(() => {
    const d = data.value
    return [
      { label: 'Plays / min', value: d?.plays_per_min ?? null },
      { label: 'Plays today', value: d?.plays_today ?? null },
      { label: 'Redemptions today', value: d?.redemptions_today ?? null },
      { label: 'New customers today', value: d?.new_customers_today ?? null }
    ]
  })

  function fmt(v: number | null): string {
    return v == null ? '—' : v.toLocaleString('en-US')
  }
</script>

<template>
  <div v-if="visible" class="art-card px-5 py-5" data-testid="live-monitor-card">
    <div class="flex items-center gap-2 mb-4">
      <h2 class="text-base font-semibold">Live now</h2>
      <span class="flex items-center gap-1 text-xs text-success">
        <span class="size-1.5 rounded-full bg-success animate-pulse" />
        Streaming
      </span>
    </div>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="(tile, i) in tiles"
        :key="i"
        :data-testid="`live-tile-${i}`"
        class="rounded-xl bg-theme/5 px-4 py-3"
      >
        <div class="text-xs text-gray-500">{{ tile.label }}</div>
        <div class="text-2xl font-bold tabular-nums mt-1">{{ fmt(tile.value) }}</div>
      </div>
    </div>
  </div>
</template>
