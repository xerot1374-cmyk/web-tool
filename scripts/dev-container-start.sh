#!/bin/sh
set -eu

cd /app

LOCK_HASH_FILE="/app/node_modules/.package-lock.sha256"
PRISMA_SCHEMA_HASH_FILE="/app/node_modules/.prisma-schema.sha256"
NEXT_VERSION_FILE="/app/.next/.next-version"

mkdir -p /app/node_modules /app/.next

CURRENT_LOCK_HASH="$(sha256sum package-lock.json | awk '{print $1}')"
PREVIOUS_LOCK_HASH=""

if [ -f "$LOCK_HASH_FILE" ]; then
  PREVIOUS_LOCK_HASH="$(cat "$LOCK_HASH_FILE")"
fi

if [ ! -d /app/node_modules/next ] || [ "$CURRENT_LOCK_HASH" != "$PREVIOUS_LOCK_HASH" ]; then
  echo "[dev-container] package-lock changed or node_modules missing, running npm ci"
  npm ci
  printf '%s' "$CURRENT_LOCK_HASH" > "$LOCK_HASH_FILE"
  rm -rf /app/.next/*
fi

CURRENT_PRISMA_SCHEMA_HASH="$(sha256sum prisma/schema.prisma | awk '{print $1}')"
PREVIOUS_PRISMA_SCHEMA_HASH=""

if [ -f "$PRISMA_SCHEMA_HASH_FILE" ]; then
  PREVIOUS_PRISMA_SCHEMA_HASH="$(cat "$PRISMA_SCHEMA_HASH_FILE")"
fi

if [ "$CURRENT_PRISMA_SCHEMA_HASH" != "$PREVIOUS_PRISMA_SCHEMA_HASH" ]; then
  echo "[dev-container] Prisma schema changed, generating Prisma Client"
  npx prisma generate
  printf '%s' "$CURRENT_PRISMA_SCHEMA_HASH" > "$PRISMA_SCHEMA_HASH_FILE"
  rm -rf /app/.next/*
fi

CURRENT_NEXT_VERSION="$(node -p "require('./node_modules/next/package.json').version")"
PREVIOUS_NEXT_VERSION=""

if [ -f "$NEXT_VERSION_FILE" ]; then
  PREVIOUS_NEXT_VERSION="$(cat "$NEXT_VERSION_FILE")"
fi

if [ "$CURRENT_NEXT_VERSION" != "$PREVIOUS_NEXT_VERSION" ]; then
  echo "[dev-container] Next.js version changed ($PREVIOUS_NEXT_VERSION -> $CURRENT_NEXT_VERSION), clearing .next cache"
  rm -rf /app/.next/*
  printf '%s' "$CURRENT_NEXT_VERSION" > "$NEXT_VERSION_FILE"
fi

exec npm run dev -- --hostname 0.0.0.0 --port "${APP_PORT:-3100}"
