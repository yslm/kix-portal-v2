/**
 * LiveActivity.vue render test.
 *
 * Branches covered:
 *   1. Fetcher resolves with items → component visible, correct Activity list
 *      passed to ArtDataListCard stub (title / status / time / class / icon).
 *   2. Fetcher rejects → self-hides.
 *   3. Fetcher resolves with empty array → self-hides (isReady gate).
 *   4. While loading → self-hides.
 *
 * ArtDataListCard uses ElScrollbar which is not available in jsdom. We stub
 * it and capture the props forwarded to it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/overview', () => ({
  fetchLiveActivity: vi.fn()
}))

import LiveActivity from '../LiveActivity.vue'
import { fetchLiveActivity } from '@/api/portal-admin/overview'

let lastListProps: Record<string, unknown> = {}

const stubs = {
  ArtDataListCard: {
    template: '<div data-stub="art-data-list-card" />',
    props: ['list', 'title', 'maxCount'],
    setup(props: Record<string, unknown>) {
      lastListProps = { ...props }
    }
  }
}

const MOCK_ACTIVITY = [
  {
    type: 'win',
    kid: '+65 8123',
    detail: 'won a free coffee',
    campaign: '茶物语·周末拉新',
    timestamp: '2m ago'
  },
  {
    type: 'redeem',
    kid: '+65 9234',
    detail: 'redeemed bubble tea',
    campaign: 'Lunch spin',
    timestamp: '5m ago'
  },
  {
    type: 'play',
    kid: '+65 8456',
    detail: 'played scratch card',
    campaign: '茶物语·周末拉新',
    timestamp: '11m ago'
  }
]

describe('LiveActivity.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastListProps = {}
  })

  it('renders and passes correct mapped Activity list to ArtDataListCard on resolve', async () => {
    ;(fetchLiveActivity as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: MOCK_ACTIVITY
    })

    const wrapper = mount(LiveActivity, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="live-activity"]').exists()).toBe(true)
    expect(wrapper.find('[data-stub="art-data-list-card"]').exists()).toBe(true)

    // title prop
    expect(lastListProps.title).toBe('Live activity')

    // list is correctly mapped
    const list = lastListProps.list as Array<{
      title: string
      status: string
      time: string
      class: string
      icon: string
    }>
    expect(list).toHaveLength(3)

    // win item
    expect(list[0].title).toBe('+65 8123 won a free coffee')
    expect(list[0].status).toBe('茶物语·周末拉新')
    expect(list[0].time).toBe('2m ago')
    expect(list[0].icon).toBe('ri:trophy-line')

    // redeem item
    expect(list[1].title).toBe('+65 9234 redeemed bubble tea')
    expect(list[1].icon).toBe('ri:coupon-2-line')

    // play item (fallback icon)
    expect(list[2].icon).toBe('ri:flashlight-line')
  })

  it('self-hides when the fetch rejects', async () => {
    ;(fetchLiveActivity as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('401 Unauthorized')
    )

    const wrapper = mount(LiveActivity, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="live-activity"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('self-hides when the resolved array is empty', async () => {
    ;(fetchLiveActivity as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: []
    })

    const wrapper = mount(LiveActivity, { global: { stubs } })
    await flushPromises()

    expect(wrapper.find('[data-testid="live-activity"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('self-hides while loading', () => {
    ;(fetchLiveActivity as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise(() => {})
    )

    const wrapper = mount(LiveActivity, { global: { stubs } })

    expect(wrapper.find('[data-testid="live-activity"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})
