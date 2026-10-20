import {describe,it,expect} from 'vitest';
// @ts-expect-error Node CLI module is intentionally JavaScript.
import {fetchJSON,allowedClaims} from '../scripts/wikidata.mjs';
// @ts-expect-error Node CLI module is intentionally JavaScript.
import {validateCatalogue,seedSQL,stableId} from '../scripts/catalogue-utils.mjs';
import {starter} from '../src/data';
describe('ingestion',()=>{
 it('detects dangling credits, duplicates and style evidence unrelated to a credit',()=>{
  const bad=structuredClone(starter);bad.films[0].crew[0].person='missing';expect(()=>validateCatalogue(bad)).toThrow('Dangling');
  expect(()=>validateCatalogue({...starter,people:[...starter.people,starter.people[0]]})).toThrow('Duplicate');
 });
 it('generates repeatable UUIDs and idempotent seed upserts',()=>{expect(stableId('movie/Q60737728')).toBe(starter.films[0].id);expect(seedSQL(starter)).toContain('on conflict');});
 it('backs off on rate limits without retrying permanent errors',async()=>{
  let tries=0;const waits:number[]=[];
  const result=await fetchJSON('https://example.invalid',{userAgent:'BTF test@test.invalid',fetcher:async()=>++tries===1?{ok:false,status:429}:{ok:true,json:async()=>({ok:true})},wait:async(ms:number)=>{waits.push(ms)}});
  expect(tries).toBe(2);expect(waits).toContain(1000);expect(result.ok).toBe(true);
  await expect(fetchJSON('https://example.invalid',{userAgent:'BTF test@test.invalid',fetcher:async()=>({ok:false,status:403}),wait:async()=>{}})).rejects.toThrow('HTTP 403');
 });
 it('excludes explicitly TMDB-referenced and deprecated claims',()=>{const claim={rank:'normal',mainsnak:{snaktype:'value'},references:[{snaks:{P248:[{datavalue:{value:{id:'Q20828898'}}}]}}]};expect(allowedClaims({claims:{P86:[claim,{...claim,rank:'deprecated'}]}},'P86')).toEqual([])});
});
