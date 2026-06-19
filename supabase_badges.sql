-- Запусти в Supabase → SQL Editor
-- Трекинг прочитанных сообщений

create table if not exists public.message_reads (
  user_id uuid references public.profiles(id) on delete cascade,
  rental_id uuid references public.rentals(id) on delete cascade,
  last_read_at timestamptz default now(),
  primary key (user_id, rental_id)
);
alter table public.message_reads enable row level security;
create policy "Users manage own reads" on public.message_reads
  for all using (auth.uid() = user_id);

-- Включить realtime для rentals (если ещё не включён)
alter publication supabase_realtime add table public.rentals;
