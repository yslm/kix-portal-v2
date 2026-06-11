<script setup lang="ts">
  /**
   * Settings view — second real P0 view migrated from
   * `kix-platform/landing/portal.html` (lines 2748–3029).
   *
   * Plan 3 Task 2 ports ONE sub-section (brand profile, display-only) plus
   * the page header. The legacy Settings page is a tabbed shell with eight
   * sub-sections; this migration scopes to the simplest, single-fetch,
   * read-only one — establishing the per-sub-section pattern.
   *
   * Section ported: brand profile · powered by GET
   * `/api/v1/portal/settings/profile/<brand_id>` (see
   * `src/api/portal-admin/settings.ts`).
   *
   * State machine: loading → (data | empty | error). Each branch renders
   * an honest, non-fake placeholder.
   *
   * Deferred to follow-up tasks: Billing invoices, Payment methods,
   * Stores list, Team members, Integrations registry, Notification prefs,
   * Security panel — plus the profile mutation flow (save) and the logo
   * upload (multipart, image cropping).
   */
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { fetchBrandProfile } from '@/api/portal-admin/settings'
  import type { BrandProfile } from '@/api/portal-admin/types'
  import { resolveBrandId } from '@/utils/kix/resolveBrandId'

  const { t } = useI18n()

  const loading = ref(true)
  const error = ref<string | null>(null)
  const profile = ref<BrandProfile | null>(null)

  const pageTitle = computed(() => t('portal.settings.title'))
  const pageSubtitle = computed(() => t('portal.settings.subtitle'))
  const sectionTitle = computed(() => t('portal.settings.profile.brand'))

  // `null` distinguishes "no fetch yet" / "fetch failed" from "fetched but
  // empty". A successfully-fetched profile with no fields gets the empty
  // branch via this computed.
  const hasData = computed(() => {
    if (!profile.value) return false
    return Object.values(profile.value).some((v) => v != null && v !== '')
  })

  async function load() {
    loading.value = true
    error.value = null
    try {
      const res = await fetchBrandProfile(resolveBrandId())
      profile.value = res.data?.profile ?? null
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
</script>

<template>
  <div class="kix-settings p-8 space-y-6">
    <!-- Page header -->
    <header>
      <h1 class="text-2xl font-bold">{{ pageTitle }}</h1>
      <p class="text-sm text-gray-500 mt-1">{{ pageSubtitle }}</p>
    </header>

    <!-- Brand profile sub-section (display-only port of #view-settings -> profile tab) -->
    <section class="space-y-3">
      <h2 class="text-base font-semibold">{{ sectionTitle }}</h2>

      <div v-if="loading" class="text-gray-400 text-sm py-6 text-center">
        Loading brand profile…
      </div>

      <div v-else-if="error" class="text-red-600 text-sm py-6 text-center">
        Failed to load: {{ error }}
      </div>

      <div v-else-if="!hasData" class="text-gray-400 text-sm py-6 text-center">
        No brand profile data yet.
      </div>

      <article
        v-else-if="profile"
        class="bg-white border border-gray-200 rounded-xl p-6 max-w-3xl"
        data-testid="brand-profile-card"
      >
        <dl class="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
          <template v-if="profile.brand_name">
            <dt class="text-gray-500">{{ t('portal.settings.profile.name') }}</dt>
            <dd class="col-span-2 font-medium text-gray-900">{{ profile.brand_name }}</dd>
          </template>

          <template v-if="profile.business_type">
            <dt class="text-gray-500">{{ t('portal.settings.profile.business_type') }}</dt>
            <dd class="col-span-2 capitalize">{{ profile.business_type }}</dd>
          </template>

          <template v-if="profile.contact_email">
            <dt class="text-gray-500">{{ t('portal.settings.profile.email') }}</dt>
            <dd class="col-span-2">{{ profile.contact_email }}</dd>
          </template>

          <template v-if="profile.contact_phone">
            <dt class="text-gray-500">{{ t('portal.settings.profile.phone') }}</dt>
            <dd class="col-span-2">{{ profile.contact_phone }}</dd>
          </template>

          <template v-if="profile.tax_id">
            <dt class="text-gray-500">{{ t('portal.settings.profile.tax') }}</dt>
            <dd class="col-span-2 font-mono">{{ profile.tax_id }}</dd>
          </template>

          <template v-if="profile.country">
            <dt class="text-gray-500">{{ t('portal.settings.profile.country') }}</dt>
            <dd class="col-span-2">{{ profile.country }}</dd>
          </template>

          <template v-if="profile.city">
            <dt class="text-gray-500">{{ t('portal.settings.profile.city') }}</dt>
            <dd class="col-span-2">{{ profile.city }}</dd>
          </template>

          <template v-if="profile.website_url">
            <dt class="text-gray-500">{{ t('portal.settings.profile.website') }}</dt>
            <dd class="col-span-2">
              <a
                :href="profile.website_url"
                class="text-blue-600 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
                >{{ profile.website_url }}</a
              >
            </dd>
          </template>

          <template v-if="profile.logo_url">
            <dt class="text-gray-500">{{ t('portal.settings.profile.logo_url') }}</dt>
            <dd class="col-span-2 flex items-center gap-3">
              <img
                :src="profile.logo_url"
                alt="brand logo"
                class="w-12 h-12 rounded-lg object-cover border border-gray-200"
              />
              <span class="text-xs text-gray-500 break-all">{{ profile.logo_url }}</span>
            </dd>
          </template>
        </dl>
      </article>
    </section>
  </div>
</template>
