#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/liggnett/app"
STANDALONE_DIR="$APP_DIR/.next/standalone"

mkdir -p "$STANDALONE_DIR/.next"

# Sync static assets
rm -rf "$STANDALONE_DIR/.next/static"
cp -a "$APP_DIR/.next/static" "$STANDALONE_DIR/.next/"

# Sync public assets
rm -rf "$STANDALONE_DIR/public"
cp -a "$APP_DIR/public" "$STANDALONE_DIR/"

# Ensure ownership
chown -R liggnett:liggnett "$STANDALONE_DIR/.next" "$STANDALONE_DIR/public"
