-- NeighborRent: таблица запросов на аренду
-- Запусти этот SQL в Supabase SQL Editor

create table if not exists public.rental_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text default 'other',
  lat float not null,
  lng float not null,
  address text,
  status text default 'open', -- open | fulfilled | expired
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- RLS
alter table public.rental_requests enable row level security;

create policy "Anyone can view open requests"
  on public.rental_requests for select using (true);

create policy "Users can insert own requests"
  on public.rental_requests for insert with check (auth.uid() = user_id);

create policy "Users can update own requests"
  on public.rental_requests for update using (auth.uid() = user_id);

create policy "Users can delete own requests"
  on public.rental_requests for delete using (auth.uid() = user_id);

-- Realtime
alter publication supabase_realtime add table public.rental_requests;
