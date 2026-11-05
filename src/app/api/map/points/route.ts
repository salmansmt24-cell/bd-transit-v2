import {NextRequest,NextResponse} from 'next/server';import {db} from '@/lib/db';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:NextRequest){const sql=db();if(!sql)return NextResponse.json({points:[],status:'database-unconfigured'});
 const p=req.nextUrl.searchParams;const kind=p.get('kind');const q=(p.get('q')??'').trim().slice(0,80);
 const south=Math.max(20,Math.min(27,Number(p.get('south')??20))),north=Math.max(20,Math.min(27,Number(p.get('north')??27)));
 const west=Math.max(87,Math.min(94,Number(p.get('west')??87))),east=Math.max(87,Math.min(94,Number(p.get('east')??94)));
 if(![south,north,west,east].every(Number.isFinite)||south>=north||west>=east)return NextResponse.json({error:'Invalid bounds'},{status:400});
 const allowed=kind==='bus_stop'||kind==='bus_station'||kind==='railway_station'||kind==='railway_halt'?kind:null;
 try{const points=await sql`select id,kind,name,name_bn,name_en,latitude,longitude,source_url,last_seen_at
 from public.transport_points where latitude between ${south} and ${north} and longitude between ${west} and ${east}
 and (${allowed}::text is null or kind=${allowed})
 and (${q}::text='' or coalesce(name,'') ilike ${'%'+q+'%'} or coalesce(name_bn,'') ilike ${'%'+q+'%'} or coalesce(name_en,'') ilike ${'%'+q+'%'})
 order by case when kind in ('railway_station','bus_station') then 0 else 1 end,name nulls last limit 1000`;
 return NextResponse.json({points,limited:points.length===1000,source:'OpenStreetMap',note:'Map features are not verified passenger services. No fares, timetables or live GPS are inferred.'});
 }catch{return NextResponse.json({error:'Run neon/auto-map-migration.sql first'},{status:503})}
}
