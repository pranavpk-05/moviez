import {useCallback,useEffect,useRef,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {loadCatalogue,loadPrivate,savePrivate,supabase} from './backend';
import {starter} from './data';
import {mergeCatalogues,tmdbRequest,tmdbRecordId} from './tmdb';
import {emptyUserData,type Catalogue,type UserData} from './types';
export function usePlatform(){
 const [catalogue,setCatalogue]=useState<Catalogue>(supabase?{films:[],people:[],annotations:[]}:starter);
 const [loading,setLoading]=useState(!!supabase);const [error,setError]=useState('');
 const [tmdbConnected,setTmdbConnected]=useState(false);const [tmdbError,setTmdbError]=useState('');
 const [session,setSession]=useState<Session|null>(null);const [authReady,setAuthReady]=useState(!supabase);
 const [userData,setUserData]=useState<UserData>(emptyUserData);const [privateReady,setPrivateReady]=useState(false);
 const [privateError,setPrivateError]=useState('');const [saving,setSaving]=useState(false);
 const latestUserData=useRef(userData);latestUserData.current=userData;
 const syncedFilms=useRef(new Set<string>());
 const revision=useRef(0);const lock=useRef(false);const currentUser=useRef<string|undefined>();
 const refresh=useCallback(async()=>{
  setError('');
  if(supabase){setLoading(true);try{setCatalogue(await loadCatalogue());}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setLoading(false)}}
  try{const status=await tmdbRequest<{configured:boolean}>({resource:'status'});if(!status.configured){setTmdbConnected(false);return;}
   const result=await tmdbRequest<{catalogue:Catalogue;partial:boolean}>({resource:'home'});setCatalogue(current=>mergeCatalogues(current,result.catalogue));setTmdbConnected(true);setTmdbError(result.partial?'Some film details could not refresh. Your available collection is still here.':'');
  }catch(e){if(e instanceof Error&&e.name!=='TypeError'&&e.message!=='The film library could not connect. Please try again.')setTmdbError(e.message)}
 },[]);
 useEffect(()=>{void refresh()},[refresh]);
 useEffect(()=>{
  if(!supabase)return;
  let alive=true;
  void supabase.auth.getSession().then(({data,error})=>{if(!alive)return;if(error)setPrivateError(error.message);setSession(data.session);setAuthReady(true)});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{
   if(currentUser.current!==next?.user.id){currentUser.current=next?.user.id;setUserData(emptyUserData());setPrivateReady(false);setPrivateError('');}
   setSession(next);setAuthReady(true);
   if(event==='PASSWORD_RECOVERY')location.hash='auth/recovery';
  });return()=>{alive=false;subscription.unsubscribe()};
 },[]);
 const userId=session?.user.id;
 useEffect(()=>{
  currentUser.current=userId;syncedFilms.current.clear();setPrivateReady(false);setPrivateError('');
  if(!userId)return;let cancelled=false;
  void loadPrivate().then(data=>{if(cancelled)return;revision.current=data.revision;setUserData(data);setPrivateReady(true)}).catch(e=>{if(!cancelled)setPrivateError(e instanceof Error?e.message:String(e))});
  return()=>{cancelled=true};
 },[userId]);
 const change=async(next:UserData,persistGuest=false)=>{
  if(!session){if(persistGuest)throw new Error('Sign in to save across devices.');setUserData(next);return;}
  if(!privateReady)throw new Error('Wait for your saved profile to load.');
  if(lock.current)throw new Error('Your previous change is still saving.');
  lock.current=true;setSaving(true);const owner=session.user.id;
  try{
   const filmIds=new Set([...next.favourites,...next.collections.flatMap(c=>c.entries.filter(e=>e.kind==='film').map(e=>e.id))]);
   const personIds=new Set([...next.saved,...Object.keys(next.feedback),...next.collections.flatMap(c=>c.entries.filter(e=>e.kind==='person').map(e=>e.id))]);
   for(const pid of personIds){const film=catalogue.films.find(f=>f.crew.some(c=>c.person===pid));if(film)filmIds.add(film.id);}
   for(const fid of filmIds){const film=catalogue.films.find(f=>f.id===fid);const tmdbId=film&&tmdbRecordId(film);if(tmdbId&&!syncedFilms.current.has(fid)){await tmdbRequest({resource:'import',id:tmdbId},undefined,session.access_token);syncedFilms.current.add(fid);}}
   if(currentUser.current!==owner)throw new Error('Your account changed. Please try again.');
   const rev=await savePrivate(next,revision.current);if(currentUser.current===owner){revision.current=rev;setUserData(next)}}finally{lock.current=false;setSaving(false)}
 };
 const useTmdbFilm=async(incoming:Catalogue)=>{
  const film=incoming.films[0],tmdbId=film&&tmdbRecordId(film);if(!tmdbId)throw new Error('This film is missing its TMDB identifier.');
  let imported=incoming;const owner=session?.user.id;
  if(session){const result=await tmdbRequest<{catalogue:Catalogue}>({resource:'import',id:tmdbId},undefined,session.access_token);imported=result.catalogue;syncedFilms.current.add(film.id);}
  if(owner&&currentUser.current!==owner)throw new Error('Your account changed. Please try again.');
  setCatalogue(current=>mergeCatalogues(current,imported));
  const latest=latestUserData.current;await change({...latest,favourites:[...new Set([...latest.favourites,film.id])],preferences:{...latest.preferences,industries:[...new Set([...latest.preferences.industries,film.industry])]}});
 };
 return {catalogue,loading,error,tmdbConnected,tmdbError,refresh,session,authReady,userData,change,privateReady,privateError,saving,useTmdbFilm};
}
export type Platform=ReturnType<typeof usePlatform>;
