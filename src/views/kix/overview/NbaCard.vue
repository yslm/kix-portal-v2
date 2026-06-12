<script setup lang="ts">
  /**
   * Overview · NBA "Suggested next move" card.
   *
   * V2.16 Shopify-Home-style next-best-action recommendation card. Ports
   * the legacy `#nba-card` rendering (kix-platform/landing/portal.html
   * line 1317-1323 + the `kixLoadNBA()` fetcher at line 4170-4197) onto
   * art-design-pro's Element Plus card / button surfaces.
   *
   * Wire endpoint: GET /api/v1/portal-admin/next-best-action (see
   * src/api/portal-admin/overview.ts · `fetchNextBestAction`). The
   * backend caps the response at three actions and only emits a row when
   * a REAL signal justifies it ("every suggestion backed by a real
   * signal" — portal_admin.py line 3100-3102).
   *
   * State machine (intentionally minimal, mirroring the legacy "additive"
   * behaviour at portal.html line 4196):
   *   - loading                 → render nothing (avoid layout flicker)
   *   - error                   → render nothing (the card is non-critical)
   *   - data + 0 known actions  → render nothing (legacy line 4184)
   *   - data + ≥1 known action  → render the card
   *
   * Visual parity with legacy: legacy uses a green-tinted gradient pill
   * (`linear-gradient(135deg,#F0FDF4,#fff)` with `#BBF7D0` border). We
   * surface that intent on the el-card via a `kix-nba-card` class that
   * inherits Element Plus's card shell but overrides background + border
   * to match — same 12px border-radius, same green tone family.
   *
   * Deferred from this first cut (legacy still owns these surfaces):
   *   - i18n keys (`portal.nba.<id>` / `portal.nba.<id>_cta`) — English-
   *     only first cut, same approach as SetupGuideCard T1.
   *   - "Why am I seeing this?" tooltip wired to `action.signal`.
   *   - Action-specific emoji glyphs (legacy bakes them into the copy
   *     string itself — we keep them verbatim in NBA_COPY, so they show
   *     up as plain text in front of each body line).
   */
  import { computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { fetchNextBestAction } from '@/api/portal-admin/overview'
  import type {
    NextBestAction,
    NextBestActionResponse,
    NextBestActionView
  } from '@/api/portal-admin/types'
  import { useNonCriticalCard } from '@/hooks/kix/useNonCriticalCard'

  /**
   * English copy table for the seven canonical action ids. Pulled verbatim
   * from the legacy `KIX_NBA_COPY` (portal.html line 4159-4169) so the
   * merchant-facing copy is byte-identical. Each entry exposes:
   *   - body: a template string with `{count}` / `{tier}` / `{save}`
   *           interpolation tokens. `interpolate()` walks them.
   *   - cta:  the button label.
   *
   * Unknown ids are filtered out (matching the legacy
   * `actions.filter(a => KIX_NBA_COPY[a.id])` at portal.html line 4183).
   */
  const NBA_COPY: Record<string, { body: string; cta: string }> = {
    finish_setup: {
      body: '🏁 Finish your shop setup — a game + a prize is all it takes to go live.',
      cta: 'Continue setup'
    },
    winback_at_risk: {
      body: "💌 {count} customers haven't been back in 2+ weeks — a quick message brings regulars back.",
      cta: 'Send a win-back'
    },
    first_message_leads: {
      body: '📧 {count} fans left their email and have never heard from you — say hello.',
      cta: 'Message them'
    },
    weekend_pack: {
      body: '🎡 The weekend is coming — a Sat-Sun spin pack is the easiest footfall boost.',
      cta: 'Set up weekend spin'
    },
    no_plays_print_qr: {
      body: '🖨️ Your game is live but nobody has scanned yet — is the QR poster by the counter?',
      cta: 'Open QR poster'
    },
    all_good: {
      body: '✅ Everything is running — {count} plays this week. Check what it brought in.',
      cta: 'See results'
    },
    // Bible §1.9a · subscription = rate buy-down; the upgrade is the
    // merchant's own money-saving math, never an up-sell.
    // Currency symbol normalized: legacy KIX_NBA_COPY shipped ¥ here, but portal-v2
    // standardizes on S$ to match fmtSgd() and the rest of the app's currency display.
    upgrade_break_even: {
      body: '💡 At your current acquisition spend, upgrading to {tier} saves you S${save}/month — it buys your per-customer cost down.',
      cta: 'See the math'
    }
  }

  /**
   * Map the backend's legacy view-id strings (emitted in `action.view`) to
   * the v2 router paths. Legacy values are `'overview' | 'messages' |
   * 'builder' | 'vouchers' | 'billing' | 'reports'` — closed enum per the
   * NBA rule ladder in portal_admin.py line 3169-3261. Unknown values
   * fall back to `/overview` as a safe default — the CTA still navigates,
   * just to the home dashboard rather than 404.
   */
  const VIEW_TO_ROUTE: Record<string, string> = {
    overview: '/overview',
    messages: '/messages',
    builder: '/builder',
    vouchers: '/vouchers',
    billing: '/billing',
    reports: '/reports'
  }

  const router = useRouter()

  /** Known-ids only — drop any action whose id we don't have copy for.
   * Mirrors the legacy `actions.filter(a => KIX_NBA_COPY[a.id])` at
   * portal.html line 4183. */
  function isKnownId(a: NextBestAction): boolean {
    return Object.prototype.hasOwnProperty.call(NBA_COPY, a.id)
  }

  const { data, visible, reload } = useNonCriticalCard<NextBestActionResponse>(
    () => fetchNextBestAction(),
    {
      /** Card only shows when at least one action survives the known-id filter —
       *  mirrors legacy `actions.filter(a => KIX_NBA_COPY[a.id])` at
       *  portal.html line 4183 and the `knownActions.value.length > 0` gate. */
      isReady: (d) => (d.actions ?? []).filter(isKnownId).length > 0
    }
  )

  onMounted(reload)

  /** Derived from the resolved payload — mirrors the original `knownActions`
   * computed but sourced from `data.value` instead of a standalone `actions` ref. */
  const knownActions = computed<NextBestAction[]>(() =>
    (data.value?.actions ?? []).filter(isKnownId)
  )

  /** Interpolate `{token}` placeholders in the copy template with values
   * from the action row. Matches the legacy template-string fallback at
   * portal.html line 4176-4177. */
  function interpolate(template: string, vars: Record<string, string | number>): string {
    let out = template
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(String(v))
    }
    return out
  }

  /** Variable map for an action — mirrors the legacy branch at
   * portal.html line 4188-4190: `upgrade_break_even` uses `{tier}` +
   * `{save}` (cents → ¥); everything else uses `{count}`. */
  function varsFor(action: NextBestAction): Record<string, string | number> {
    if (action.id === 'upgrade_break_even') {
      return {
        tier: (action.to_tier ?? '').toUpperCase(),
        save: Math.round((action.save_cents ?? 0) / 100)
      }
    }
    return { count: action.count ?? 0 }
  }

  function bodyFor(action: NextBestAction): string {
    const tpl = NBA_COPY[action.id]?.body
    if (!tpl) return ''
    return interpolate(tpl, varsFor(action))
  }

  function ctaFor(action: NextBestAction): string {
    return NBA_COPY[action.id]?.cta ?? ''
  }

  function routeFor(view?: NextBestActionView): string | null {
    if (!view) return null
    return VIEW_TO_ROUTE[view] ?? null
  }

  function handleCta(action: NextBestAction) {
    const route = routeFor(action.view) ?? '/overview'
    router.push(route)
  }

  /** Stable row key — id may repeat in theory if the backend ever
   * de-duplicates loosely, so pair it with the array index. */
  function rowKey(action: NextBestAction, index: number): string {
    return `${action.id}-${index}`
  }
