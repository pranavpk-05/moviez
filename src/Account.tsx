import {useState} from 'react';
import {googleEnabled,supabase} from './backend';
import type {Platform} from './platform';
export function Account({platform,notify,recovery}:{platform:Platform;notify:(s:string)=>void;recovery:boolean}){
 const [mode,setMode]=useState<'login'|'register'|'reset'>(recovery?'reset':'login');
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [name,setName]=useState(platform.session?.user.user_metadata.display_name||'');
 const [avatar,setAvatar]=useState(platform.session?.user.user_metadata.avatar_url||'');const [confirm,setConfirm]=useState('');const [busy,setBusy]=useState(false);
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);try{await fn()}catch(e){notify(e instanceof Error?e.message:String(e))}finally{setBusy(false)}};
 const redirect=location.origin+location.pathname;
 if(!supabase)return <div className="empty"><h2>Connect your account</h2><p>Browsing and taste discovery work with the included starter catalogue. Sign-in and cross-device collections become available once this app is connected to Supabase.</p><p>Follow the included README to configure your own project.</p></div>;
 const client=supabase;
 if(!platform.authReady)return <p role="status">Checking your session…</p>;
 return <div className="account-panel">
 {platform.session&&!recovery?<><span className="eyebrow">YOUR PROFILE</span><h1 className="page-title">Make it <em>yours.</em></h1><p>{platform.session.user.email}</p>{platform.privateError&&<p role="alert">{platform.privateError}</p>}
 <form onSubmit={e=>{e.preventDefault();void run(async()=>{const {error}=await client.from('profiles').update({display_name:name,avatar_url:avatar||null}).eq('id',platform.session!.user.id);if(error)throw error;const {error:authError}=await client.auth.updateUser({data:{display_name:name,avatar_url:avatar||null}});if(authError)throw authError;notify('Profile updated.')})}}>
 <label>Display name<input value={name} maxLength={80} required onChange={e=>setName(e.target.value)}/></label><label>Avatar URL (a photo you have rights to use)<input type="url" placeholder="https://…" value={avatar} onChange={e=>setAvatar(e.target.value)}/></label>
 {avatar&&<img className="account-avatar" alt="Your avatar preview" src={avatar} referrerPolicy="no-referrer" onError={e=>{e.currentTarget.style.display='none'}}/>}
 <button className="btn primary" disabled={busy}>Save profile</button></form>
 <button className="btn secondary" onClick={()=>void run(async()=>{const {error}=await client.auth.signOut();if(error)throw error;notify('Signed out.')})} disabled={busy}>Sign out</button>
 <details className="danger"><summary>Delete account</summary><p>This permanently removes your account, preferences, favourites, collections and feedback. Type DELETE to continue.</p><input aria-label="Confirm account deletion" value={confirm} onChange={e=>setConfirm(e.target.value)}/><button className="btn secondary" disabled={busy||confirm!=='DELETE'} onClick={()=>void run(async()=>{const {data,error}=await client.functions.invoke('delete-account',{method:'POST'});if(error||!data?.deleted)throw error||new Error('Deletion was not confirmed.');await client.auth.signOut();notify('Account deleted.')})}>Permanently delete my account</button></details></>:
 <><span className="eyebrow">YOUR CREATIVE COLLECTION</span><h1 className="page-title">{recovery?'New password.':mode==='register'?'Join the frame.':'Welcome back.'}</h1>
 <div className="filter-bar">{!recovery&&(['login','register','reset'] as const).map(m=><button className={'chip '+(mode===m?'selected':'')} key={m} onClick={()=>setMode(m)}>{m==='login'?'Sign in':m==='register'?'Create account':'Forgot password'}</button>)}</div>
 <form onSubmit={e=>{e.preventDefault();void run(async()=>{
 if(recovery){const {error}=await client.auth.updateUser({password});if(error)throw error;notify('Password updated.');location.hash='profile';return;}
 if(mode==='register'){const {error}=await client.auth.signUp({email,password,options:{emailRedirectTo:redirect,data:{display_name:name}}});if(error)throw error;notify('Registration submitted. Check your email for verification.');}
 else if(mode==='login'){const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;notify('Signed in.');location.hash='profile';}
 else{const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:redirect});if(error)throw error;notify('If the account exists, a reset email is on its way.');}
 })}}>
 {!recovery&&<label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {mode==='register'&&!recovery&&<label>Display name<input autoComplete="nickname" required value={name} onChange={e=>setName(e.target.value)}/></label>}
 {(mode!=='reset'||recovery)&&<label>Password<input type="password" minLength={8} autoComplete={mode==='login'&&!recovery?'current-password':'new-password'} required value={password} onChange={e=>setPassword(e.target.value)}/></label>}
 <button className="btn primary" disabled={busy}>{busy?'Please wait…':recovery?'Set password':mode==='login'?'Sign in':mode==='register'?'Create account':'Send reset email'}</button></form>
 {mode==='register'&&<p className="section-desc">Verify your email before signing in. Passwords must have at least 8 characters.</p>}
 {googleEnabled&&!recovery&&<button className="btn secondary" disabled={busy} onClick={()=>void run(async()=>{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect}});if(error)throw error})}>Continue with Google</button>}
 </>}
 </div>;
}
