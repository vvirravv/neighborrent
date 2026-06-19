-- Гаманець власника — виконай в Supabase SQL Editor
-- supabase.com/dashboard/project/aouekfafucoalxmmdxza/editor

-- Баланс у профілі
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_card TEXT;

-- Запити на виведення
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payout_card TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending / sent / rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Власник бачить свої запити" ON withdrawal_requests
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Власник створює запити" ON withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
