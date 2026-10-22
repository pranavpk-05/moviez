import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {createHandler} from './api/tmdb.js';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'');
 return {plugins:[react(),{
  name:'tmdb-local-api',
  configureServer(server){
   const handler=createHandler({env:{TMDB_READ_ACCESS_TOKEN:env.TMDB_READ_ACCESS_TOKEN,SUPABASE_URL:env.SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY:env.SUPABASE_SERVICE_ROLE_KEY}});
   server.middlewares.use('/api/tmdb',(req,res)=>{void handler(req,res)});
  }
 }],server:{allowedHosts:['terminal.local']}};
});
