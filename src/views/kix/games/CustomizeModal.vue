<script setup lang="ts">
  /**
   * CustomizeModal — embeds the gamification IDE for an existing build order.
   *
   * Source: kix-platform/landing/portal.html — `kixOpenEditor(orderId)`
   * (~8222) + the `kix-editor-saved` postMessage listener (~8246). The IDE
   * is a separate app served at `/kix-gamification-ide/`; we host it in a
   * full-bleed iframe and listen for its save message to close + refresh.
   */
  import { computed, watch, onBeforeUnmount } from 'vue'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'

  const props = defineProps<{ modelValue: boolean; orderId: string | null }>()
  const emit = defineEmits<{
    'update:modelValue': [boolean]
    saved: []
  }>()

  const visible = computed({
    get: () => props.modelValue,
    set: (v: boolean) => emit('update:modelValue', v)
  })

  /** IDE URL with the order + brand context the editor needs to load assets. */
  const editorSrc = computed(() => {
    if (!props.orderId) return ''
    const params = new URLSearchParams({
      order_id: props.orderId,
      brand: resolveBrandId()
    })
    return `/kix-gamification-ide/?${params.toString()}`
  })

  function onMessage(e: MessageEvent) {
    const data = e.data as { type?: string } | null
    if (data && data.type === 'kix-editor-saved') {
      emit('saved')
      visible.value = false
    }
  }

  // Only listen while the editor is open (immediate so a modal mounted
  // already-open still attaches the listener).
  watch(
    () => props.modelValue,
    (open) => {
      if (open) window.addEventListener('message', onMessage)
      else window.removeEventListener('message', onMessage)
    },
    { immediate: true }
  )

  onBeforeUnmount(() => window.removeEventListener('message', onMessage))

  function close() {
    visible.value = false
  }
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible"
      data-testid="customize-modal"
      class="fixed inset-0 z-[3000] flex-cc bg-black/70 p-4"
    >
      <div
        class="bg-white rounded-xl overflow-hidden flex flex-col"
        style="width: 96vw; height: 94vh"
      >
        <header class="flex items-center justify-between px-4 h-12 border-b shrink-0">
          <span class="font-semibold text-sm">游戏定制编辑器</span>
          <button
            class="text-gray-400 hover:text-gray-700 text-xl leading-none"
            data-testid="customize-close"
            aria-label="Close"
            @click="close"
          >
            ×
          </button>
        </header>
        <iframe
          v-if="editorSrc"
          :src="editorSrc"
          data-testid="customize-frame"
          class="flex-1 w-full border-0"
          title="Gamification IDE"
        />
      </div>
    </div>
  </Teleport>
</template>
