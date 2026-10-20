begin;
alter table public.technician_roles add constraint role_department_unique unique(name,department);
alter table public.crew_credits add constraint credit_role_department foreign key(role,department) references public.technician_roles(name,department);
create function public.source_json(s public.source_provenance) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('name',s.name,'externalId',s.external_id,'url',s.url,'license',s.license,'checkedAt',s.checked_at,'status',s.status,'note',s.note);
$$;
create function public.catalogue_page(kind text,skip int default 0,take int default 100) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;begin
 if skip<0 or take<1 or take>200 then raise exception 'Invalid pagination';end if;
 if kind='films' then
 select coalesce(jsonb_agg(x.item),'[]') into result from (
 select jsonb_build_object('id',m.id,'externalId',m.external_id,'title',m.title,'originalTitle',m.original_title,'year',m.year,'language',m.language,'countries',m.countries,'industry',m.industry,'genres',coalesce((select jsonb_agg(g.genre order by g.genre) from public.movie_genres g where g.movie_id=m.id),'[]'),'synopsis',m.synopsis,'runtime',m.runtime,'color',m.color,'poster',m.poster,'source',public.source_json(s),'crew',coalesce((select jsonb_agg(jsonb_build_object('person',c.technician_id,'role',c.role,'department',c.department,'source',public.source_json(cs)) order by c.department,c.technician_id,c.role) from public.crew_credits c join public.source_provenance cs on cs.id=c.source_id where c.movie_id=m.id),'[]')) item
 from public.movies m join public.source_provenance s on s.id=m.source_id order by m.id offset skip limit take) x;
 elsif kind='people' then
 select coalesce(jsonb_agg(x.item),'[]') into result from (
 select jsonb_build_object('id',p.id,'externalId',p.external_id,'name',p.name,'alternativeNames',p.alternative_names,'department',p.primary_department,'subtitle',p.subtitle,'bio',p.bio,'color',p.color,'initials',p.initials,'photo',p.photo,'source',public.source_json(s),'styles',coalesce((select jsonb_agg(distinct a.tag) from public.technician_style_evidence e join public.movie_style_annotations a on a.id=e.annotation_id where e.technician_id=p.id),'[]')) item
 from public.technicians p join public.source_provenance s on s.id=p.source_id order by p.id offset skip limit take) x;
 elsif kind='annotations' then
 select coalesce(jsonb_agg(x.item),'[]') into result from (
 select jsonb_build_object('person',e.technician_id,'film',a.movie_id,'tag',a.tag,'note',a.note,'source',public.source_json(s)) item
 from public.movie_style_annotations a join public.technician_style_evidence e on e.annotation_id=a.id join public.source_provenance s on s.id=a.source_id order by a.id,e.technician_id offset skip limit take) x;
 else raise exception 'Invalid catalogue kind';end if; return result;end $$;
create function public.search_catalogue(q text,cinema text default 'All Cinema',skip int default 0,take int default 100)
 returns table(kind text,id uuid,title text,relevance real) language sql stable security invoker set search_path='' as $$
 with visible as (select m.* from public.movies m where cinema='All Cinema' or m.industry=cinema), hits as (
 select 'film'::text kind,m.id,m.title,ts_rank(m.search_vector,websearch_to_tsquery('simple',q)) relevance
 from visible m where q='' or m.search_vector @@ websearch_to_tsquery('simple',q) or m.title ilike '%'||q||'%' or public.word_similarity(q,m.title)>.35 or exists(select 1 from public.movie_genres g where g.movie_id=m.id and g.genre ilike '%'||q||'%') or exists(select 1 from public.movie_style_annotations a where a.movie_id=m.id and a.tag ilike '%'||q||'%') or exists(select 1 from public.crew_credits c join public.technicians p on p.id=c.technician_id where c.movie_id=m.id and (c.role ilike '%'||q||'%' or c.department ilike '%'||q||'%' or p.name ilike '%'||q||'%' or public.word_similarity(q,p.name)>.35))
 union all
 select 'person',p.id,p.name,ts_rank(p.search_vector,websearch_to_tsquery('simple',q))
 from public.technicians p where exists(select 1 from public.crew_credits c join visible m on m.id=c.movie_id where c.technician_id=p.id) and (q='' or p.search_vector @@ websearch_to_tsquery('simple',q) or p.name ilike '%'||q||'%' or public.word_similarity(q,p.name)>.35 or exists(select 1 from unnest(p.alternative_names) a where a ilike '%'||q||'%') or exists(select 1 from public.technician_style_evidence e join public.movie_style_annotations a on a.id=e.annotation_id join visible m on m.id=a.movie_id where e.technician_id=p.id and a.tag ilike '%'||q||'%') or exists(select 1 from public.crew_credits c join visible m on m.id=c.movie_id left join public.movie_genres g on g.movie_id=m.id where c.technician_id=p.id and (m.title ilike '%'||q||'%' or g.genre ilike '%'||q||'%' or c.role ilike '%'||q||'%' or c.department ilike '%'||q||'%')))
 ) select * from hits order by relevance desc,title,id offset greatest(0,skip) limit least(200,greatest(1,take));
