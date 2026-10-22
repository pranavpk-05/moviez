begin;
insert into public.departments(name) values('Direction'),('Writing'),('Production') on conflict do nothing;
-- A single trusted movie import is atomic; the browser never receives this permission.
create function public.sync_tmdb_movie(payload jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare s jsonb;p jsonb;f jsonb;c jsonb;g text;sid uuid;existing uuid;
begin
 if jsonb_array_length(payload->'films')<>1 then raise exception 'Exactly one movie is required';end if;
 for s in select value from jsonb_array_elements(payload->'sources') loop
  if s->>'name'<>'TMDB' then raise exception 'Unexpected source';end if;
  insert into public.source_provenance(id,name,external_id,url,license,checked_at,status,note)
  values((s->>'id')::uuid,'TMDB',s->>'externalId',s->>'url',s->>'license',(s->>'checkedAt')::date,'source-checked',s->>'note')
  on conflict(name,external_id) do update set url=excluded.url,license=excluded.license,checked_at=excluded.checked_at,note=excluded.note;
 end loop;
 for p in select value from jsonb_array_elements(payload->'people') loop
  if p->>'externalId'!~'^tmdb:[0-9]+$' then raise exception 'Invalid TMDB person';end if;
  select id into existing from public.technicians where external_id=p->>'externalId';
  if existing is not null and existing<>(p->>'id')::uuid then raise exception 'Person identity conflict';end if;
  select id into strict sid from public.source_provenance where name='TMDB' and external_id=p->'source'->>'externalId';
  insert into public.technicians(id,external_id,name,alternative_names,primary_department,subtitle,bio,color,initials,photo,image_rights,source_id,published)
  values((p->>'id')::uuid,p->>'externalId',p->>'name','{}',p->>'department',p->>'subtitle',p->>'bio',p->>'color',p->>'initials',p->>'photo',p->>'imageRights',sid,true)
  on conflict(id) do update set name=excluded.name,photo=excluded.photo,image_rights=excluded.image_rights,source_id=excluded.source_id,published=true;
  insert into public.external_identifiers(technician_id,provider,value) values((p->>'id')::uuid,'tmdb',p->'source'->>'externalId') on conflict(provider,value) do nothing;
 end loop;
 f:=payload->'films'->0;
 if f->>'externalId'!~'^tmdb:[0-9]+$' then raise exception 'Invalid TMDB movie';end if;
 select id into existing from public.movies where external_id=f->>'externalId';
 if existing is not null and existing<>(f->>'id')::uuid then raise exception 'Movie identity conflict';end if;
 select id into strict sid from public.source_provenance where name='TMDB' and external_id=f->'source'->>'externalId';
 insert into public.movies(id,external_id,title,original_title,year,language,countries,industry,synopsis,runtime,color,poster,backdrop,image_rights,source_id,published)
 values((f->>'id')::uuid,f->>'externalId',f->>'title',f->>'originalTitle',(f->>'year')::int,f->>'language',array(select jsonb_array_elements_text(f->'countries')),f->>'industry',f->>'synopsis',(f->>'runtime')::int,f->>'color',f->>'poster',f->>'backdrop',f->>'imageRights',sid,true)
 on conflict(id) do update set title=excluded.title,original_title=excluded.original_title,year=excluded.year,language=excluded.language,countries=excluded.countries,industry=excluded.industry,synopsis=excluded.synopsis,runtime=excluded.runtime,poster=excluded.poster,backdrop=excluded.backdrop,image_rights=excluded.image_rights,source_id=excluded.source_id,published=true;
 delete from public.movie_genres where movie_id=(f->>'id')::uuid;
 for g in select jsonb_array_elements_text(f->'genres') loop
  insert into public.genres(name) values(g) on conflict do nothing;
  insert into public.movie_genres(movie_id,genre) values((f->>'id')::uuid,g) on conflict do nothing;
 end loop;
 delete from public.crew_credits where movie_id=(f->>'id')::uuid and source_id=sid;
 for c in select value from jsonb_array_elements(f->'crew') loop
  insert into public.technician_roles(name,department) values(c->>'role',c->>'department') on conflict(name) do nothing;
  insert into public.crew_credits(movie_id,technician_id,role,department,source_id)
  values((f->>'id')::uuid,(c->>'person')::uuid,c->>'role',c->>'department',sid)
  on conflict(movie_id,technician_id,role) do update set source_id=excluded.source_id;
 end loop;
 insert into public.external_identifiers(movie_id,provider,value) values((f->>'id')::uuid,'tmdb',f->'source'->>'externalId') on conflict(provider,value) do nothing;
end $$;
revoke all on function public.sync_tmdb_movie(jsonb) from public,anon,authenticated;
grant execute on function public.sync_tmdb_movie(jsonb) to service_role;
commit;
