-- Safe additive migration. Imported OSM features are NOT verified commercial services.
create table if not exists public.transport_points (
 id text primary key, osm_type text not null check(osm_type in ('node','way','relation')),
 osm_id bigint not null, kind text not null check(kind in ('bus_stop','bus_station','railway_station','railway_halt')),
 name text, name_bn text, name_en text, latitude double precision not null check(latitude between 20 and 27),
 longitude double precision not null check(longitude between 87 and 94), source_url text not null,
 source_name text not null default 'OpenStreetMap', last_seen_at timestamptz not null default now(),
 created_at timestamptz not null default now(), unique(osm_type,osm_id,kind)
);
create index if not exists idx_transport_points_kind on public.transport_points(kind);
create index if not exists idx_transport_points_coords on public.transport_points(latitude,longitude);
create index if not exists idx_transport_points_name on public.transport_points(lower(name));
create table if not exists public.import_runs (
 id bigint generated always as identity primary key, provider text not null, region_key text not null,
 status text not null check(status in ('success','failed')), imported_count integer not null default 0,
 detail text, started_at timestamptz not null default now()
);
create index if not exists idx_import_runs_provider on public.import_runs(provider,started_at desc);
