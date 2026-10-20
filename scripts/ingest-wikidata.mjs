import {mkdir,readFile,writeFile,appendFile} from 'node:fs/promises';
import {discover,readMovies} from './wikidata.mjs';
import {validateCatalogue} from './catalogue-utils.mjs';
const arg=process.argv.find(x=>x.startsWith('--limit='));const target=arg?Number(arg.split('=')[1]):25;
if(!Number.isInteger(target)||target<1||target>2000)throw new Error('Use --limit=1..2000 per industry.');
await mkdir('data/raw',{recursive:true});const result={films:[],people:[],annotations:[]};const people=new Map();let failures=0;
for(const industry of ['Malayalam','Hollywood'])for(let offset=0;offset<target;offset+=25){
 try{const ids=await discover(industry,offset,Math.min(25,target-offset));if(!ids.length)break;const batch=await readMovies(ids,industry);await writeFile(`data/raw/${industry}-${offset}.json`,JSON.stringify(batch,null,2));result.films.push(...batch.films);for(const p of batch.people)people.set(p.externalId,p);console.log(industry,offset,batch.films.length,'usable films');}
 catch(e){failures++;await appendFile('data/import-failures.jsonl',JSON.stringify({industry,offset,error:e.message,at:new Date().toISOString()})+'\n');console.error('Page failed:',industry,offset,e.message)}
}
result.people=[...people.values()];
// Resolve the starter film's non-Wikidata primary ID only through an explicit reviewed map.
const existing=JSON.parse(await readFile('data/catalogue.json','utf8'));
for(const f of result.films){const candidate=existing.films.find(x=>x.title===f.title&&x.year===f.year&&x.externalId!==f.externalId);if(candidate){console.warn('Review identity collision:',f.title,f.externalId,candidate.externalId);failures++;}}
console.log(validateCatalogue(result));await writeFile('data/pending-catalogue.json',JSON.stringify(result,null,2)+'\n');
console.log('Wrote a review queue. Nothing has been published or uploaded.');if(failures)process.exitCode=1;
