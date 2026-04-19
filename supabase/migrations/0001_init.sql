-- 0001_init.sql
set search_path = public;

create extension if not exists "pgcrypto";

create table if not exists connections (
  id                uuid primary key default gen_random_uuid(),
  session_id        text not null,
  provider          text not null default 'github',
  composio_conn_id  text not null,
  github_login      text,
  created_at        timestamptz not null default now(),
  unique (session_id, provider)
);

create index if not exists connections_session_idx on connections(session_id);

create table if not exists jobs (
  id             uuid primary key default gen_random_uuid(),
  connection_id  uuid references connections(id) on delete cascade,
  repo           text not null,
  since          text not null,
  audience       text not null,
  status         text not null default 'pending',
  step           text,
  progress       int  not null default 0,
  error          text,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index if not exists jobs_connection_idx on jobs(connection_id);

create table if not exists digests (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid references jobs(id) on delete cascade,
  audience      text not null,
  script        text not null,
  audio_path    text,
  pr_numbers    int[] not null default '{}',
  created_at    timestamptz not null default now()
);

create index if not exists digests_job_idx on digests(job_id);

create table if not exists pr_classifications (
  repo        text not null,
  pr_number   int  not null,
  head_sha    text not null,
  kind        text not null,
  reason      text,
  created_at  timestamptz not null default now(),
  primary key (repo, pr_number, head_sha)
);

-- Storage bucket (create via SQL editor or dashboard — this SQL form works)
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;
