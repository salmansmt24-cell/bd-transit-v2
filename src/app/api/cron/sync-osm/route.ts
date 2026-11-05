import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';import {normalizeOSM,overpassQuery,GRID_COLS,GRID_ROWS} from '@/lib/osm';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export async function GET(request:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'}, {status:401});
 const sql=db();if(!sql)return NextResponse.json({error:'DATABASE_URL missing'},{status:503});
 // One tile per UTC day. Revisit the same tile every 25 days.
 const tile=Math.floor(Date.now()/86400000)%(GRID_COLS*GRID_ROWS),region=`grid-${tile}`;
 const existing=await sql`select id from public.import_runs where provider='overpass-osm' and region_key=${region} and status='success' and started_at>now()-interval '20 hours' limit 1`;
 if(existing.length)return NextResponse.json({status:'already-synced',region});
 try{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),47000);
  let response:Response;
  try{response=await fetch(process.env.OVERPASS_ENDPOINT||'https://overpass.kumi.systems/api/interpreter',{
   method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'BDTransit/1.0 (OSM transport point sync)'},body:new URLSearchParams({data:overpassQuery(tile)}),signal:controller.signal,cache:'no-store'});
  }finally{clearTimeout(timer)}
  if(!response.ok)throw new Error(`Overpass HTTP ${response.status}`);
  const payload=await response.json() as {elements?:Parameters<typeof normalizeOSM>[0]};
  const points=normalizeOSM(payload.elements??[]);if(points.length>12000)throw new Error('Too many records for one cron run');
  // Batches avoid excessive query size. Every row is linked to its original OSM object.
  for(let i=0;i<points.length;i+=100){const batch=points.slice(i,i+100).map(p=>({id:p.id,osm_type:p.osm_type,osm_id:p.osm_id,kind:p.kind,name:p.name,name_bn:p.name_bn,name_en:p.name_en,latitude:p.latitude,longitude:p.longitude,source_url:p.source_url}));
   await sql`insert into public.transport_points ${sql(batch,'id','osm_type','osm_id','kind','name','name_bn','name_en','latitude','longitude','source_url')}
   on conflict (id) do update set name=excluded.name,name_bn=excluded.name_bn,name_en=excluded.name_en,latitude=excluded.latitude,longitude=excluded.longitude,source_url=excluded.source_url,last_seen_at=now()`;
  }
  await sql`insert into public.import_runs(provider,region_key,status,imported_count) values ('overpass-osm',${region},'success',${points.length})`;
  return NextResponse.json({status:'success',region,imported:points.length});
 }catch(error){const detail=error instanceof Error?error.message:'Unknown error';
  await sql`insert into public.import_runs(provider,region_key,status,detail) values ('overpass-osm',${region},'failed',${detail.slice(0,500)})`;
  return NextResponse.json({error:'Sync failed',detail,region},{status:502});
 }
}
