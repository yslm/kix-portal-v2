/**
 * rewardsTabsModel — pure (UI-free) logic for the Rewards Game-links /
 * Issuance / Redemption tabs and the template-create form. Ports the
 * collect/validate logic of the legacy portal.html handlers (kixCQLoadGameLinks
 * ~5717 / kixCQLoadIssuance ~5839 / kixCreatePrize ~5958).
 */
import type {
  GameLink,
  GameLinksResponse,
  IssuanceRow,
  IssuanceSummaryResponse,
  VoucherLookup,
  CreateTemplateBody
} from '@/api/portal-admin/types'

export const DISTRIBUTION_OPTIONS = [
  { value: 'on_win', label: 'Award on win' },
  { value: 'none', label: 'No coupon' }
] as const

export const OFFER_TYPE_OPTIONS = [
  { value: 'free', label: 'Free item' },
  { value: 'percent_off', label: 'Percent off' },
  { value: 'fixed_price', label: 'Fixed price' }
] as const

export function normalizeGameLinks(raw: GameLinksResponse | GameLink[]): GameLink[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') return raw.games ?? raw.items ?? []
  return []
}

export function normalizeIssuance(raw: IssuanceSummaryResponse | IssuanceRow[]): IssuanceRow[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') return raw.summary ?? []
  return []
}

/** A looked-up voucher is redeemable only when status is active. */
export function isRedeemable(v: VoucherLookup | null): boolean {
  return !!v && v.status === 'active'
}

/** Human title for a looked-up voucher (legacy: title || description || id). */
export function voucherTitle(v: VoucherLookup | null): string {
  if (!v) return ''
  return v.title || v.description || v.code || v.voucher_id || 'Voucher'
}

export interface TemplateForm {
  name: string
  description: string
  offer_type: 'free' | 'percent_off' | 'fixed_price'
  original_price: string // dollars, as typed
  discount_percent: string
  final_price: string // dollars
  inventory_count: string
  expires_on: string // ISO date or ''
}

export function blankTemplateForm(): TemplateForm {
  return {
    name: '',
    description: '',
    offer_type: 'free',
    original_price: '',
    discount_percent: '',
    final_price: '',
    inventory_count: '100',
    expires_on: ''
  }
}

/** Dollars string → integer cents (rounded). Empty → null. */
function toCents(dollars: string): number | null {
  const n = parseFloat(dollars)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}

/** ISO date (yyyy-mm-dd) → Unix seconds at midnight UTC. Empty → null. */
export function expiryToTs(iso: string): number | null {
  if (!iso) return null
  const ms = Date.parse(`${iso}T00:00:00Z`)
  if (Number.isNaN(ms)) return null
  return Math.floor(ms / 1000)
}

/** Assemble the POST /coupon-templates body (kixCreatePrize ~5977). Only the
 *  fields relevant to the chosen offer_type are sent. */
export function buildCreateBody(form: TemplateForm, brandId: string | number): CreateTemplateBody {
  const body: CreateTemplateBody = {
    brand_id: brandId,
    name: form.name.trim(),
    description: form.description.trim() || null,
    offer_type: form.offer_type,
    inventory_count: form.inventory_count ? parseInt(form.inventory_count, 10) : 100,
    expires_at: expiryToTs(form.expires_on)
  }
  const orig = toCents(form.original_price)
  if (orig !== null) body.original_price_cents = orig
  if (form.offer_type === 'percent_off') {
    const pct = parseInt(form.discount_percent, 10)
    if (Number.isFinite(pct)) body.discount_percent = pct
  }
  if (form.offer_type === 'fixed_price') {
    body.final_price_cents = toCents(form.final_price)
  }
  return body
}

/** Validate the create form (mirrors backend constraints). */
export function validateCreateTemplate(form: TemplateForm): string[] {
  const errs: string[] = []
  if (!form.name.trim()) errs.push('Name is required')
  if (form.offer_type === 'percent_off') {
    const pct = parseInt(form.discount_percent, 10)
    if (!Number.isFinite(pct) || pct < 1 || pct > 99) errs.push('Discount must be 1–99%')
  }
  if (form.offer_type === 'fixed_price') {
    const final = toCents(form.final_price)
    const orig = toCents(form.original_price)
    if (final === null) errs.push('Fixed price requires a final price')
    else if (orig !== null && final > orig)
      errs.push('Final price cannot exceed the original price')
  }
  return errs
}
