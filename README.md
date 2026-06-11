# KiX Portal v2

A modern Vue 3 rewrite of the KiX Ads Manager merchant portal, replacing the legacy `kix-platform/landing/portal.html`.

> **Vendored from:** [Daymychen/art-design-pro](https://github.com/Daymychen/art-design-pro) — see [VENDOR.md](./VENDOR.md).

## Quickstart

```bash
pnpm install
pnpm dev          # http://localhost:3006/portal/
pnpm test         # unit tests (vitest)
pnpm e2e          # end-to-end tests (playwright)
pnpm build        # production build → dist/
```

## Project layout

- `src/views/kix/` — 18 KiX-specific views (Overview, Settings, Campaigns, …, Rewards)
- `src/api/portal-admin/` — KiX backend API helpers
- `src/components/` — shared components (StatusBadge, …)
- `src/utils/format/`, `src/utils/kix/` — shared utilities (fmtSgd, resolveBrandId)
- `locales/synced/` — synced from kix-platform SSOT (gitignored; regenerate via `pnpm sync:locales`)
- `locales/portal/` — portal-v2-specific i18n keys

## Documentation

- [PROGRESS.md](./PROGRESS.md) — week-by-week status + deferred items
- [DEPLOY.md](./DEPLOY.md) — build, deployment, and cutover procedure
- [VENDOR.md](./VENDOR.md) — fork origin and update policy
- Design spec + plans: `../kix-platform/docs/superpowers/specs/` + `plans/`
