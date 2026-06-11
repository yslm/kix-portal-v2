# Deployment & Cutover SOP

This document covers (1) building + deploying portal-v2 to production and (2) the cutover procedure to switch users from legacy `portal.html` to portal-v2.

## Build

```bash
pnpm install
pnpm build
# Produces dist/ with assets keyed off VITE_BASE_URL (default: /portal/)
```

## Deployment target

portal-v2's default target is `/portal/` on the same origin as kix-platform. The `VITE_BASE_URL` env var controls the asset path; adjust in `.env.production` before building if you deploy to a different subpath or subdomain.

### nginx example

```nginx
location /portal/ {
  alias /var/www/kix-portal-v2/dist/;
  try_files $uri $uri/ /portal/index.html;
}
```

If deploying to a separate subdomain (e.g. `portal.kix.example.com`):

- Set `VITE_BASE_URL=/` in `.env.production`
- Configure CORS on backend `/api/v1/portal-admin/*` to allow the subdomain
- Adjust `signin.html` redirect URL in step 2 of cutover

## Cutover SOP

**Prerequisites:**

- All Plan 1-5 work committed and pushed
- Plan 6 E2E green
- Staging deployment tested manually for at least the 5 P0 views with real data

**Steps:**

1. **Build + deploy to production `/portal/`**
   - `pnpm build`
   - Copy `dist/` to production nginx target
   - Verify `https://<your-host>/portal/` returns the admin shell (with a test kix_token in localStorage, you should see the KiX sidebar)

2. **Modify `kix-platform/landing/signin.html`**
   - Find the post-login redirect logic
   - Change the default `next` from `/landing/portal.html` to `/portal/`
   - Keep the legacy URL accessible via `?legacy=1` query for emergency fallback
   - Commit + deploy kix-platform

3. **Watch for 1-2 weeks**
   - Monitor 401 / 5xx rate on `/api/v1/portal-admin/*`
   - Monitor session length (users not bouncing back to legacy?)
   - Collect merchant feedback

4. **Archive `portal.html`**
   - Move `kix-platform/landing/portal.html` → `kix-platform/landing/_archive/portal.html.legacy.2026-MM-DD`
   - Remove all references from `kix-platform/landing/*.html`
   - Update kix-platform documentation
   - Commit + deploy

## Rollback

If issues emerge during the 1-2 week monitoring window:

1. Revert signin.html redirect change in kix-platform
2. portal-v2 keeps running at `/portal/` (existing users with bookmarked URLs continue using it)
3. No data migration needed — backend is shared

## Per-view incremental deploy

If you want to ship one view at a time instead of all 18 at once:

1. Modify `signin.html` to redirect to portal-v2 ONLY for specific brand IDs (e.g., internal QA brands)
2. Expand gradually as views are verified
3. Full cutover only after internal validation
