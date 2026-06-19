#!/bin/bash
# Usage: bash deploy-stripe.sh YOUR_SUPABASE_TOKEN YOUR_STRIPE_SECRET_KEY
set -e

TOKEN=$1
STRIPE_KEY=$2
REF="aouekfafucoalxmmdxza"

if [ -z "$TOKEN" ] || [ -z "$STRIPE_KEY" ]; then
  echo "Usage: bash deploy-stripe.sh sbp_xxxxx sk_test_xxxxx"
  exit 1
fi

echo "Setting Stripe secret..."
SUPABASE_ACCESS_TOKEN=$TOKEN npx supabase secrets set \
  STRIPE_SECRET_KEY=$STRIPE_KEY \
  --project-ref $REF

echo "Deploying create-checkout..."
SUPABASE_ACCESS_TOKEN=$TOKEN npx supabase functions deploy create-checkout \
  --project-ref $REF --no-verify-jwt

echo "Deploying verify-payment..."
SUPABASE_ACCESS_TOKEN=$TOKEN npx supabase functions deploy verify-payment \
  --project-ref $REF --no-verify-jwt

echo "Done! Stripe connected."