$$;
create function public.load_my_data() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('revision',p.revision,'displayName',p.display_name,'avatarUrl',coalesce(p.avatar_url,''),'saved',coalesce((select jsonb_agg(technician_id) from public.favourite_technicians where user_id=auth.uid()),'[]'),'favourites',coalesce((select jsonb_agg(movie_id) from public.favourite_movies where user_id=auth.uid()),'[]'),'preferences',jsonb_build_object('industries',p.industries,'genres',p.genres,'departments',p.departments,'styles',coalesce((select jsonb_agg(tag) from public.user_style_preferences where user_id=auth.uid()),'[]')),'feedback',coalesce((select jsonb_object_agg(technician_id,action) from public.recommendation_feedback where user_id=auth.uid()),'{}'),'collections',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'entries',coalesce((select jsonb_agg(jsonb_build_object('id',coalesce(e.movie_id,e.technician_id),'kind',case when e.movie_id is not null then 'film' else 'person' end)) from public.saved_collection_entries e where e.collection_id=c.id),'[]'))) from public.saved_collections c where c.user_id=auth.uid()),'[]')) from public.profiles p where p.id=auth.uid();
$$;
create function public.save_my_data(payload jsonb,expected_revision int) returns int language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid();rev int;col jsonb;entry jsonb;begin
 if u is null then raise exception 'Authentication required';end if;
 if octet_length(payload::text)>200000 then raise exception 'Profile too large';end if;
 select revision into rev from public.profiles where id=u for update;
 if rev is null then raise exception 'Profile missing';end if;
 if rev<>expected_revision then raise exception 'Preferences changed on another device. Reload before saving.';end if;
 update public.profiles set industries=array(select jsonb_array_elements_text(payload->'preferences'->'industries')),genres=array(select jsonb_array_elements_text(payload->'preferences'->'genres')),departments=array(select jsonb_array_elements_text(payload->'preferences'->'departments')),revision=revision+1 where id=u;
 delete from public.favourite_movies where user_id=u;
 insert into public.favourite_movies select u,value::text::uuid from jsonb_array_elements_text(payload->'favourites');
 delete from public.favourite_technicians where user_id=u;
 insert into public.favourite_technicians select u,value::text::uuid from jsonb_array_elements_text(payload->'saved');
 delete from public.user_style_preferences where user_id=u;
 insert into public.user_style_preferences select u,value from jsonb_array_elements_text(payload->'preferences'->'styles');
 delete from public.recommendation_feedback where user_id=u;
 insert into public.recommendation_feedback(user_id,technician_id,action) select u,key::uuid,value from jsonb_each_text(payload->'feedback');
 delete from public.saved_collections where user_id=u;
 for col in select value from jsonb_array_elements(payload->'collections') loop
  insert into public.saved_collections(id,user_id,name) values((col->>'id')::uuid,u,col->>'name');
  for entry in select value from jsonb_array_elements(col->'entries') loop
   if entry->>'kind' not in ('film','person') then raise exception 'Invalid entry kind';end if;
   insert into public.saved_collection_entries(collection_id,user_id,movie_id,technician_id) values((col->>'id')::uuid,u,case when entry->>'kind'='film' then (entry->>'id')::uuid end,case when entry->>'kind'='person' then (entry->>'id')::uuid end);
  end loop;
 end loop;return rev+1;end $$;
revoke all on function public.source_json(public.source_provenance), public.catalogue_page(text,int,int),public.search_catalogue(text,text,int,int),public.load_my_data(),public.save_my_data(jsonb,int) from public;
grant execute on function public.source_json(public.source_provenance),public.catalogue_page(text,int,int),public.search_catalogue(text,text,int,int) to anon,authenticated;
grant execute on function public.load_my_data(),public.save_my_data(jsonb,int) to authenticated;
commit;
