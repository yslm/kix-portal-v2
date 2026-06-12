<script setup lang="ts">
  /**
   * Overview · Live activity feed.
   *
   * Fetches GET /api/v1/portal-admin/activity/live?limit=8 → ActivityItem[].
   * Reuses the global ArtDataListCard component (auto-imported), mapping each
   * ActivityItem to an Activity row shape that ArtDataListCard expects.
   *
   * Self-hides on loading / error / empty via useNonCriticalCard.
   */
  import { computed, onMounted } from 'vue'
  import { fetchLiveActivity } from '@/api/portal-admin/overview'
  import type { ActivityItem } from '@/api/portal-admin/types'
  import { useNonCriticalCard } from '@/hooks/kix/useNonCriticalCard'

  /** Icons mapped by activity type. */
  function iconForType(type: string): string {
    if (type === 'win') return 'ri:trophy-line'
    if (type === 'redeem') return 'ri:coupon-2-line'
    return 'ri:flashlight-line'
  }

  /** CSS class for icon background, mapped by type. */
  function classForType(type: string): string {
    if (type === 'win') return 'bg-warning/12 text-warning'
    if (type === 'redeem') return 'bg-success/12 text-success'
    return 'bg-theme/12 text-theme'
  }

  const { data, visible, reload } = useNonCriticalCard<ActivityItem[]>(fetchLiveActivity, {
    isReady: (d) => d.length > 0
  })

  onMounted(reload)

  /** Map ActivityItem[] → ArtDataListCard Activity[]. */
  const activityList = computed(() => {
    if (!data.value) return []
    return data.value.map((item) => ({
      title: `${item.kid} ${item.detail}`,
      status: item.campaign,
      time: item.timestamp,
      class: classForType(item.type),
      icon: iconForType(item.type)
    }))
  })
</script>

<template>
  <div v-if="visible" data-testid="live-activity">
    <ArtDataListCard :list="activityList" title="Live activity" :maxCount="6" />
  </div>
</template>
