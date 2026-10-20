import {createClient} from '@supabase/supabase-js';
import type {Catalogue,UserData} from './types';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export const googleEnabled=import.meta.env.VITE_GOOGLE_AUTH_ENABLED==='true';
export async function loadCatalogue():Promise<Catalogue>{
 if(!supabase)throw new Error('Supabase is not configured.');
 const result:Catalogue={films:[],people:[],annotations:[]};
 for(const kind of ['films','people','annotations'] as const){
  for(let skip=0;;skip+=200){
   const {data,error}=await supabase.rpc('catalogue_page',{kind,skip,take:200});if(error)throw error;
   if(!Array.isArray(data))throw new Error('Unexpected catalogue response. Apply all database migrations.');
   result[kind].push(...data);if(data.length<200)break;
  }
 }
 return result;
}
export async function loadPrivate(){if(!supabase)throw new Error('Supabase is not configured.');const {data,error}=await supabase.rpc('load_my_data');if(error)throw error;if(!data)throw new Error('Your profile is missing. Apply the auth trigger migration and backfill existing users.');return data as UserData & {revision:number;displayName:string;avatarUrl:string};}
export async function savePrivate(payload:UserData,revision:number){if(!supabase)throw new Error('Supabase is not configured.');const {data,error}=await supabase.rpc('save_my_data',{payload,expected_revision:revision});if(error)throw error;return data as number;}
export async function searchRemote(q:string,cinema:string){if(!supabase)return null;const hits:{kind:string;id:string}[]=[];for(let skip=0;;skip+=200){const {data,error}=await supabase.rpc('search_catalogue',{q,cinema,skip,take:200});if(error)throw error;hits.push(...data);if(data.length<200)break;}return hits;}
