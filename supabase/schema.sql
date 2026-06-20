-- Laszlo — couche Connaissance (Megathon). À exécuter dans le SQL editor Supabase.
-- Schéma révisé : notice = substrat neutre, 1 ligne par (œuvre × lang × source) ;
-- pas de colonne facet (les facettes sont des lentilles runtime).

create extension if not exists "pgcrypto";

create table if not exists museum (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique,
  city text
);

create table if not exists artist (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  birth_year   int,
  death_year   int,
  wikidata_qid text
);

create table if not exists movement (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  wikidata_qid text
);

create table if not exists artwork (
  id            uuid primary key default gen_random_uuid(),
  object_number text not null unique,
  title_en      text,
  title_nl      text,
  year          int,
  height_cm     numeric,        -- requis ARKit (taille physique)
  width_cm      numeric,
  image_iiif_id text,
  image_url     text,           -- hotlink IIIF (affichage)
  ref_image_url text,           -- rendition ARKit (Storage), œuvres trackées
  artist_id     uuid references artist(id),
  movement_id   uuid references movement(id),
  museum_id     uuid references museum(id),
  rights        text,
  wikidata_qid  text,
  tags          jsonb default '[]'::jsonb
);

create table if not exists notice (
  id           uuid primary key default gen_random_uuid(),
  artwork_id   uuid not null references artwork(id) on delete cascade,
  lang         text not null check (lang in ('en','nl')),
  source       text not null check (source in ('rijks','wikipedia')),
  text         text not null,
  sources      jsonb default '[]'::jsonb,
  groundedness text not null default 'review' check (groundedness in ('ok','review')),
  unique (artwork_id, lang, source)
);

create table if not exists hotspot (
  id             uuid primary key default gen_random_uuid(),
  artwork_id     uuid not null references artwork(id) on delete cascade,
  x              numeric not null check (x >= 0 and x <= 1),
  y              numeric not null check (y >= 0 and y <= 1),
  title          text not null,
  aspect         text,
  narration_text text not null,
  audio_url      text,          -- rempli à l'étape TTS (plus tard)
  duration_s     numeric,
  ord            int not null,
  unique (artwork_id, ord)
);

create index if not exists idx_artwork_artist   on artwork(artist_id);
create index if not exists idx_artwork_movement on artwork(movement_id);
create index if not exists idx_notice_artwork   on notice(artwork_id);
create index if not exists idx_hotspot_artwork  on hotspot(artwork_id);

-- Lecture publique (l'app lit via PostgREST). Écriture = service_role (bypass RLS).
alter table museum   enable row level security;
alter table artist   enable row level security;
alter table movement enable row level security;
alter table artwork  enable row level security;
alter table notice   enable row level security;
alter table hotspot  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['museum','artist','movement','artwork','notice','hotspot'] loop
    execute format('drop policy if exists "public read %1$s" on %1$s;', t);
    execute format('create policy "public read %1$s" on %1$s for select using (true);', t);
  end loop;
end $$;

-- Storage : créer un bucket public "artworks" (dashboard) pour les reference images ARKit.
