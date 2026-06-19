#!/bin/bash
# Запустити: bash deploy.sh SUPABASE_TOKEN STRIPE_SECRET_KEY
set -e

SUPABASE_TOKEN=$1
STRIPE_SECRET=$2
REF="aouekfafucoalxmmdxza"

if [ -z "$SUPABASE_TOKEN" ] || [ -z "$STRIPE_SECRET" ]; then
  echo "❌ Використання: bash deploy.sh sbp_SUPABASE_TOKEN sk_live_STRIPE_SECRET"
  echo ""
  echo "Де взяти:"
  echo "  Supabase token → supabase.com/dashboard/account/tokens"
  echo "  Stripe secret  → dashboard.stripe.com/apikeys"
  exit 1
fi

echo "🔑 Встановлюємо Stripe секрет..."
SUPABASE_ACCESS_TOKEN=$SUPABASE_TOKEN npx supabase secrets set \
  STRIPE_SECRET_KEY=$STRIPE_SECRET \
  --project-ref $REF

echo "🚀 Деплоємо create-stripe-checkout..."
SUPABASE_ACCESS_TOKEN=$SUPABASE_TOKEN npx supabase functions deploy create-stripe-checkout \
  --project-ref $REF --no-verify-jwt

echo "🚀 Деплоємо verify-stripe-payment..."
SUPABASE_ACCESS_TOKEN=$SUPABASE_TOKEN npx supabase functions deploy verify-stripe-payment \
  --project-ref $REF --no-verify-jwt

echo "🚀 Деплоємо release-deposit..."
SUPABASE_ACCESS_TOKEN=$SUPABASE_TOKEN npx supabase functions deploy release-deposit \
  --project-ref $REF --no-verify-jwt

echo ""
echo "✅ Готово! Stripe підключено."
echo ""
echo "⚠️  Не забудь запустити SQL міграцію в Supabase SQL Editor:"
echo "  supabase.com/dashboard/project/$REF/editor"
echo "  → відкрий файл supabase_stripe.sql та виконай"
