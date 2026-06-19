-- NeighborRent — Supabase Schema
-- Запускай в Supabase → SQL Editor

-- 1. PROFILES (расширяет auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  phone text,
  address text,
  lat double precision,
  lng double precision,
  rating numeric(3,2) default 5.0,
  rentals_count integer default 0,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Profiles visible to all" on public.profiles for select using (true);
create policy "Users edit own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- 2. ITEMS (вещи для аренды)
create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null check (category in ('tools','sport','home','tech','other')),
  price_per_hour numeric(10,2) not null,
  deposit numeric(10,2) not null default 0,
  images text[] default '{}',
  lat double precision not null,
  lng double precision not null,
  address text,
  is_available boolean default true,
  created_at timestamptz default now()
);
alter table public.items enable row level security;
create policy "Items visible to all" on public.items for select using (true);
create policy "Owners manage own items" on public.items for all using (auth.uid() = owner_id);

-- 3. RENTALS (аренды)
create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.items(id) on delete cascade not null,
  renter_id uuid references public.profiles(id) not null,
  owner_id uuid references public.profiles(id) not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  hours integer not null,
  total_price numeric(10,2) not null,
  deposit_hold numeric(10,2) not null default 0,
  status text default 'pending' check (status in ('pending','active','completed','cancelled')),
  created_at timestamptz default now()
);
alter table public.rentals enable row level security;
create policy "Rental parties can view" on public.rentals for select
  using (auth.uid() = renter_id or auth.uid() = owner_id);
create policy "Renters create rentals" on public.rentals for insert
  with check (auth.uid() = renter_id);
create policy "Rental parties update" on public.rentals for update
  using (auth.uid() = renter_id or auth.uid() = owner_id);

-- 4. REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  rental_id uuid references public.rentals(id) on delete cascade unique,
  reviewer_id uuid references public.profiles(id) not null,
  reviewee_id uuid references public.profiles(id) not null,
  item_id uuid references public.items(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);
alter table public.reviews enable row level security;
create policy "Reviews visible to all" on public.reviews for select using (true);
create policy "Reviewers write own" on public.reviews for insert with check (auth.uid() = reviewer_id);

-- 5. AUTO-CREATE PROFILE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 6. SEED — тестовые вещи (необязательно)
-- insert into public.items ... -- добавляй вручную после регистрации