</script>

<template>
  <el-card v-if="visible" data-testid="nba-card" shadow="never" class="kix-nba-card">
    <template #header>
      <div
        class="text-[11px] font-extrabold uppercase tracking-wider text-green-800"
        data-testid="nba-eyebrow"
      >
        Suggested next move
      </div>
    </template>

    <ul class="flex flex-col gap-2">
      <li
        v-for="(action, index) in knownActions"
        :key="rowKey(action, index)"
        class="flex flex-wrap items-center justify-between gap-3"
        :data-testid="`nba-row-${action.id}`"
      >
        <span class="text-sm leading-snug text-gray-800 flex-1 min-w-0">
          {{ bodyFor(action) }}
        </span>
        <el-button size="small" type="primary" @click="handleCta(action)">
          {{ ctaFor(action) }}
        </el-button>
      </li>
    </ul>
  </el-card>
</template>

<style scoped>
  /* Match the legacy green-gradient pill at portal.html line 1320:
     linear-gradient(135deg,#F0FDF4,#fff) + 1px #BBF7D0 border + 12px radius.
     The :deep() selector reaches into Element Plus's card shell since
     el-card paints background on its inner .el-card__body wrapper. */
  .kix-nba-card {
    background: linear-gradient(135deg, #f0fdf4, #fff);
    border: 1px solid #bbf7d0;
    border-radius: 12px;
  }

  .kix-nba-card :deep(.el-card__header) {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .kix-nba-card :deep(.el-card__body),
  .kix-nba-card :deep(.el-card__header) {
    background: transparent;
  }
</style>
