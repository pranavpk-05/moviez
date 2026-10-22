import type {Catalogue,Source} from './types';
export type MovieSummary={tmdbId:number;title:string;originalTitle:string;year:number|null;language:string;poster:string|null;backdrop:string|null;overview:string;rating:number|null;votes:number;genres:string[]};
export type MoviePage={results:MovieSummary[];page:number;totalPages:number;totalResults:number;scope:string;fetchedAt:string};
export type TmdbPerson={tmdbId:number;name:string;bio:string|null;department:string;photo:string|null;birthplace:string|null;source:Source;films:(MovieSummary&{jobs:string[]})[]};
export class LibraryError extends Error {constructor(message:string,public code='LIBRARY_ERROR'){super(message)}}
export async function tmdbRequest<T>(params:Record<string,string|number>,signal?:AbortSignal,authorization?:string):Promise<T>{
 const query=new URLSearchParams(Object.entries(params).map(([key,value])=>[key,String(value)]));
 let response:Response;
 try {response=await fetch('/api/tmdb?'+query,{signal,method:authorization?'POST':'GET',headers:authorization?{Authorization:'Bearer '+authorization}:undefined});}
 catch(error){if(signal?.aborted)throw error;throw new LibraryError('The film library could not connect. Please try again.');}
 let data;
 try {data=await response.json();}catch{throw new LibraryError('The film library is not available here yet. Please try the deployed website.','ENDPOINT_UNAVAILABLE')}
 if(!response.ok)throw new LibraryError(typeof data.error==='string'?data.error:'The film library could not complete this request.',data.code);
 return data as T;
}
export const loadTmdbMovie=(id:number,signal?:AbortSignal)=>tmdbRequest<{catalogue:Catalogue}>({resource:'movie',id},signal);
export function mergeCatalogues(current:Catalogue,incoming:Catalogue):Catalogue{
 const films=new Map([...incoming.films,...current.films].map(f=>[f.id,f])),people=new Map([...incoming.people,...current.people].map(p=>[p.id,p]));
 for(const f of incoming.films)films.set(f.id,f);
 for(const p of incoming.people){const old=people.get(p.id);people.set(p.id,old?{...p,bio:old.bio||p.bio,department:old.department,styles:old.styles}:p)}
 return {films:[...films.values()],people:[...people.values()],annotations:current.annotations};
}
export const tmdbRecordId=(record:{externalId:string;tmdbId?:number})=>record.tmdbId||(/^tmdb:\d+$/.test(record.externalId)?Number(record.externalId.slice(5)):null);
