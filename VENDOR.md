# Vendor Origin

This repository was forked from [Daymychen/art-design-pro](https://github.com/Daymychen/art-design-pro) (MIT License).

**Forked at upstream commit:** `f3aaf58eec1a0e988f162352c33862327a484f95` **Fork created:** 2026-06-11 **Reason:** See `kix-platform/docs/superpowers/specs/2026-06-11-portal-vue-migration-design.md` §3 — risk mitigation against individual-maintainer bus factor.

## Update policy

- Do not blindly merge `upstream/main`. To pick up upstream fixes:
  ```bash
  git fetch upstream
  git log f3aaf58e..upstream/main --oneline   # review what's new
  # Cherry-pick selectively, or merge with conflict resolution by hand.
  ```
- KiX-specific modifications live in clearly demarcated paths:
  - `.env.*`
  - `vite.config.ts` (alias addition only)
  - `scripts/sync-locales.sh`
  - `locales/` (new dir)
  - `src/locales/index.ts` (loader)
  - `src/router/guards.ts`, `src/router/portal-routes.ts`
  - `src/utils/http/` (KiX token + 401 redirect)
  - `src/config/menu.ts` (KiX sidebar)
  - `src/views/kix/`
  - `src/api/portal-admin/`
- Other files: do not modify in place. If a vendor file needs fixing, document the patch in `patches/<filename>.patch`.

## License

Upstream MIT license retained verbatim in `LICENSE`.
