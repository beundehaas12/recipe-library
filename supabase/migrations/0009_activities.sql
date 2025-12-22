-- Create activities table
create table public.user_activities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null, -- 'create_recipe', 'update_recipe', 'delete_recipe', 'create_collection', 'add_to_collection', etc.
  description text not null,
  metadata jsonb default '{}'::jsonb,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.user_activities enable row level security;

create policy "Users can view their own activities"
  on public.user_activities for select
  using (auth.uid() = user_id);

create policy "Users can insert their own activities"
  on public.user_activities for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own activities"
  on public.user_activities for update
  using (auth.uid() = user_id);

-- Enable Realtime for live updates (badges)
alter publication supabase_realtime add table public.user_activities;
