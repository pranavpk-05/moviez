import {createClient} from '@supabase/supabase-js';
import {ApiError,stableId} from './tmdb.mjs';

export async function importMovie({env,authorization,movieId,client}) {
  if(!/^Bearer \S+$/.test(authorization||'')) throw new ApiError(401,'Sign in before saving a film to your account.','UNAUTHORIZED');
  if(!env.SUPABASE_URL||!env.SUPABASE_SERVICE_ROLE_KEY) throw new ApiError(503,'Account sync for TMDB films is not connected yet. You can still browse films.','SYNC_NOT_CONFIGURED');
  const db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await db.auth.getUser(authorization.slice(7));
  if(error||!user) throw new ApiError(401,'Your session expired. Sign in again.','UNAUTHORIZED');
  // Only server-fetched TMDB data reaches the privileged import function.
  const catalogue=await client.movie(movieId), film=catalogue.films[0];
  if(!film.year) throw new ApiError(422,'This film has no release year yet, so it cannot be saved to the account catalogue.');
  const sources=new Map();
  for(const s of [film.source,...catalogue.people.map(p=>p.source)]) sources.set(s.externalId,{...s,id:stableId('source/'+s.name+'/'+s.externalId)});
  const {error:syncError}=await db.rpc('sync_tmdb_movie',{payload:{...catalogue,sources:[...sources.values()]}});
  if(syncError) throw new ApiError(503,'This film could not sync to your account catalogue. Please try again later.','SYNC_UNAVAILABLE');
  return {catalogue};
}
