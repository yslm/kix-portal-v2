<template>
  <ElConfigProvider
    size="default"
    :locale="locales[language]"
    :z-index="3000"
    :card="{
      shadow: 'never'
    }"
  >
    <RouterView></RouterView>
  </ElConfigProvider>
</template>

<script setup lang="ts">
  import { useUserStore } from './store/modules/user'
  import zh from 'element-plus/es/locale/lang/zh-cn'
  import en from 'element-plus/es/locale/lang/en'
  import { systemUpgrade } from './utils/sys'
  import { toggleTransition } from './utils/ui/animation'
  import { checkStorageCompatibility } from './utils/storage'
  import { initializeTheme } from './hooks/core/useTheme'
  import { ensurePortalMenu } from './router/portalMenu'

  const userStore = useUserStore()
  const { language } = storeToRefs(userStore)

  const locales = {
    zh: zh,
    en: en
  }

  onBeforeMount(() => {
    toggleTransition(true)
    initializeTheme()
    // Populate the sidebar menu for the KiX portal. art-design-pro only
    // populates it inside its login-gated dynamic-route flow, which the KiX
    // token-guard flow bypasses — see src/router/portalMenu.ts. Fire-and-forget:
    // the sidebar reads menuStore reactively, so it fills in once resolved.
    ensurePortalMenu()
  })

  onMounted(() => {
    checkStorageCompatibility()
    toggleTransition(false)
    systemUpgrade()
  })
</script>
