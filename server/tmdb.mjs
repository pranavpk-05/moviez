import {createHash} from 'node:crypto';

export class ApiError extends Error {
  constructor(status, message, code = 'TMDB_ERROR') { super(message); this.status = status; this.code = code; }
}
const API = 'https://api.themoviedb.org/3';
const IMAGE = 'https://image.tmdb.org/t/p';
const RIGHTS = 'TMDB API terms; images belong to their respective owners. https://www.themoviedb.org/terms-of-use';
const GENRES = {28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Science fiction',10770:'TV Movie',53:'Thriller',10752:'War',37:'Western'};
const JOBS = {'Director':'Direction','Screenplay':'Writing','Writer':'Writing','Story':'Writing','Producer':'Production','Executive Producer':'Production','Director of Photography':'Cinematography','Editor':'Film editing','Original Music Composer':'Music composition','Music':'Music composition','Production Design':'Production design','Art Direction':'Art direction','Costume Design':'Costume design','Sound Editor':'Sound editing','Supervising Sound Editor':'Sound editing','Sound Re-Recording Mixer':'Production sound mixing','Production Sound Mixer':'Production sound mixing','Sound Mixer':'Production sound mixing','Colorist':'Color grading','Choreographer':'Choreography'};
const DEPARTMENTS = {Camera:'Cinematography',Editing:'Film editing',Sound:'Sound design',Art:'Art direction','Costume & Make-Up':'Makeup and prosthetics','Visual Effects':'Visual effects',Writing:'Writing',Directing:'Direction',Production:'Production'};
export const craftFor = c => JOBS[c.job] || DEPARTMENTS[c.department] || null;
export function stableId(key) {
  const h = createHash('sha256').update('btf:'+key).digest();
  h[6]=(h[6]&15)|80; h[8]=(h[8]&63)|128;
  const x=h.subarray(0,16).toString('hex');
  return `${x.slice(0,8)}-${x.slice(8,12)}-${x.slice(12,16)}-${x.slice(16,20)}-${x.slice(20)}`;
}
const text = x => typeof x === 'string' ? x : '';
const image = (path,size) => /^\/[a-zA-Z0-9_.-]+$/.test(path||'') ? `${IMAGE}/${size}${path}` : null;
const yearOf = date => /^\d{4}-\d{2}-\d{2}$/.test(date||'') ? Number(date.slice(0,4)) : null;
const initials = name => name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('');
function source(kind,id,now) { return {name:'TMDB',externalId:`${kind}/${id}`,url:`https://www.themoviedb.org/${kind}/${id}`,license:RIGHTS,checkedAt:now.slice(0,10),status:'source-checked',note:'Fetched from TMDB. Community-maintained metadata; credits may be incomplete.'}; }
function industryOf(movie) {
  if(movie.original_language==='ml') return 'Malayalam';
  const countries = (movie.production_countries||[]).map(x=>x.iso_3166_1);
  if(movie.original_language==='en' && countries.some(x=>x==='US'||x==='GB')) return 'Hollywood';
  return 'World Cinema';
}
export function movieSummary(m) {
  return {tmdbId:m.id,title:text(m.title)||text(m.original_title),originalTitle:text(m.original_title),year:yearOf(m.release_date),language:text(m.original_language),poster:image(m.poster_path,'w500'),backdrop:image(m.backdrop_path,'w1280'),overview:text(m.overview),rating:typeof m.vote_average==='number'&&m.vote_count>0?m.vote_average:null,votes:Number(m.vote_count)||0,genres:(m.genres||[]).map(g=>g.name==='Science Fiction'?'Science fiction':g.name).concat((m.genre_ids||[]).map(id=>GENRES[id]).filter(Boolean))};
}
export function normalizeMovie(m, now=new Date().toISOString()) {
  if(!Number.isSafeInteger(m.id)||m.id<=0||!text(m.title)) throw new ApiError(502,'TMDB returned an invalid film.');
  if(m.adult) throw new ApiError(404,'This film is not available in this library.');
  const filmSource=source('movie',m.id,now), people=new Map(), crew=[];
  for(const c of m.credits?.crew||[]) {
    const department=craftFor(c);
    if(!department||!Number.isSafeInteger(c.id)||c.id<=0||!c.name||!c.job) continue;
    const personId=stableId(`person/tmdb:${c.id}`);
    if(!people.has(c.id)) people.set(c.id,{id:personId,tmdbId:c.id,externalId:`tmdb:${c.id}`,name:c.name,alternativeNames:[],department,subtitle:c.job,bio:null,styles:[],color:'#3a3946',initials:initials(c.name),photo:image(c.profile_path,'w185'),imageRights:RIGHTS,source:source('person',c.id,now)});
    if(!crew.some(x=>x.person===personId&&x.role===c.job)) crew.push({person:personId,role:c.job,department,source:filmSource});
  }
  const summary=movieSummary(m);
  const film={id:stableId(`movie/tmdb:${m.id}`),tmdbId:m.id,externalId:`tmdb:${m.id}`,title:summary.title,originalTitle:summary.originalTitle||summary.title,year:summary.year||0,language:({ml:'Malayalam',en:'English',hi:'Hindi',ta:'Tamil',te:'Telugu',kn:'Kannada',fr:'French',ja:'Japanese',ko:'Korean',es:'Spanish'})[m.original_language]||text(m.original_language)||'Unknown',countries:(m.production_countries||[]).map(x=>x.name).filter(Boolean),industry:industryOf(m),genres:summary.genres,synopsis:summary.overview||null,runtime:Number(m.runtime)>0?m.runtime:null,color:'#3a3946',poster:summary.poster,backdrop:summary.backdrop,imageRights:RIGHTS,imdbId:/^tt\d+$/.test(m.imdb_id||'')?m.imdb_id:null,rating:summary.rating,votes:summary.votes,crew,source:filmSource};
  return {films:[film],people:[...people.values()],annotations:[]};
}
export function normalizePerson(p, now=new Date().toISOString()) {
  if(!Number.isSafeInteger(p.id)||p.id<=0||!text(p.name)) throw new ApiError(502,'TMDB returned an invalid technician.');
  if(p.adult) throw new ApiError(404,'This profile is not available in this library.');
  const credits=new Map();
  for(const c of p.movie_credits?.crew||[]) {
    if(!craftFor(c)||c.adult||!Number.isSafeInteger(c.id)||!c.title) continue;
    const film=credits.get(c.id)||{...movieSummary(c),jobs:[]};
    if(c.job&&!film.jobs.includes(c.job)) film.jobs.push(c.job);
    credits.set(c.id,film);
  }
  return {tmdbId:p.id,name:p.name,bio:text(p.biography)||null,department:text(p.known_for_department),photo:image(p.profile_path,'w500'),birthplace:text(p.place_of_birth)||null,source:source('person',p.id,now),films:[...credits.values()].sort((a,b)=>(b.year||0)-(a.year||0)||a.title.localeCompare(b.title))};
}
const boundedInt = (value,min,max,label,fallback) => {
  if(value===null||value==='') return fallback;
  if(!/^\d+$/.test(value)||Number(value)<min||Number(value)>max) throw new ApiError(400,`Invalid ${label}.`,'INVALID_REQUEST');
  return Number(value);
};
export function movieQuery(params) {
  const q=(params.get('q')||'').trim();
  if(q.length>120) throw new ApiError(400,'Search must be 120 characters or less.','INVALID_REQUEST');
  const cinema=params.get('cinema')||'All Cinema';
  if(!['All Cinema','Malayalam','Hollywood'].includes(cinema)) throw new ApiError(400,'Invalid cinema filter.','INVALID_REQUEST');
  const page=boundedInt(params.get('page'),1,500,'page',1);
  const sort=params.get('sort')||'popular';
  if(!['popular','newest','rating'].includes(sort)) throw new ApiError(400,'Invalid sort.','INVALID_REQUEST');
  const query=new URLSearchParams({include_adult:'false',language:'en-US',page:String(page)});
  if(q) query.set('query',q);
  else {
    query.set('include_video','false');
    query.set('sort_by',({popular:'popularity.desc',newest:'primary_release_date.desc',rating:'vote_average.desc'})[sort]);
    query.set('primary_release_date.lte',new Date().toISOString().slice(0,10));
    query.set('vote_count.gte',sort==='rating'?'100':'1');
    if(cinema==='Malayalam') query.set('with_original_language','ml');
    if(cinema==='Hollywood') { query.set('with_original_language','en'); query.set('with_origin_country','US|GB'); }
  }
  return {path:q?'/search/movie':'/discover/movie',query,q,cinema,page};
}
export function createTmdbClient({token,fetcher=fetch,clock=()=>Date.now(),wait=ms=>new Promise(r=>setTimeout(r,ms))}={}) {
  const cache=new Map();
  async function get(path,params={}) {
    if(!token) throw new ApiError(503,'The film library is awaiting its TMDB connection.','TMDB_NOT_CONFIGURED');
    const key=path+'?'+new URLSearchParams(params).toString();
    const cached=cache.get(key);
    if(cached&&cached.until>clock()) return cached.data;
    for(let attempt=0;attempt<2;attempt++) {
      let response;
      try { response=await fetcher(API+key,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'},signal:AbortSignal.timeout(9000)}); }
      catch { throw new ApiError(504,'TMDB is taking too long to respond. Please try again.'); }
      if(response.status===429&&attempt===0) {const sec=Number(response.headers?.get('retry-after'));await wait(Number.isFinite(sec)&&sec>0?Math.min(sec*1000,1500):1000);continue;}
      if(!response.ok) {
        if(response.status===401||response.status===403) throw new ApiError(503,'The TMDB connection needs attention. Please try again later.','TMDB_AUTH_ERROR');
        if(response.status===404) throw new ApiError(404,'This film or technician could not be found.','NOT_FOUND');
        if(response.status===429) throw new ApiError(429,'The film library is busy. Please try again shortly.','RATE_LIMITED');
        throw new ApiError(502,'TMDB is temporarily unavailable. Please try again.');
      }
      let data;try {data=await response.json();} catch {throw new ApiError(502,'TMDB returned an unreadable response.');}
      if(cache.size>=200) cache.delete(cache.keys().next().value);
      cache.set(key,{data,until:clock()+10*60*1000});
      return data;
    }
  }
  async function movies(params) {
    const spec=movieQuery(params), data=await get(spec.path,spec.query);
    if(!Array.isArray(data.results)) throw new ApiError(502,'TMDB returned an invalid movie list.');
    // Search has no original-language/country filter. Keep its pagination global,
    // label that scope honestly, and apply cinema filters in discover mode only.
    return {results:data.results.filter(x=>!x.adult&&Number.isSafeInteger(x.id)&&x.title).map(movieSummary),page:spec.page,totalPages:Math.min(500,Math.max(1,Number(data.total_pages)||1)),totalResults:Number(data.total_results)||0,scope:spec.q?'global-search':spec.cinema,fetchedAt:new Date(clock()).toISOString()};
  }
  const movie=async id=>normalizeMovie(await get(`/movie/${id}`,{append_to_response:'credits',language:'en-US'}),new Date(clock()).toISOString());
  const home=async()=>{
    const pages=await Promise.all(['Malayalam','Hollywood'].map(cinema=>movies(new URLSearchParams({cinema}))));
    const ids=[...new Set(pages.flatMap(p=>p.results.slice(0,3).map(f=>f.tmdbId)))];
    const results=await Promise.allSettled(ids.map(movie));
    const successful=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
    if(!successful.length)throw new ApiError(502,'The latest film collections could not load. Please try again.');
    return {catalogue:{films:successful.flatMap(c=>c.films),people:[...new Map(successful.flatMap(c=>c.people).map(p=>[p.id,p])).values()],annotations:[]},partial:successful.length<ids.length};
  };
  return {get,movies,home,movie:async id=>normalizeMovie(await get(`/movie/${id}`,{append_to_response:'credits',language:'en-US'}),new Date(clock()).toISOString()),person:async id=>normalizePerson(await get(`/person/${id}`,{append_to_response:'movie_credits',language:'en-US'}),new Date(clock()).toISOString())};
}
