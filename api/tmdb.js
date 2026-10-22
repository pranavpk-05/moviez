import {ApiError,createTmdbClient} from '../server/tmdb.mjs';
import {importMovie} from '../server/tmdb-store.mjs';
let cachedClient, cachedToken;
function clientFor(token) { if(!cachedClient||cachedToken!==token) {cachedClient=createTmdbClient({token});cachedToken=token;} return cachedClient; }

export function createHandler({env=process.env,client,importer=importMovie}={}) {
  return async function handler(req,res) {
    const reply=(status,body,cache='no-store')=>{res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control',cache);res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(body));};
    try {
      const url=new URL(req.url,'http://localhost'), resource=url.searchParams.get('resource')||'movies';
      const token=env.TMDB_READ_ACCESS_TOKEN?.trim();
      const tmdb=client||clientFor(token);
      if(!['GET','POST'].includes(req.method)) {res.setHeader('Allow','GET, POST');return reply(405,{error:'Method not allowed.'});}
      if(resource==='status'&&req.method==='GET') return reply(200,{configured:!!token});
      if(!['movies','movie','person','import','home'].includes(resource)) throw new ApiError(400,'Unknown library request.','INVALID_REQUEST');
      if(resource==='import'&&req.method!=='POST'||resource!=='import'&&req.method!=='GET') {res.setHeader('Allow',resource==='import'?'POST':'GET');return reply(405,{error:'Method not allowed.'});}
      if(resource==='home') return reply(200,await tmdb.home(),'public, max-age=0, s-maxage=600, stale-while-revalidate=300');
      if(resource==='movies') return reply(200,await tmdb.movies(url.searchParams),'public, max-age=0, s-maxage=600, stale-while-revalidate=300');
      const raw=url.searchParams.get('id');
      if(!/^[1-9]\d{0,9}$/.test(raw||'')) throw new ApiError(400,'Invalid TMDB ID.','INVALID_REQUEST');
      const id=Number(raw);
      if(resource==='person') return reply(200,await tmdb.person(id),'public, max-age=0, s-maxage=3600, stale-while-revalidate=600');
      if(resource==='import') return reply(200,await importer({env,authorization:req.headers.authorization,movieId:id,client:tmdb}));
      return reply(200,{catalogue:await tmdb.movie(id)},'public, max-age=0, s-maxage=3600, stale-while-revalidate=600');
    } catch(error) {
      // Never return upstream bodies, headers, URLs with keys, or arbitrary errors.
      reply(error instanceof ApiError?error.status:500,{error:error instanceof ApiError?error.message:'The film library could not complete this request.',code:error instanceof ApiError?error.code:'INTERNAL_ERROR'});
    }
  };
}
export default createHandler();
