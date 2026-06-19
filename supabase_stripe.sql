-- Stripe payment fields for rentals table
-- Запусти в Supabase SQL Editor: supabase.com/dashboard/project/aouekfafucoalxmmdxza/editor

ALTER TABLE rentals
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'held';
