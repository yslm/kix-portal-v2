/**
 * storefrontModel — pure logic for the Storefront view.
 *
 * Real fields (v2 StorefrontProfile): display_name / bio / brand_color /
 * is_default / follower_count / avg_rating / rating_count / featured_games.
 */
import { describe, it, expect } from 'vitest'
import {
  displayName,
  avatarLetter,
  brandColor,
  bio,
  isDefault,
  publicUrl,
  embedSnippet,
  storefrontKpis
} from '../storefrontModel'

describe('displayName / avatarLetter', () => {
  it('display_name → brandId → "Your storefront"', () => {
    expect(displayName({ display_name: 'Toast Box' }, 'demo')).toBe('Toast Box')
    expect(displayName(null, 'demo')).toBe('demo')
    expect(displayName(null, '')).toBe('Your storefront')
  })
  it('first letter uppercased, "T" fallback', () => {
    expect(avatarLetter('nana')).toBe('N')
    expect(avatarLetter('  ')).toBe('T')
  })
})

describe('brandColor / bio / isDefault', () => {
  it('use configured values, fall back to defaults', () => {
    expect(brandColor({ brand_color: '#FF0000' })).toBe('#FF0000')
    expect(brandColor(null)).toBe('#00FC00')
    expect(bio({ bio: 'Custom bio' })).toBe('Custom bio')
    expect(bio({ bio: '   ' })).toContain('Earn rewards')
    expect(isDefault({ is_default: true })).toBe(true)
    expect(isDefault(null)).toBe(false)
  })
})

describe('publicUrl / embedSnippet', () => {
  it('builds the short URL + iframe snippet from injected origin', () => {
    expect(publicUrl('https://kix.app', 'demo')).toBe('https://kix.app/sf/demo')
    const snip = embedSnippet('https://kix.app', 'de mo')
    expect(snip).toContain('https://kix.app/landing/play.html?brand=de%20mo')
    expect(snip).toContain('embed=1&channel=website')
    expect(snip).toContain('<iframe')
  })
})

describe('storefrontKpis', () => {
  it('surfaces real analytics; rating to 1dp, em-dash when unrated', () => {
    const k = storefrontKpis({
      follower_count: 1240,
      avg_rating: 4.67,
      rating_count: 89,
      featured_games: ['g1', 'g2', 'g3']
    })
    expect(k).toEqual({ followers: 1240, rating: '4.7', ratingCount: 89, featuredGames: 3 })
  })
  it('is safe on null / missing fields', () => {
    expect(storefrontKpis(null)).toEqual({
      followers: 0,
      rating: '—',
      ratingCount: 0,
      featuredGames: 0
    })
  })
})
