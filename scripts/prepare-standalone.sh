#!/usr/bin/env bash
set -euo pipefail

DEFAULT_APP_DIR="/home/liggnett/app"
if [[ -d "$DEFAULT_APP_DIR" ]]; then
	APP_DIR="$DEFAULT_APP_DIR"
else
	APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
fi
STANDALONE_DIR="${STANDALONE_DIR:-$APP_DIR/.next/standalone}"

mkdir -p "$STANDALONE_DIR/.next"

# Sync static assets
rm -rf "$STANDALONE_DIR/.next/static"
cp -a "$APP_DIR/.next/static" "$STANDALONE_DIR/.next/"

# Sync public assets
rm -rf "$STANDALONE_DIR/public"
cp -a "$APP_DIR/public" "$STANDALONE_DIR/"

# Ensure ownership (skip in CI or when user does not exist)
if command -v getent >/dev/null 2>&1 && getent passwd liggnett >/dev/null 2>&1; then
	if [[ "$(id -u)" == "0" ]]; then
		chown -R liggnett:liggnett "$STANDALONE_DIR/.next" "$STANDALONE_DIR/public"
	fi
fi
