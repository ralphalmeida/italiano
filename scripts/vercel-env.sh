#!/usr/bin/env bash
# Envia as variáveis do .env.local para a Vercel (login, usuários, notificações),
# grava o CRON_SECRET no GitHub (para o agendador dos lembretes) e faz deploy de produção.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env.local; set +a
for k in APP_EMAIL APP_PASSWORD APP_USERS SESSION_SECRET VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY CRON_SECRET; do
  for env in production preview; do
    printf '%s' "${!k}" | vercel env add "$k" "$env" --scope ralphalmeida --force
  done
done
printf '%s' "$CRON_SECRET" | gh secret set CRON_SECRET --repo ralphalmeida/italiano
vercel --prod --scope ralphalmeida
