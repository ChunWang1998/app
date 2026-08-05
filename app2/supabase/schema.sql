-- 急廁 Go — Supabase schema
-- 在 Supabase Dashboard → SQL Editor 貼上執行一次

-- Votes: one row per (place, device)
create table if not exists public.votes (
  place_id text not null,
  device_id uuid not null,
  delta smallint not null check (delta in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (place_id, device_id)
);

create index if not exists votes_place_id_idx on public.votes (place_id);

-- Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  device_id uuid not null,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 30),
  created_at timestamptz not null default now()
);

create index if not exists comments_place_created_idx
  on public.comments (place_id, created_at desc);

-- Keep at most 10 newest comments per place
create or replace function public.trim_place_comments()
returns trigger
language plpgsql
as $$
begin
  delete from public.comments
  where id in (
    select id
    from public.comments
    where place_id = new.place_id
    order by created_at desc
    offset 10
  );
  return new;
end;
$$;

drop trigger if exists trg_trim_place_comments on public.comments;
create trigger trg_trim_place_comments
after insert on public.comments
for each row
execute function public.trim_place_comments();

-- Aggregate scores (optional convenience view)
create or replace view public.place_vote_scores
with (security_invoker = true)
as
select
  place_id,
  coalesce(sum(delta), 0)::int as score
from public.votes
group by place_id;

-- RLS: public read; anon insert only (no login)
alter table public.votes enable row level security;
alter table public.comments enable row level security;

drop policy if exists "votes_select_all" on public.votes;
create policy "votes_select_all"
  on public.votes for select
  to anon, authenticated
  using (true);

drop policy if exists "votes_insert_own" on public.votes;
create policy "votes_insert_own"
  on public.votes for insert
  to anon, authenticated
  with check (delta in (-1, 1));

drop policy if exists "comments_select_all" on public.comments;
create policy "comments_select_all"
  on public.comments for select
  to anon, authenticated
  using (true);

drop policy if exists "comments_insert" on public.comments;
create policy "comments_insert"
  on public.comments for insert
  to anon, authenticated
  with check (char_length(trim(body)) > 0 and char_length(body) <= 30);

grant select on public.place_vote_scores to anon, authenticated;
grant select, insert on public.votes to anon, authenticated;
grant select, insert on public.comments to anon, authenticated;
