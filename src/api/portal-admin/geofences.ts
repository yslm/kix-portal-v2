import { http } from './http'
import type { GeofencesListResponse } from './types'

/**
 * Portal admin · Geofences (stores / locations) API.
 *
 * Mirrors the legacy `kixLoadGeofences()` fetcher in
 * `kix-platform/landing/portal.html` (~line 4722), which calls
 *   `fetch('/api/v1/portal-admin/locations')`
 * and reads `(data && data.locations) || []` off the response. The same
 * endpoint is hit from two other portal call-sites (QR picker on
 * view-coupons-qr at line 4618, redeem store-picker at line 4774) — all
 * three render off the SAME `Location[]` payload.
 *
 * The merchant-facing surface is called "Geofences · Stores" but the
 * wire model is `Location` (each store IS a geofence — centre point +
 * radius). Brand inferred from the JWT via `get_current_brand` — no
 * explicit `?brand=` param, same pattern as listCustomers() /
 * listAudiences() / listRules() / listAbTests() / listTemplates() /
 * fetchWallet().
 *
 * Plan 5 T6 ports ONLY the list-read endpoint. Deferred items (still
 * served by the legacy view at portal.html lines 2169-2199):
 *
 *   - "+ Add store" CTA + slide-in form (`kixToggleAddLocation()` at
 *     line 2170; `kixAddLocation()` at line 4748). The mutation hits
 *     the SAME `/locations` endpoint via POST with a
 *     `{ name, place_id, geocoded_address, radius_m, lat?, lng? }`
 *     payload (Wave1 PR-3 · B54/B55/B56/B57/B59 — server prefers
 *     `place_id` over raw `lat`/`lng` when both are present).
 *
 *   - Address autocomplete widget — Mapbox primary, Nominatim fallback
 *     (the inline IIFE `kixWireAddressWidget` at portal.html ~line 4790).
 *     Hides raw coordinates behind a geocoded `place_id` handle to
 *     stop the Class O leak the legacy editor used to bleed.
 *
 *   - Draggable map pin (`#loc-map` placeholder; map provider deferred
 *     behind `window.KIX_MAPBOX_TOKEN`).
 *
 *   - Radius slider (`#loc-radius`) with the live "X m" preview label
 *     (`#loc-radius-display`). Default value 50 m, range 20-500 m.
 *
 *   - Per-row Edit / Delete actions — not present in the legacy view
 *     either (the only mutation surface is the Add-store form). A
 *     future slice can layer them onto the same `/locations` endpoint
 *     family (PATCH / DELETE by id).
 *
 *   - The QR rotation flow (`/locations/<id>/qr` + `/qr/rotate`) — that
 *     belongs with the deferred view-coupons-qr migration in a later
 *     Plan, not with the stores list.
 *
 * @see src/views/kix/Geofences.vue
 */
export const listGeofences = () => http.get<GeofencesListResponse>('/api/v1/portal-admin/locations')
