'use client';
import {useEffect,useRef,useState} from 'react';
type Point={id:string;kind:string;name:string|null;name_bn:string|null;latitude:number;longitude:number;source_url:string};
type LeafletMap={getBounds:()=>{getSouth:()=>number;getNorth:()=>number;getWest:()=>number;getEast:()=>number};on:(event:string,cb:()=>void)=>void;remove:()=>void};
declare global {interface Window {L?:{map:(el:HTMLElement,opts:object)=>LeafletMap;tileLayer:(url:string,opts:object)=>{addTo:(m:LeafletMap)=>void};layerGroup:()=>{addTo:(m:LeafletMap)=>{clearLayers:()=>void;addLayer:(m:unknown)=>void}};circleMarker:(coords:[number,number],opts:object)=>{bindPopup:(html:string)=>unknown}}}}
function escapeHTML(s:string){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c))}
export function TransportMap(){const host=useRef<HTMLDivElement>(null),mapRef=useRef<LeafletMap|null>(null),layerRef=useRef<{clearLayers:()=>void;addLayer:(m:unknown)=>void}|null>(null);
 const [kind,setKind]=useState('all'),[query,setQuery]=useState(''),[count,setCount]=useState(0),[message,setMessage]=useState('Map loading…');const kindRef=useRef(kind),queryRef=useRef(query);
 kindRef.current=kind;queryRef.current=query;
 const loadRef=useRef<()=>void>(()=>{});
 useEffect(()=>{let alive=true;const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';document.head.appendChild(css);
 const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';script.async=true;
 script.onload=()=>{if(!alive||!host.current||!window.L)return;const L=window.L;const map=L.map(host.current,{center:[23.8,90.3],zoom:7,scrollWheelZoom:false});mapRef.current=map;
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:18}).addTo(map);
 const group=L.layerGroup().addTo(map);layerRef.current=group;
 let seq=0;
 const load=async()=>{const n=++seq;const b=map.getBounds();const params=new URLSearchParams({south:String(b.getSouth()),north:String(b.getNorth()),west:String(b.getWest()),east:String(b.getEast())});
 if(kindRef.current!=='all')params.set('kind',kindRef.current);if(queryRef.current.trim())params.set('q',queryRef.current.trim());
 try{const res=await fetch('/api/map/points?'+params);if(!res.ok)throw new Error('Database migration or connection missing');const data=await res.json() as {points:Point[];limited?:boolean};if(n!==seq||!alive)return;group.clearLayers();
 for(const p of data.points){const color=p.kind.startsWith('railway')?'#7c3aed':'#0d9488';const marker=L.circleMarker([p.latitude,p.longitude],{radius:p.kind.endsWith('station')?7:4,color,fillColor:color,fillOpacity:.75});
 const label=escapeHTML(p.name_bn||p.name||'Unnamed OSM feature');const url=encodeURI(p.source_url);group.addLayer(marker.bindPopup(`<strong>${label}</strong><br>${escapeHTML(p.kind.replaceAll('_',' '))}<br><a href="${url}" target="_blank" rel="noopener noreferrer">OpenStreetMap source</a>`));}
 setCount(data.points.length);setMessage(data.limited?'Showing first 1,000 features. Zoom in for more.':data.points.length?'OSM mapped locations — not verified services':'No imported map points here yet. Automatic daily sync will gradually populate the map.');
 }catch(e){if(n===seq&&alive)setMessage(e instanceof Error?e.message:'Unable to load points')}};
 loadRef.current=load;map.on('moveend',load);load();};
 script.onerror=()=>setMessage('Map library failed to load');document.body.appendChild(script);
 return()=>{alive=false;mapRef.current?.remove();mapRef.current=null;script.remove();css.remove()};},[]);
 return <section className="panel mt-6"><div className="mb-4 flex flex-wrap items-end gap-3"><label className="text-sm font-semibold">Type<select className="field mt-1" value={kind} onChange={e=>{setKind(e.target.value);kindRef.current=e.target.value;loadRef.current()}}><option value="all">All stops and stations</option><option value="bus_stop">Bus stops</option><option value="bus_station">Bus stations</option><option value="railway_station">Railway stations</option><option value="railway_halt">Railway halts</option></select></label><label className="text-sm font-semibold">Name<input className="field mt-1" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Dhaka / ঢাকা"/></label><button className="btn" type="button" onClick={()=>loadRef.current()}>Search map</button><span className="text-sm text-slate-500">{count} visible features</span></div><div ref={host} style={{height:520,width:'100%',borderRadius:14,zIndex:0}} role="region" aria-label="Interactive Bangladesh transport map"/><p className="mt-3 text-sm text-slate-600">{message}</p><p className="mt-2 text-xs text-slate-500">© OpenStreetMap contributors (ODbL). Map markers reflect contributed geographic features, not verified bus/train service, fare, schedule or live GPS. Map tiles subject to OpenStreetMap usage policy.</p></section>
}
