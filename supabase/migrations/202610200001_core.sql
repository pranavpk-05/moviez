begin;
create extension if not exists pg_trgm;
create table public.source_provenance (
 id uuid primary key default gen_random_uuid(), name text not null, external_id text not null,
 url text not null check(url ~ '^https://'), license text not null, checked_at date not null,
 status text not null check(status in ('source-checked','needs-review')), note text,
 unique(name,external_id)
);
create table public.departments (name text primary key);
insert into public.departments values ('Cinematography'),('Film editing'),('Music composition'),('Sound design'),('Sound editing'),('Production sound mixing'),('Production design'),('Art direction'),('Costume design'),('Visual effects'),('Makeup and prosthetics'),('Choreography'),('Color grading'),('Animation');
create table public.technician_roles (name text primary key, department text not null references public.departments(name));
create table public.movies (
 id uuid primary key default gen_random_uuid(), external_id text not null unique,
 title text not null, original_title text not null, year int not null check(year between 1880 and 2200),
 language text not null, countries text[] not null default '{}', industry text not null,
 synopsis text, runtime int check(runtime>0), color text not null default '#516b65',
 poster text, backdrop text, image_rights text, published boolean not null default false,
 source_id uuid not null references public.source_provenance(id),
 search_vector tsvector generated always as (to_tsvector('simple',title||' '||original_title||' '||language)) stored,
 check ((poster is null and backdrop is null) or image_rights is not null)
);
create table public.technicians (
 id uuid primary key default gen_random_uuid(), external_id text not null unique, name text not null,
 alternative_names text[] not null default '{}', primary_department text not null references public.departments(name),
 subtitle text not null default '', bio text, color text not null default '#516b65', initials text not null,
 photo text, image_rights text, published boolean not null default false,
 source_id uuid not null references public.source_provenance(id),
 search_vector tsvector generated always as (to_tsvector('simple',name||' '||primary_department)) stored,
 check(photo is null or image_rights is not null)
);
create table public.crew_credits (
 id uuid primary key default gen_random_uuid(), movie_id uuid not null references public.movies(id) on delete cascade,
 technician_id uuid not null references public.technicians(id) on delete cascade,
 role text not null references public.technician_roles(name), department text not null references public.departments(name),
 source_id uuid not null references public.source_provenance(id), unique(movie_id,technician_id,role)
);
create table public.genres (name text primary key);
create table public.movie_genres (movie_id uuid references public.movies(id) on delete cascade,genre text references public.genres(name),primary key(movie_id,genre));
create table public.external_identifiers (
 id uuid primary key default gen_random_uuid(), movie_id uuid references public.movies(id) on delete cascade,
 technician_id uuid references public.technicians(id) on delete cascade, provider text not null, value text not null,
 check(num_nonnulls(movie_id,technician_id)=1), unique(provider,value)
);
create table public.style_tags (name text primary key);
insert into public.style_tags(name) values ('Natural lighting'),('Naturalistic visuals'),('High-contrast lighting'),('Atmospheric cinematography'),('Handheld camerawork'),('Long takes'),('Symmetrical compositions'),('Experimental camera movement'),('Fast-paced editing'),('Slow, contemplative pacing'),('Nonlinear storytelling'),('Montage-heavy editing'),('Continuity-driven editing'),('Minimalist scoring'),('Atmospheric sound'),('Electronic soundtracks'),('Orchestral composition'),('Experimental sound design');
create table public.movie_style_annotations (
 id uuid primary key default gen_random_uuid(),movie_id uuid not null references public.movies(id) on delete cascade,
 tag text not null references public.style_tags(name),note text not null,source_id uuid not null references public.source_provenance(id),
 unique(movie_id,tag,source_id)
);
create table public.technician_style_evidence (
 annotation_id uuid not null references public.movie_style_annotations(id) on delete cascade,
 technician_id uuid not null references public.technicians(id) on delete cascade, primary key(annotation_id,technician_id)
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,display_name text not null default '',
 avatar_url text,industries text[] not null default '{Malayalam,Hollywood}',genres text[] not null default '{}',
 departments text[] not null default '{}',revision int not null default 0,created_at timestamptz not null default now()
);
create table public.favourite_movies (user_id uuid references public.profiles(id) on delete cascade,movie_id uuid references public.movies(id) on delete cascade,primary key(user_id,movie_id));
create table public.favourite_technicians (user_id uuid references public.profiles(id) on delete cascade,technician_id uuid references public.technicians(id) on delete cascade,primary key(user_id,technician_id));
create table public.user_style_preferences (user_id uuid references public.profiles(id) on delete cascade,tag text references public.style_tags(name),primary key(user_id,tag));
create table public.saved_collections (id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,name text not null check(length(trim(name)) between 1 and 80),unique(id,user_id));
create table public.saved_collection_entries (
 collection_id uuid not null,user_id uuid not null,
 movie_id uuid references public.movies(id) on delete cascade,technician_id uuid references public.technicians(id) on delete cascade,
 id uuid primary key default gen_random_uuid(),foreign key(collection_id,user_id) references public.saved_collections(id,user_id) on delete cascade,
 check(num_nonnulls(movie_id,technician_id)=1)
);
create unique index collection_movie_unique on public.saved_collection_entries(collection_id,movie_id) where movie_id is not null;
create unique index collection_technician_unique on public.saved_collection_entries(collection_id,technician_id) where technician_id is not null;
create table public.recommendation_events (id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,technician_id uuid not null references public.technicians(id) on delete cascade,algorithm text not null default 'content-v1',created_at timestamptz not null default now());
create table public.recommendation_feedback (user_id uuid references public.profiles(id) on delete cascade,technician_id uuid references public.technicians(id) on delete cascade,action text not null check(action in ('like','dismiss')),updated_at timestamptz not null default now(),primary key(user_id,technician_id));
create table public.ingestion_jobs (id uuid primary key default gen_random_uuid(),source text not null,status text not null,counts jsonb not null default '{}',errors jsonb not null default '[]',started_at timestamptz not null default now(),finished_at timestamptz);
create index movies_search on public.movies using gin(search_vector);
create index movies_title_trgm on public.movies using gin(title gin_trgm_ops);
create index people_search on public.technicians using gin(search_vector);
create index people_name_trgm on public.technicians using gin(name gin_trgm_ops);
create index people_aliases on public.technicians using gin(alternative_names);
create index movies_industry_year on public.movies(industry,year);
create index credits_technician on public.crew_credits(technician_id,movie_id);
create index credits_movie on public.crew_credits(movie_id,department);
create index collection_owner on public.saved_collections(user_id);
create index collection_entry_owner on public.saved_collection_entries(user_id);
create index events_owner on public.recommendation_events(user_id,created_at);
create index annotations_movie on public.movie_style_annotations(movie_id);
-- All objects are read-only for app roles unless an explicit owner policy below allows writes.
do $$ declare t text; begin
 foreach t in array array['source_provenance','departments','technician_roles','movies','technicians','crew_credits','genres','movie_genres','external_identifiers','style_tags','movie_style_annotations','technician_style_evidence','profiles','favourite_movies','favourite_technicians','user_style_preferences','saved_collections','saved_collection_entries','recommendation_events','recommendation_feedback','ingestion_jobs'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
 foreach t in array array['source_provenance','departments','technician_roles','genres','style_tags'] loop
  execute format('create policy catalogue_read on public.%I for select to anon,authenticated using (true)',t);
 end loop;
 foreach t in array array['profiles','favourite_movies','favourite_technicians','user_style_preferences','saved_collections','saved_collection_entries','recommendation_events','recommendation_feedback'] loop
  execute format('create policy private_owner on public.%I for all to authenticated using (auth.uid() = %I) with check (auth.uid() = %I)',t,case when t='profiles' then 'id' else 'user_id' end,case when t='profiles' then 'id' else 'user_id' end);
 end loop;
end $$;
create policy published_movies on public.movies for select to anon,authenticated using(published);
create policy published_people on public.technicians for select to anon,authenticated using(published);
create policy published_credits on public.crew_credits for select to anon,authenticated using(exists(select 1 from public.movies m where m.id=movie_id and m.published) and exists(select 1 from public.technicians p where p.id=technician_id and p.published));
create policy published_genres on public.movie_genres for select to anon,authenticated using(exists(select 1 from public.movies m where m.id=movie_id and m.published));
create policy published_ids on public.external_identifiers for select to anon,authenticated using(exists(select 1 from public.movies m where m.id=movie_id and m.published) or exists(select 1 from public.technicians p where p.id=technician_id and p.published));
create policy published_annotations on public.movie_style_annotations for select to anon,authenticated using(exists(select 1 from public.movies m where m.id=movie_id and m.published));
create policy published_style_evidence on public.technician_style_evidence for select to anon,authenticated using(exists(select 1 from public.movie_style_annotations a where a.id=annotation_id) and exists(select 1 from public.technicians t where t.id=technician_id and t.published));
grant usage on schema public to anon,authenticated;
grant select on public.source_provenance,public.departments,public.technician_roles,public.movies,public.technicians,public.crew_credits,public.genres,public.movie_genres,public.external_identifiers,public.style_tags,public.movie_style_annotations,public.technician_style_evidence to anon,authenticated;
grant select,insert,update,delete on public.profiles,public.favourite_movies,public.favourite_technicians,public.user_style_preferences,public.saved_collections,public.saved_collection_entries,public.recommendation_events,public.recommendation_feedback to authenticated;
-- Auth trigger has a fixed search path and no user-controlled SQL.
create function public.new_user_profile() returns trigger language plpgsql security definer set search_path='' as $$ begin
 insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''));return new;end $$;
revoke all on function public.new_user_profile() from public;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_user_profile();
commit;
