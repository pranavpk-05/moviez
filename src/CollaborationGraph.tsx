import {useMemo,useState} from 'react';
import {ReactFlow,Background,Controls,MiniMap,type Node,type Edge} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {collaborators} from './data';
import type {Catalogue,IndustryFilter} from './types';
export function CollaborationGraph({data,id,industry,department,navigate}:{data:Catalogue;id:string;industry:IndustryFilter;department:string;navigate:(page:string,id?:string)=>void}){
 const [selected,setSelected]=useState('');
 const connections=useMemo(()=>collaborators(data,id,industry,department),[data,id,industry,department]);
 const center=data.people.find(p=>p.id===id);
 const {nodes,edges}=useMemo(()=>{
  const bounded=connections.slice(0,24);const nodes:Node[]=[{id,position:{x:360,y:260},data:{label:center?.name||'Technician'},style:{background:'#d6ad76',color:'#101315',border:'1px solid #e8bd85',width:160}}];
  const edges:Edge[]=[];
  bounded.forEach((x,i)=>{const angle=2*Math.PI*i/bounded.length;nodes.push({id:x.person.id,position:{x:360+330*Math.cos(angle),y:260+230*Math.sin(angle)},data:{label:x.person.name},style:{background:'#191c23',color:'#f3f0e9',border:'1px solid #8c744f',width:150}});edges.push({id:x.person.id,source:id,target:x.person.id,label:`${x.films.length} shared`,style:{stroke:'#8c744f'},labelStyle:{fill:'#f3f0e9'},labelBgStyle:{fill:'#191c23'}})});return {nodes,edges};
 },[connections,id,center]);
 const connection=connections.find(c=>c.person.id===selected);
 return <><p className="section-desc">Click a collaborator or an edge to inspect shared productions. Drag the canvas, zoom, or use the controls. Showing up to 24 connections.</p>{!connections.length?<div className="empty"><h3>No shared credits in this selection</h3></div>:<div className="graph" aria-label="Technician collaboration graph"><ReactFlow key={id+industry+department} nodes={nodes} edges={edges} fitView minZoom={.25} maxZoom={1.7} nodesDraggable={false} onNodeClick={(_,n)=>{if(n.id!==id)setSelected(n.id)}} onEdgeClick={(_,e)=>setSelected(e.id)}><Background color="#3c414a"/><Controls/><MiniMap maskColor="#0d1015bb" nodeColor="#d6ad76"/></ReactFlow></div>}
 <div className="collab-list">{connections.slice(0,24).map(c=><button key={c.person.id} onClick={()=>setSelected(c.person.id)}><span><strong>{c.person.name}</strong><small>{c.person.department} · {c.films.length} shared film{c.films.length===1?'':'s'}</small></span></button>)}</div>
 {connection&&<div className="style-panel"><h3>{center?.name} × {connection.person.name}</h3><p>{center?.department} / {connection.person.department}</p>{[...connection.films].sort((a,b)=>a.year-b.year).map(f=><button key={f.id} className="text-link timeline-item" onClick={()=>navigate('film',f.id)}>{f.year} — {f.title}</button>)}<button className="btn secondary" onClick={()=>navigate('person',connection.person.id)}>Open technician profile</button></div>}
 </>;
}
