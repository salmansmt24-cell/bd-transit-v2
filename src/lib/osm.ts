export type OSMPoint = {id:string;osm_type:'node'|'way'|'relation';osm_id:number;kind:'bus_stop'|'bus_station'|'railway_station'|'railway_halt';name:string|null;name_bn:string|null;name_en:string|null;latitude:number;longitude:number;source_url:string};
type Element={type:'node'|'way'|'relation';id:number;lat?:number;lon?:number;center?:{lat:number;lon:number};tags?:Record<string,string>};
export function normalizeOSM(elements:Element[]):OSMPoint[]{
 const points:OSMPoint[]=[];
 for(const e of elements){const t=e.tags??{};const lat=e.lat??e.center?.lat,lon=e.lon??e.center?.lon;
 if(typeof lat!=='number'||typeof lon!=='number'||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<20||lat>27||lon<87||lon>94)continue;
 let kind:OSMPoint['kind']|null=null;
 if(t.highway==='bus_stop')kind='bus_stop';
 else if(t.amenity==='bus_station')kind='bus_station';
 else if(t.railway==='station')kind='railway_station';
 else if(t.railway==='halt')kind='railway_halt';
 if(!kind)continue;
 points.push({id:`osm:${e.type}:${e.id}:${kind}`,osm_type:e.type,osm_id:e.id,kind,name:t.name??t['name:en']??t['name:bn']??null,name_bn:t['name:bn']??null,name_en:t['name:en']??null,latitude:lat,longitude:lon,source_url:`https://www.openstreetmap.org/${e.type}/${e.id}`});
 }
 return points;
}
// 25 bounded requests spread across 25 days, not a nationwide one-shot Overpass bulk query.
export const GRID_ROWS=5,GRID_COLS=5;
export function tileBounds(tile:number){const row=Math.floor(tile/GRID_COLS),col=tile%GRID_COLS;
 const south=20.7+row*(6/GRID_ROWS),north=20.7+(row+1)*(6/GRID_ROWS);
 const west=88+col*(4.8/GRID_COLS),east=88+(col+1)*(4.8/GRID_COLS);
 return {south,north,west,east};
}
export function overpassQuery(tile:number){const b=tileBounds(tile),bbox=`(${b.south},${b.west},${b.north},${b.east})`;
 return `[out:json][timeout:45];(nwr["highway"="bus_stop"]${bbox};nwr["amenity"="bus_station"]${bbox};nwr["railway"="station"]${bbox};nwr["railway"="halt"]${bbox};);out center;`;
}
