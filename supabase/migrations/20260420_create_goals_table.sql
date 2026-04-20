-- Goals: hustle-specific and global financial targets
create table public.goals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  hustle_id uuid references public.hustles(id) on delete cascade,        -- null = global goal
  title text not null,
  target_amount decimal(10,2) not null check (target_amount > 0),
  type text not null check (type in ('hustle', 'global')) default 'global',
  timeframe_start date,
  timeframe_end date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.goals enable row level security;

create policy "Users can view own goals"
  on public.goals for select using (auth.uid() = user_id);

create policy "Users can insert own goals"
  on public.goals for insert with check (auth.uid() = user_id);

create policy "Users can update own goals"
  on public.goals for update using (auth.uid() = user_id);

create policy "Users can delete own goals"
  on public.goals for delete using (auth.uid() = user_id);

create index idx_goals_user_id on public.goals(user_id);
create index idx_goals_hustle_id on public.goals(hustle_id);
