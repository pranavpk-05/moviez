import {stableId,validateCatalogue} from './catalogue-utils.mjs';
export const mappings={P344:['Cinematography','Director of photography'],P1040:['Film editing','Film editor'],P86:['Music composition','Composer']};
export function allowedClaims(entity,property){return (entity.claims?.[property]||[]).filter(c=>c.rank!=='deprecated'&&c.mainsnak?.snaktype==='value'&&!JSON.stringify(c.references||[]).match(/Q20828898|themoviedb|tmdb/i));}
const ids=(e,p)=>allowedClaims(e,p).map(c=>c.mainsnak.datavalue?.value?.id).filter(Boolean);
export async function fetchJSON(url,{fetcher=fetch,wait=ms=>new Promise(r=>setTimeout(r,ms)),userAgent=process.env.WIKIDATA_USER_AGENT}={}){
 if(!userAgent||!userAgent.includes('@'))throw new Error('Set WIKIDATA_USER_AGENT with a contact email before importing.');
 for(let attempt=0;attempt<5;attempt++){
  try{const response=await fetcher(url,{headers:{'User-Agent':userAgent,Accept:'application/json'},signal:AbortSignal.timeout(45000)});
   if(!response.ok){if(response.status!==429&&response.status<500)throw Object.assign(new Error(`HTTP ${response.status}`),{permanent:true});throw new Error(`Retryable HTTP ${response.status}`)}
   const data=await response.json();if(data.error)throw new Error(data.error.info||data.error.code);await wait(350);return data;
  }catch(e){if(e.permanent||attempt===4)throw e;await wait(Math.min(30000,1000*2**attempt));}
 }
}
export async function discover(industry,offset,limit,options){
 const criteria=industry==='Malayalam'?'wdt:P364 wd:Q36236':'wdt:P364 wd:Q1860; wdt:P495 wd:Q30';
 const query=`SELECT DISTINCT ?film WHERE { ?film wdt:P31/wdt:P279* wd:Q11424; ${criteria}. } ORDER BY ?film LIMIT ${limit} OFFSET ${offset}`;
 const r=await fetchJSON('https://query.wikidata.org/sparql?format=json&query='+encodeURIComponent(query),options);return r.results.bindings.map(x=>x.film.value.split('/').at(-1));
}
export async function entities(idsToGet,options){const result={};for(let i=0;i<idsToGet.length;i+=40){const r=await fetchJSON('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&languages=en%7Cml&props=labels%7Caliases%7Cclaims&ids='+idsToGet.slice(i,i+40).join('|')+'&maxlag=5',options);Object.assign(result,r.entities)}return result;}
export async function readMovies(qids,industry,options){
 const movies=await entities(qids,options);const related=[...new Set(Object.values(movies).flatMap(e=>['P136','P495','P364',...Object.keys(mappings)].flatMap(p=>ids(e,p))))];const lookup=await entities(related,options);
 const label=q=>lookup[q]?.labels?.en?.value||lookup[q]?.labels?.ml?.value||'';
 const source=(q,property='')=>({name:'Wikidata',externalId:q+(property?'/'+property:''),url:'https://www.wikidata.org/wiki/'+q+(property?'#'+property:''),license:'CC0-1.0',checkedAt:new Date().toISOString().slice(0,10),status:'needs-review',note:'Imported structured statement. Review credit identity, industry and upstream references before publishing.'});
 const result={films:[],people:[],annotations:[]};const people=new Map();
 for(const e of Object.values(movies)){
  const title=e.labels?.en?.value||e.labels?.ml?.value;if(!title)continue;
  const years=allowedClaims(e,'P577').map(c=>Number(c.mainsnak.datavalue?.value?.time?.slice(1,5))).filter(n=>n>=1880&&n<=2200);if(!years.length)continue;
  const crew=[];
  for(const [property,[department,role]] of Object.entries(mappings))for(const q of ids(e,property)){
   const name=label(q);if(!name)continue;const pid=stableId('person/'+q);
   if(!people.has(q))people.set(q,{id:pid,externalId:q,name,alternativeNames:(lookup[q]?.aliases?.en||[]).map(a=>a.value),department,subtitle:department+' professional',bio:null,styles:[],initials:name.split(' ').filter(x=>x.toLowerCase()!=='van').map(x=>x[0]).slice(0,2).join(''),color:'#516b65',source:source(q)});
   if(!crew.some(c=>c.person===pid&&c.role===role))crew.push({person:pid,department,role,source:source(e.id,property)});
  }
  if(!crew.length)continue;
  const runtime=allowedClaims(e,'P2047').map(c=>c.mainsnak.datavalue?.value).find(v=>v.unit==='http://www.wikidata.org/entity/Q7727');
  result.films.push({id:stableId('movie/'+e.id),externalId:e.id,title,originalTitle:e.labels?.ml?.value&&industry==='Malayalam'?e.labels.ml.value:title,year:Math.min(...years),language:industry==='Malayalam'?'Malayalam':'English',countries:ids(e,'P495').map(label).filter(Boolean),industry,genres:ids(e,'P136').map(label).filter(Boolean),synopsis:null,runtime:runtime?Math.round(Number(runtime.amount)):null,color:industry==='Malayalam'?'#516b65':'#535d68',crew,source:source(e.id)});
 }
 result.people=[...people.values()];validateCatalogue(result);return result;
}
