#!/usr/bin/env bash
set -euo pipefail

# One-way sync from KiX SSOT (kix-platform/landing/i18n/locales/) into
# kix-portal-v2/locales/synced/. Single source of truth lives in
# kix-platform; this script never writes back.
#
# SSOT layout (per-locale directory containing namespace JSON files):
#   landing/i18n/locales/en-US/{portal,common,auth,...}.json
#   landing/i18n/locales/zh-Hans/{portal,common,auth,...}.json
#   ...plus other languages we don't wire in Plan 1
#
# Keys inside files are flat-dotted (e.g. "portal.account.help") — handled by
# vue-i18n natively. We merge all namespace files per-locale at runtime in
# src/locales/index.ts.

SRC="${KIX_PLATFORM_PATH:-../kix-platform}/landing/i18n/locales"
DST="./locales/synced"

if [ ! -d "$SRC" ]; then
  echo "ERROR: $SRC not found." >&2
  echo "Set KIX_PLATFORM_PATH or ensure kix-platform sibling layout." >&2
  exit 1
fi

mkdir -p "$DST"
rsync -a --delete "$SRC/" "$DST/"
COUNT=$(find "$DST" -type f -name "*.json" | wc -l | tr -d ' ')
echo "✓ Synced $COUNT locale files from $SRC → $DST"
