import {useCallback,useEffect,useRef,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {loadCatalogue,loadPrivate,savePrivate,supabase} from './backend';
import {starter} from './data';
import {emptyUserData,type Catalogue,type UserData} from './types';
export function usePlatform(){
 const [catalogue,setCatalogue]=useState<Catalogue>(supabase?{films:[],people:[],annotations:[]}:starter);
 const [loading,setLoading]=useState(!!supabase);const [error,setError]=useState('');
 const [session,setSession]=useState<Session|null>(null);const [authReady,setAuthReady]=useState(!supabase);
 const [userData,setUserData]=useState<UserData>(emptyUserData);const [privateReady,setPrivateReady]=useState(false);
 const [privateError,setPrivateError]=useState('');const [saving,setSaving]=useState(false);
 const revision=useRef(0);const lock=useRef(false);const currentUser=useRef<string|undefined>();
 const refresh=useCallback(async()=>{if(!supabase)return;setLoading(true);setError('');try{setCatalogue(await loadCatalogue());}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setLoading(false)}},[]);
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
  currentUser.current=userId;setPrivateReady(false);setPrivateError('');
  if(!userId)return;let cancelled=false;
  void loadPrivate().then(data=>{if(cancelled)return;revision.current=data.revision;setUserData(data);setPrivateReady(true)}).catch(e=>{if(!cancelled)setPrivateError(e instanceof Error?e.message:String(e))});
  return()=>{cancelled=true};
 },[userId]);
 const change=async(next:UserData,persistGuest=false)=>{
  if(!session){if(persistGuest)throw new Error('Sign in to save across devices.');setUserData(next);return;}
  if(!privateReady)throw new Error('Wait for your saved profile to load.');
  if(lock.current)throw new Error('Your previous change is still saving.');
  lock.current=true;setSaving(true);const owner=session.user.id;
  try{const rev=await savePrivate(next,revision.current);if(currentUser.current===owner){revision.current=rev;setUserData(next)}}finally{lock.current=false;setSaving(false)}
 };
 return {catalogue,loading,error,refresh,session,authReady,userData,change,privateReady,privateError,saving};
}
export type Platform=ReturnType<typeof usePlatform>;
