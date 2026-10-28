create extension if not exists pgcrypto;
create table if not exists public.projects(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,name text not null,customer text not null default '',reference text not null,status text not null default 'Draft',revision integer not null default 1,room_width integer not null,room_height integer not null,room_depth integer not null,wall_clearance integer not null default 20,component_gap integer not null default 2,snap integer not null default 50,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.project_items(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,name text not null,type text not null,x integer not null default 0,y integer not null default 0,z integer not null default 0,width integer not null,height integer not null,depth integer not null,shelves integer not null default 0,doors integer not null default 0,material_id text not null,finish text not null default '',notes text not null default '',locked boolean not null default false,hardware text not null default 'Handleless',edge_banding text not null default 'Matching 1mm');
create table if not exists public.project_revisions(id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id) on delete cascade,revision integer not null,snapshot jsonb not null,created_at timestamptz not null default now(),unique(project_id,revision));
alter table public.projects enable row level security;alter table public.project_items enable row level security;alter table public.project_revisions enable row level security;
drop policy if exists "projects_owner_all" on public.projects;create policy "projects_owner_all" on public.projects for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
drop policy if exists "items_owner_all" on public.project_items;create policy "items_owner_all" on public.project_items for all using(exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid())) with check(exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid()));
drop policy if exists "revisions_owner_all" on public.project_revisions;create policy "revisions_owner_all" on public.project_revisions for all using(exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid())) with check(exists(select 1 from public.projects p where p.id=project_id and p.user_id=auth.uid()));
create index if not exists project_items_project_idx on public.project_items(project_id);create index if not exists project_revisions_project_idx on public.project_revisions(project_id);
create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now();return new;end $$;
drop trigger if exists projects_set_updated_at on public.projects;create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
alter table public.project_items add column if not exists rotation integer not null default 0;

alter table public.projects add column if not exists address text not null default '';
alter table public.projects add column if not exists project_notes text not null default '';
alter table public.projects add column if not exists archived boolean not null default false;
alter table public.projects add column if not exists service_clearance integer not null default 50;
alter table public.project_items add column if not exists visible boolean not null default true;
alter table public.project_items add column if not exists layer text not null default 'Joinery';
alter table public.project_items add column if not exists group_id uuid;

-- Complete design snapshots are saved atomically with optimistic concurrency.
alter table public.projects add column if not exists design_snapshot jsonb;
alter table public.projects add column if not exists save_version bigint not null default 0;
create or replace function public.save_design(design jsonb, expected_version bigint)
returns bigint language plpgsql security invoker set search_path = public as $$
declare existing public.projects; next_version bigint; project_id uuid := (design->>'id')::uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  -- Serialize project creation and updates, including concurrent first saves.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 1));
  perform pg_advisory_xact_lock(hashtextextended(project_id::text, 0));
  select * into existing from public.projects where id=project_id for update;
  if found then
    if existing.user_id <> auth.uid() then raise exception 'Access denied'; end if;
    if existing.save_version <> expected_version then raise exception 'Save conflict'; end if;
    next_version := existing.save_version+1;
    update public.projects set name=design->>'name', customer=coalesce(design->>'customer',''),
      reference=design->>'reference', status=design->>'status', revision=(design->>'revision')::integer,
      room_width=(design->>'roomWidth')::integer,room_height=(design->>'roomHeight')::integer,
      room_depth=(design->>'roomDepth')::integer,design_snapshot=design,save_version=next_version
      where id=project_id;
  else
    if expected_version <> 0 then raise exception 'Save conflict: project deleted'; end if;
    if (select count(*) from public.projects where user_id=auth.uid()) >= 2 then
      raise exception 'Basic plan allows two projects. Export or delete a project first.';
    end if;
    next_version := 1;
    insert into public.projects(id,user_id,name,customer,reference,status,revision,room_width,room_height,room_depth,design_snapshot,save_version)
    values(project_id,auth.uid(),design->>'name',coalesce(design->>'customer',''),design->>'reference',design->>'status',
      (design->>'revision')::integer,(design->>'roomWidth')::integer,(design->>'roomHeight')::integer,
      (design->>'roomDepth')::integer,design,next_version);
  end if;
  return next_version;
end $$;
revoke all on function public.save_design(jsonb,bigint) from public;
grant execute on function public.save_design(jsonb,bigint) to authenticated;

-- Keep the Basic limit enforced even for direct REST inserts.
create or replace function public.enforce_basic_project_limit() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,1));
  if (select count(*) from public.projects where user_id=new.user_id)>=2 then
    raise exception 'Basic plan allows two projects';
  end if;
  return new;
end $$;
drop trigger if exists projects_basic_limit on public.projects;
create trigger projects_basic_limit before insert on public.projects for each row execute function public.enforce_basic_project_limit();
