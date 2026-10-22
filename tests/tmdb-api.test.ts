// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
// @ts-expect-error Server implementation is plain ESM JavaScript.
import {createTmdbClient,movieQuery,normalizeMovie,normalizePerson,ApiError} from '../server/tmdb.mjs';
// @ts-expect-error Vercel entrypoint is plain ESM JavaScript.
import {createHandler} from '../api/tmdb.js';
// @ts-expect-error Server implementation is plain ESM JavaScript.
import {importMovie} from '../server/tmdb-store.mjs';
const film={id:123,title:'Fixture Film',original_title:'Fixture Film',original_language:'ml',release_date:'2024-02-15',genres:[{name:'Drama'}],production_countries:[{iso_3166_1:'IN',name:'India'}],poster_path:'/poster.jpg',credits:{crew:[{id:45,name:'Fixture Artist',department:'Camera',job:'Director of Photography',profile_path:'/photo.jpg'},{id:45,name:'Fixture Artist',department:'Camera',job:'Director of Photography'},{id:46,name:'Fixture Director',department:'Directing',job:'Director'},{id:47,name:'Not a technician',department:'Unknown',job:'Unknown'}]}};
async function request(url:string,options:Record<string,unknown>={}){
 const headers:Record<string,string>={};let text='';const res={statusCode:200,setHeader:(key:string,value:string)=>{headers[key]=value},end:(value:string)=>{text=value}};
 await createHandler({env:{TMDB_READ_ACCESS_TOKEN:'test-secret'},...options})({url,method:'GET',headers:{},...(options.request||{})},res);
 return {status:res.statusCode,headers,body:JSON.parse(text)};
}
describe('TMDB catalogue boundary',()=>{
 it('uses stable provider IDs, deduplicates credits, keeps supported jobs and labels the real industry',()=>{
  const data=normalizeMovie(film,'2026-10-22T00:00:00Z');expect(data.people).toHaveLength(2);expect(data.films[0].crew).toHaveLength(2);expect(data.films[0].industry).toBe('Malayalam');expect(data.films[0].poster).toBe('https://image.tmdb.org/t/p/w500/poster.jpg');expect(data.films[0].id).toBe(normalizeMovie(film).films[0].id);
  expect(normalizeMovie({...film,original_language:'hi'}).films[0].industry).toBe('World Cinema');expect(normalizeMovie({...film,original_language:'en'}).films[0].industry).toBe('World Cinema');expect(()=>normalizeMovie({...film,adult:true})).toThrow('not available');
 });
 it('does not create arbitrary image URLs or invent absent years, ratings and biography',()=>{
  const data=normalizeMovie({...film,poster_path:'https://attacker.invalid/p.jpg',release_date:'',vote_count:0,vote_average:9});expect(data.films[0].poster).toBeNull();expect(data.films[0].rating).toBeNull();expect(data.films[0].year).toBe(0);expect(data.people[0].bio).toBeNull();
 });
 it('deduplicates filmography entries while retaining multiple credited jobs',()=>{
  const data=normalizePerson({id:45,name:'Fixture Artist',movie_credits:{crew:[{...film,job:'Editor',department:'Editing'},{...film,job:'Director of Photography',department:'Camera'}]}});expect(data.films).toHaveLength(1);expect(data.films[0].jobs).toHaveLength(2);
 });
 it('bounds pagination and search, and sends cinema filters only to discover',()=>{
  expect(()=>movieQuery(new URLSearchParams({page:'501'}))).toThrow('page');expect(()=>movieQuery(new URLSearchParams({q:'x'.repeat(121)}))).toThrow('120');
  const ml=movieQuery(new URLSearchParams({cinema:'Malayalam'}));expect(ml.path).toBe('/discover/movie');expect(ml.query.get('with_original_language')).toBe('ml');
  expect(movieQuery(new URLSearchParams({q:'Film',cinema:'Malayalam'})).path).toBe('/search/movie');
 });
 it('caches successful requests and refreshes expired data',async()=>{
  let now=0;const fetcher=vi.fn(async()=>new Response(JSON.stringify({value:fetcher.mock.calls.length}),{status:200}));const client=createTmdbClient({token:'test-secret',fetcher,clock:()=>now});
  expect((await client.get('/movie/123')).value).toBe(1);expect((await client.get('/movie/123')).value).toBe(1);now=601000;expect((await client.get('/movie/123')).value).toBe(2);expect(fetcher).toHaveBeenCalledTimes(2);expect(fetcher.mock.calls[0][0]).toBe('https://api.themoviedb.org/3/movie/123?');
 });
 it('backs off once on rate limiting and never caches or leaks authentication failures',async()=>{
  const wait=vi.fn(async()=>{}),fetcher=vi.fn().mockResolvedValueOnce(new Response('',{status:429,headers:{'Retry-After':'10'}})).mockResolvedValueOnce(new Response(JSON.stringify({results:[]}),{status:200}));
  const client=createTmdbClient({token:'test-secret',fetcher,wait});await client.get('/discover/movie');expect(wait).toHaveBeenCalledWith(1500);
  const denied=createTmdbClient({token:'super-secret',fetcher:async()=>new Response('super-secret',{status:401})});await expect(denied.get('/movie/123')).rejects.toThrow('needs attention');
  const response=await request('/api/tmdb?resource=movie&id=123',{client:denied});expect(response.status).toBe(503);expect(JSON.stringify(response.body)).not.toContain('super-secret');expect(response.headers['Cache-Control']).toBe('no-store');
 });
 it('reports missing configuration without exposing keys and rejects arbitrary resources, IDs and methods',async()=>{
  const status=await request('/api/tmdb?resource=status',{env:{}});expect(status.body).toEqual({configured:false});
  const client={movie:vi.fn()};expect((await request('/api/tmdb?resource=movie&id=../../secrets',{client})).status).toBe(400);expect(client.movie).not.toHaveBeenCalled();expect((await request('/api/tmdb?resource=http://attacker.invalid')).status).toBe(400);expect((await request('/api/tmdb?resource=movie&id=123',{request:{method:'DELETE'}})).status).toBe(405);
 });
 it('requires authentication and server sync configuration before importing anything',async()=>{
  const client={movie:vi.fn()};await expect(importMovie({env:{},client,movieId:123})).rejects.toMatchObject({status:401});await expect(importMovie({env:{},authorization:'Bearer user-token',client,movieId:123})).rejects.toMatchObject({status:503});expect(client.movie).not.toHaveBeenCalled();
 });
 it('marks global title searches honestly and preserves upstream pagination',async()=>{
  const client=createTmdbClient({token:'test',fetcher:async()=>new Response(JSON.stringify({results:[film],total_pages:22,total_results:421}),{status:200})});const result=await client.movies(new URLSearchParams({q:'Film',cinema:'Malayalam',page:'2'}));expect(result.scope).toBe('global-search');expect(result.totalResults).toBe(421);expect(result.page).toBe(2);expect(result.totalPages).toBe(22);
 });
 it('does not treat upstream error text as a public API response',async()=>{
  const response=await request('/api/tmdb?resource=movie&id=123',{client:{movie:async()=>{throw new Error('Authorization: secret')}}});expect(response.status).toBe(500);expect(JSON.stringify(response.body)).not.toContain('secret');
  expect(new ApiError(400,'Invalid').status).toBe(400);
 });
});
