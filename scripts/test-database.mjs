import {PGlite} from '@electric-sql/pglite';
import {pg_trgm} from '@electric-sql/pglite/contrib/pg_trgm';
import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite({extensions:{pg_trgm}});let assertions=0;const ok=(v,msg)=>{assert.ok(v,msg);assertions++};
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
 const seed=await readFile('supabase/seed.sql','utf8');await db.exec(seed);await db.exec(seed);
 const counts=await db.query('select (select count(*) from public.movies)::int films,(select count(*) from public.technicians)::int people,(select count(*) from public.crew_credits)::int credits');ok(counts.rows[0].films===10&&counts.rows[0].people===23&&counts.rows[0].credits===35,'Idempotent seed counts');
 const alice='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',bob='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 await db.query('insert into auth.users(id) values($1),($2)',[alice,bob]);
 const film=(await db.query("select id from public.movies where title='Kumbalangi Nights'")).rows[0].id;
 const person=(await db.query("select id from public.technicians where name='Shyju Khalid'")).rows[0].id;
 await db.exec('set role anon');
 ok((await db.query("select public.catalogue_page('films',0,3) result")).rows[0].result.length===3,'Anonymous pagination');
 ok((await db.query("select * from public.search_catalogue('Deakns','Hollywood',0,100)")).rows.some(r=>r.title==='Roger Deakins'),'Database typo search');
 ok((await db.query("select * from public.search_catalogue('photography','Malayalam',0,100)")).rows.some(r=>r.title==='Shyju Khalid'),'Database role search');
 ok((await db.query("select * from public.search_catalogue('Atmospheric','Hollywood',0,100)")).rows.some(r=>r.title==='Roger Deakins'),'Database evidence-backed style search');
 let denied=false;try{await db.exec("insert into public.genres(name) values('forbidden')")}catch{denied=true}ok(denied,'Anonymous cannot edit catalogue');
 denied=false;try{await db.exec('truncate public.movies cascade')}catch{denied=true}ok(denied,'No TRUNCATE privilege');
 await db.exec('reset role');await db.query("update public.movies set published=false where title='Premam'");await db.exec('set role anon');
 ok(!(await db.query("select public.catalogue_page('films',0,100) result")).rows[0].result.some(f=>f.title==='Premam'),'Unpublished records hidden');await db.exec('reset role');await db.exec("update public.movies set published=true where title='Premam'");
 const payload={saved:[person],favourites:[film],preferences:{industries:['Malayalam'],genres:['Drama'],departments:['Cinematography'],styles:['Electronic soundtracks']},feedback:{[person]:'like'},collections:[{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',name:'My camera references',entries:[{id:film,kind:'film'},{id:person,kind:'person'}]}]};
 await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[alice]);
 const rev=(await db.query('select public.save_my_data($1::jsonb,0) revision',[JSON.stringify(payload)])).rows[0].revision;ok(rev===1,'Atomic user write');
 const loaded=(await db.query('select public.load_my_data() result')).rows[0].result;ok(loaded.saved[0]===person&&loaded.collections[0].entries.length===2,'Private persistence round trip');
 denied=false;try{await db.query('select public.save_my_data($1::jsonb,0)',[JSON.stringify(payload)])}catch{denied=true}ok(denied,'Stale revision fails without overwriting');
 // A rejected FK must roll back the deletions and revision bump in the entire RPC.
 denied=false;try{await db.query('select public.save_my_data($1::jsonb,1)',[JSON.stringify({...payload,saved:['dddddddd-dddd-4ddd-8ddd-dddddddddddd']})])}catch{denied=true}ok(denied,'Invalid references rejected');ok((await db.query('select public.load_my_data() result')).rows[0].result.revision===1,'Atomic rollback preserves revision');
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[bob]);
 ok((await db.query('select * from public.favourite_technicians')).rows.length===0,'Bob cannot read Alice favourites');ok((await db.query('select * from public.saved_collection_entries')).rows.length===0,'Bob cannot read Alice collection entries');
 denied=false;try{await db.query('insert into public.favourite_technicians(user_id,technician_id) values($1,$2)',[alice,person])}catch{denied=true}ok(denied,'Bob cannot forge Alice owner ID');
 denied=false;try{await db.query('insert into public.saved_collection_entries(collection_id,user_id,movie_id) values($1,$2,$3)',['cccccccc-cccc-4ccc-8ccc-cccccccccccc',bob,film])}catch{denied=true}ok(denied,'Bob cannot insert into Alice collection');
 denied=false;try{await db.query("update public.movies set published=false where id=$1",[film])}catch{denied=true}ok(denied,'Signed-in users cannot edit catalogue');
 await db.exec('reset role');await db.query('delete from auth.users where id=$1',[alice]);ok((await db.query('select * from public.favourite_movies')).rows.length===0&&(await db.query('select * from public.saved_collection_entries')).rows.length===0,'Account deletion cascades private data');
 console.log(`PASS: migrations, repeated seed, catalogue RPCs, private persistence and RLS (${assertions} assertions). PostgreSQL engine: PGlite; Supabase Auth/Edge transport not exercised.`);
}finally{await db.close()}
