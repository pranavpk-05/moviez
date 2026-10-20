// Deploy with Supabase CLI. Privileged key stays in the Edge Function environment.
import {createClient} from 'npm:@supabase/supabase-js@2';
const origin=Deno.env.get('APP_ORIGIN')??'';
Deno.serve(async(req:Request)=>{
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
 if(req.headers.get('origin')!==origin)return new Response('Origin not allowed',{status:403});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return new Response('Method not allowed',{status:405,headers});
 const auth=req.headers.get('Authorization');if(!auth?.startsWith('Bearer '))return new Response('Unauthorized',{status:401,headers});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await admin.auth.getUser(auth.slice(7));if(error||!user)return new Response('Unauthorized',{status:401,headers});
 const {error:failed}=await admin.auth.admin.deleteUser(user.id);
 return new Response(JSON.stringify(failed?{error:'Account deletion failed.'}:{deleted:true}),{status:failed?500:200,headers:{...headers,'Content-Type':'application/json'}});
});
