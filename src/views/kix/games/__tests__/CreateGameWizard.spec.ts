/**
 * CreateGameWizard — the 4-step Smart-Recommend creation flow.
 *
 * Decision logic (fallback, score format, phase mapping) is unit-tested in
 * wizardModel.spec.ts. This component spec verifies wiring + the async
 * timeline: recommend → matches, the 503 starter fallback, select → build →
 * poll → launch (both the R7 sync path and the polled path), and the
 * build-failure return.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/api/portal-admin/games', () => ({
  recommendGames: vi.fn(),
  buildGame: vi.fn(),
  getGameOrder: vi.fn()
}))

vi.mock('@/utils/kix/resolveBrandId', () => ({
  resolveBrandId: () => '42'
}))

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push })
}))

import CreateGameWizard from '../CreateGameWizard.vue'
import { recommendGames, buildGame, getGameOrder } from '@/api/portal-admin/games'
import { POLL_INTERVAL_MS } from '../wizardModel'

const mockRecommend = recommendGames as unknown as ReturnType<typeof vi.fn>
const mockBuild = buildGame as unknown as ReturnType<typeof vi.fn>
const mockOrder = getGameOrder as unknown as ReturnType<typeof vi.fn>

const stubs = {
  ElDialog: {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /></div>'
  },
  ElInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
      '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />'
  },
  ElButton: {
    props: ['loading', 'disabled'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>'
  },
  ElProgress: {
    props: ['percentage'],
    template: '<div data-testid="progress-stub">{{ percentage }}</div>'
  }
}

function mountWizard() {
  return mount(CreateGameWizard, {
    props: { modelValue: true },
    global: { stubs }
  })
}

async function describeAndRecommend(wrapper: ReturnType<typeof mountWizard>) {
  await wrapper.find('[data-testid="wizard-description"]').setValue('a coffee shop')
  await wrapper.find('[data-testid="wizard-recommend"]').trigger('click')
  await flushPromises()
}

describe('CreateGameWizard · recommend step', () => {
  beforeEach(() => vi.clearAllMocks())

  it('describes → matches render on step 2', async () => {
    mockRecommend.mockResolvedValueOnce({
      data: [
        { slug: 'spin_wheel', name: 'Spin Wheel', score: 0.91, reason: 'great for repeat' },
        { slug: 'scratch_win', name: 'Scratch', score: 0.7 }
      ]
    })
    const wrapper = mountWizard()
    await describeAndRecommend(wrapper)

    expect(wrapper.find('[data-testid="wizard-step-2"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="wizard-match"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('91%')
    expect(wrapper.find('[data-testid="wizard-fallback-banner"]').exists()).toBe(false)
  })

  it('falls back to the 3 starters on a 503', async () => {
    mockRecommend.mockRejectedValueOnce({ response: { status: 503 } })
    const wrapper = mountWizard()
    await describeAndRecommend(wrapper)

    expect(wrapper.find('[data-testid="wizard-fallback-banner"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="wizard-match"]')).toHaveLength(3)
    expect(wrapper.find('[data-testid="wizard-select-bubbletea_match3"]').exists()).toBe(true)
  })

  it('surfaces a non-503 recommend error and stays on step 1', async () => {
    mockRecommend.mockRejectedValueOnce(new Error('boom'))
    const wrapper = mountWizard()
    await describeAndRecommend(wrapper)

    expect(wrapper.find('[data-testid="wizard-step-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="wizard-error"]').text()).toContain('boom')
  })
})

describe('CreateGameWizard · build + poll', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  // Under fake timers, @vue/test-utils' flushPromises (a setTimeout) never
  // fires — advanceTimersByTimeAsync(0) flushes the microtask queue instead.
  const flush = () => vi.advanceTimersByTimeAsync(0)

  async function toStep2(wrapper: ReturnType<typeof mountWizard>) {
    mockRecommend.mockResolvedValueOnce({ data: [{ slug: 'spin_wheel', name: 'Spin' }] })
    await wrapper.find('[data-testid="wizard-description"]').setValue('shop')
    await wrapper.find('[data-testid="wizard-recommend"]').trigger('click')
    await flush()
  }

  it('R7 sync path: build returns completed → jumps to launch', async () => {
    const wrapper = mountWizard()
    await toStep2(wrapper)

    mockBuild.mockResolvedValueOnce({
      data: { order_id: 'o1', status: 'completed', game_file: '/games/spin/index.html' }
    })
    await wrapper.find('[data-testid="wizard-select-spin_wheel"]').trigger('click')
    await flush()

    expect(wrapper.find('[data-testid="wizard-step-4"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="wizard-play"]').exists()).toBe(true)
    expect(wrapper.emitted('built')).toBeTruthy()
  })

  it('polled path: building → completed advances to launch', async () => {
    const wrapper = mountWizard()
    await toStep2(wrapper)

    mockBuild.mockResolvedValueOnce({ data: { order_id: 'o2', status: 'building' } })
    mockOrder
      .mockResolvedValueOnce({ data: { order_id: 'o2', status: 'building' } })
      .mockResolvedValueOnce({
        data: { order_id: 'o2', status: 'completed', play_url: '/play/o2' }
      })

    await wrapper.find('[data-testid="wizard-select-spin_wheel"]').trigger('click')
    await flush()
    expect(wrapper.find('[data-testid="wizard-step-3"]').exists()).toBe(true)

    // first poll → still building
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(wrapper.find('[data-testid="wizard-step-3"]').exists()).toBe(true)
    // second poll → completed
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(wrapper.find('[data-testid="wizard-step-4"]').exists()).toBe(true)
    expect(mockOrder).toHaveBeenCalledWith('o2', '42')
  })

  it('a failed order returns to step 2 with the error', async () => {
    const wrapper = mountWizard()
    await toStep2(wrapper)

    mockBuild.mockResolvedValueOnce({ data: { order_id: 'o3', status: 'building' } })
    mockOrder.mockResolvedValueOnce({
      data: { order_id: 'o3', status: 'failed', error: 'asset gen failed' }
    })

    await wrapper.find('[data-testid="wizard-select-spin_wheel"]').trigger('click')
    await flush()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)

    expect(wrapper.find('[data-testid="wizard-step-2"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="wizard-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="wizard-error"]').text()).toContain('asset gen failed')
  })
})
