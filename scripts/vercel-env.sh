#!/usr/bin/env bash
# Envia APP_EMAIL, APP_PASSWORD e SESSION_SECRET do .env.local para a Vercel e faz deploy de produção.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env.local; set +a
for k in APP_EMAIL APP_PASSWORD SESSION_SECRET; do
  for env in production preview; do
    printf '%s' "${!k}" | vercel env add "$k" "$env" --scope ralphalmeida --force
  done
done
vercel --prod --scope ralphalmeida
