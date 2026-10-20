import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {stableId,validateCatalogue} from './catalogue-utils.mjs';
const file=process.argv[2]||'data/catalogue.json';const publish=process.argv.includes('--publish-reviewed');
if(!process.env.SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Set server-side SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your local environment.');
const d=JSON.parse(await readFile(file,'utf8'));const counts=validateCatalogue(d);
if(publish&&[...d.people.map(p=>p.source),...d.films.flatMap(f=>[f.source,...f.crew.map(c=>c.source)]),...d.annotations.map(a=>a.source)].some(s=>s.status!=='source-checked'))throw new Error('Review all provenance before --publish-reviewed.');
const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const check=async(p)=>{const {data,error}=await p;if(error)throw error;return data;};
const job=await check(client.from('ingestion_jobs').insert({source:file,status:'running',counts}).select('id').single());
try{
 const mappings={};for(const table of ['movies','technicians','source_provenance']){mappings[table]=new Map();for(let offset=0;;offset+=1000){const rows=await check(client.from(table).select(table==='source_provenance'?'id,name,external_id':'id,external_id,published').order('id').range(offset,offset+999));for(const row of rows)mappings[table].set(table==='source_provenance'?row.name+'|'+row.external_id:row.external_id,row);if(rows.length<1000)break;}}
 // A same-name person with a different identifier is a review candidate, never silently merged.
 for(const p of d.people){const candidates=await check(client.from('technicians').select('id,external_id').eq('name',p.name));if(candidates.some(c=>c.external_id!==p.externalId))throw new Error(`Identity conflict for ${p.name}; add a reviewed external-ID mapping before importing.`);}
 const sources=new Map();for(const s of [...d.people.map(p=>p.source),...d.films.flatMap(f=>[f.source,...f.crew.map(c=>c.source)]),...d.annotations.map(a=>a.source)])sources.set(s.name+'|'+s.externalId,s);
 const sid=s=>mappings.source_provenance.get(s.name+'|'+s.externalId)?.id||stableId('source/'+s.name+'/'+s.externalId);
 const pid=new Map(d.people.map(p=>[p.id,mappings.technicians.get(p.externalId)?.id||p.id]));const fid=new Map(d.films.map(f=>[f.id,mappings.movies.get(f.externalId)?.id||f.id]));
 for(const s of sources.values())await check(client.from('source_provenance').upsert({id:sid(s),name:s.name,external_id:s.externalId,url:s.url,license:s.license,checked_at:s.checkedAt,status:s.status,note:s.note},{onConflict:'name,external_id'}));
 for(const p of d.people)await check(client.from('technicians').upsert({id:pid.get(p.id),external_id:p.externalId,name:p.name,alternative_names:p.alternativeNames,primary_department:p.department,subtitle:p.subtitle,bio:p.bio,color:p.color,initials:p.initials,source_id:sid(p.source),published:mappings.technicians.get(p.externalId)?.published||false},{onConflict:'external_id'}));
 for(const f of d.films){
  const candidates=await check(client.from('movies').select('id,external_id').eq('title',f.title).eq('year',f.year));if(candidates.some(x=>x.external_id!==f.externalId))throw new Error(`Film identity conflict: ${f.title}`);
  await check(client.from('movies').upsert({id:fid.get(f.id),external_id:f.externalId,title:f.title,original_title:f.originalTitle,year:f.year,language:f.language,countries:f.countries,industry:f.industry,synopsis:f.synopsis,runtime:f.runtime,color:f.color,source_id:sid(f.source),published:mappings.movies.get(f.externalId)?.published||false},{onConflict:'external_id'}));
  for(const genre of f.genres){await check(client.from('genres').upsert({name:genre}));await check(client.from('movie_genres').upsert({movie_id:fid.get(f.id),genre}));}
  for(const c of f.crew){await check(client.from('technician_roles').upsert({name:c.role,department:c.department}));await check(client.from('crew_credits').upsert({movie_id:fid.get(f.id),technician_id:pid.get(c.person),role:c.role,department:c.department,source_id:sid(c.source)},{onConflict:'movie_id,technician_id,role'}));}
 }
 for(const [kind,rows,map] of [['movie',d.films,fid],['technician',d.people,pid]])for(const r of rows)if(r.externalId.startsWith('Q'))await check(client.from('external_identifiers').upsert({[kind+'_id']:map.get(r.id),provider:'wikidata',value:r.externalId},{onConflict:'provider,value'}));
 for(const a of d.annotations){const aid=stableId('annotation/'+fid.get(a.film)+'/'+a.tag+'/'+sid(a.source));await check(client.from('style_tags').upsert({name:a.tag}));await check(client.from('movie_style_annotations').upsert({id:aid,movie_id:fid.get(a.film),tag:a.tag,note:a.note,source_id:sid(a.source)}));await check(client.from('technician_style_evidence').upsert({annotation_id:aid,technician_id:pid.get(a.person)}));}
 if(publish){await check(client.from('technicians').update({published:true}).in('id',[...pid.values()]));await check(client.from('movies').update({published:true}).in('id',[...fid.values()]));}
 await check(client.from('ingestion_jobs').update({status:publish?'published':'staged',finished_at:new Date().toISOString()}).eq('id',job.id));console.log({...counts,published:publish});
}catch(e){await client.from('ingestion_jobs').update({status:'failed',errors:[{message:e.message}],finished_at:new Date().toISOString()}).eq('id',job.id);throw e;}
