/**
 * storefrontModel — pure (UI-free) logic for the Storefront view.
 *
 * Real fields (v2 StorefrontProfile, verified vs storefront.py:462):
 * display_name / bio / brand_color / logo_url / is_default /
 * follower_count / avg_rating / rating_count / featured_games. Display
 * fallbacks + URL builders mirror the legacy helpers (portal.html:5368).
 * `origin` is injected (not read from window) so this stays unit-testable.
 */
import type { StorefrontProfile } from '@/api/portal-admin/types'

const DEFAULT_BRAND_COLOR = '#00FC00'
const DEFAULT_BIO = 'Earn rewards every time you visit · 每次到店都有奖'

/** display_name → brandId → "Your storefront" (portal.html:2685). */
export function displayName(profile: StorefrontProfile | null, brandId: string): string {
  return profile?.display_name || brandId || 'Your storefront'
}

/** First letter uppercased, "T" fallback (portal.html:2690). */
export function avatarLetter(name: string): string {
  return (name.trim()[0] || 'T').toUpperCase()
}

export function brandColor(profile: StorefrontProfile | null): string {
  return profile?.brand_color || DEFAULT_BRAND_COLOR
}

export function bio(profile: StorefrontProfile | null): string {
  return profile?.bio?.trim() || DEFAULT_BIO
}

export function isDefault(profile: StorefrontProfile | null): boolean {
  return Boolean(profile?.is_default)
}

/** Short shareable URL — `${origin}/sf/${brandId}` (portal.html:5371). */
export function publicUrl(origin: string, brandId: string): string {
  return `${origin}/sf/${brandId}`
}

/** Website embed iframe snippet (portal.html:5376). */
export function embedSnippet(origin: string, brandId: string): string {
  return (
    `<iframe src="${origin}/landing/play.html?brand=${encodeURIComponent(brandId)}` +
    `&embed=1&channel=website" style="width:100%;height:640px;border:0;border-radius:12px" ` +
    `title="Play & win"></iframe>`
  )
}

export interface StorefrontKpis {
  followers: number
  rating: string
  ratingCount: number
  featuredGames: number
}

/** Honest analytics the legacy view typed but never rendered. rating is the
 *  avg to 1 dp, em-dash when unrated. */
export function storefrontKpis(profile: StorefrontProfile | null): StorefrontKpis {
  return {
    followers: profile?.follower_count ?? 0,
    rating: typeof profile?.avg_rating === 'number' ? profile.avg_rating.toFixed(1) : '—',
    ratingCount: profile?.rating_count ?? 0,
    featuredGames: profile?.featured_games?.length ?? 0
  }
}
