// Esquema único para PGlite (desarrollo) y PostgreSQL/Supabase (producción).
// Se aplica de forma idempotente al iniciar la conexión. La copia en supabase/schema.sql
// es la misma definición, para ejecutarla manualmente en el SQL Editor de Supabase.

export const SCHEMA_SQL = `
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  full_name text not null,
  birth_date date,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  experience text not null default 'principiante' check (experience in ('principiante', 'intermedio', 'avanzado')),
  interests jsonb not null default '[]'::jsonb,
  goal text,
  horizon text,
  risk_tolerance text check (risk_tolerance in ('baja', 'media', 'alta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip text,
  user_agent text
);
create index if not exists sessions_user_idx on sessions (user_id);

create table if not exists password_resets (
  token_hash text primary key,
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id) on delete cascade,
  type text not null,
  title text not null,
  details jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  created_at timestamptz not null default now()
);
create index if not exists activity_user_created_idx on activity_log (user_id, created_at desc);
create index if not exists activity_type_idx on activity_log (type, created_at desc);

create table if not exists watchlist (
  user_id uuid not null references app_users(id) on delete cascade,
  symbol text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, symbol)
);

create table if not exists analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  kind text not null default 'simulacion',
  nombre text not null,
  input jsonb not null,
  nivel text not null check (nivel in ('bajo', 'medio', 'alto')),
  resultado jsonb not null,
  raw_response text
);
create index if not exists analyses_user_created_idx on analyses (user_id, created_at desc);

create table if not exists chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_conversations_user_idx on chat_conversations (user_id, updated_at desc);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chat_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_conv_idx on chat_messages (conversation_id, created_at);

create table if not exists news_sources (
  id serial primary key,
  name text not null,
  url text not null unique,
  category text not null,
  provider text not null,
  enabled boolean not null default true,
  last_fetched_at timestamptz,
  last_status text,
  last_error text,
  last_count integer not null default 0
);

create table if not exists news_articles (
  id uuid primary key default gen_random_uuid(),
  source_id integer references news_sources(id) on delete set null,
  source_name text not null,
  title text not null,
  title_key text not null unique,
  url text not null unique,
  summary text,
  category text not null,
  published_at timestamptz not null,
  fetched_at timestamptz not null default now()
);
create index if not exists news_articles_cat_pub_idx on news_articles (category, published_at desc);
create index if not exists news_articles_pub_idx on news_articles (published_at desc);

create table if not exists saved_news (
  user_id uuid not null references app_users(id) on delete cascade,
  article_id uuid not null references news_articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

-- Reparación idempotente: valores JSON guardados como texto (doble codificación) se convierten a JSON real.
update app_users set interests = (interests #>> '{}')::jsonb where jsonb_typeof(interests) = 'string';
update activity_log set details = (details #>> '{}')::jsonb where jsonb_typeof(details) = 'string';
update analyses set input = (input #>> '{}')::jsonb where jsonb_typeof(input) = 'string';
update analyses set resultado = (resultado #>> '{}')::jsonb where jsonb_typeof(resultado) = 'string';
update chat_messages set meta = (meta #>> '{}')::jsonb where jsonb_typeof(meta) = 'string';

-- El servidor se conecta con un rol propietario (que omite RLS). Activar RLS sin políticas
-- bloquea el acceso directo desde la API pública de Supabase (anon/authenticated).
alter table app_users enable row level security;
alter table sessions enable row level security;
alter table password_resets enable row level security;
alter table activity_log enable row level security;
alter table watchlist enable row level security;
alter table analyses enable row level security;
alter table chat_conversations enable row level security;
alter table chat_messages enable row level security;
alter table news_sources enable row level security;
alter table news_articles enable row level security;
alter table saved_news enable row level security;
`;
