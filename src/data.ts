import snapshot from '../data/catalogue.json' with {type:'json'};
import type {Catalogue,Film,Person,IndustryFilter,Preferences,Feedback} from './types';
export type {Person,Film} from './types';
export const starter=snapshot as Catalogue;
export const departments=['Cinematography','Film editing','Music composition','Sound design','Sound editing','Production sound mixing','Production design','Art direction','Costume design','Visual effects','Makeup and prosthetics','Choreography','Color grading','Animation'];
export const styles=['Natural lighting','Naturalistic visuals','High-contrast lighting','Atmospheric cinematography','Handheld camerawork','Long takes','Symmetrical compositions','Experimental camera movement','Fast-paced editing','Slow, contemplative pacing','Nonlinear storytelling','Montage-heavy editing','Continuity-driven editing','Minimalist scoring','Atmospheric sound','Electronic soundtracks','Orchestral composition','Experimental sound design'];
export const creditsFor=(data:Catalogue,id:string,industry:IndustryFilter='All Cinema')=>data.films.filter(f=>(industry==='All Cinema'||f.industry===industry)&&f.crew.some(c=>c.person===id));
const overlap=(a:string[],b:string[])=>{const x=new Set(a),y=new Set(b);return x.size&&y.size?[...x].filter(v=>y.has(v)).length/new Set([...x,...y]).size:0};
export type Recommendation={person:Person;score:number;matched:string[];references:Film[];reason:string;annotations:Catalogue['annotations']};
export function recommend(data:Catalogue,favourites:string[],preferences:Preferences,industry:IndustryFilter='All Cinema',feedback:Feedback={}):Recommendation[]{
 const visible=data.films.filter(f=>(industry==='All Cinema'||f.industry===industry)&&preferences.industries.includes(f.industry));
 const liked=visible.filter(f=>favourites.includes(f.id));const genres=[...new Set([...preferences.genres,...liked.flatMap(f=>f.genres)])];
 const cold=!liked.length&&!genres.length&&!preferences.styles.length&&!preferences.departments.length;
 return data.people.filter(p=>feedback[p.id]!=='dismiss').flatMap(person=>{
  const works=visible.filter(f=>f.crew.some(c=>c.person===person.id)); if(!works.length)return [];
  if(preferences.departments.length&&!works.some(f=>f.crew.some(c=>c.person===person.id&&preferences.departments.includes(c.department))))return [];
  const direct=works.filter(f=>favourites.includes(f.id));
  // Film-specific style evidence stays attached to its credited technician, never to the whole crew.
  const annotations=data.annotations.filter(a=>a.person===person.id&&works.some(f=>f.id===a.film)&&preferences.styles.includes(a.tag)&&a.source.status==='source-checked');
  const matched=[...new Set(annotations.map(a=>a.tag))];
  const affinity=liked.length?direct.length/liked.length:0;
  const genre=overlap(genres,works.flatMap(f=>f.genres));
  const style=preferences.styles.length?matched.length/preferences.styles.length:0;
  const department=preferences.departments.length?1:0;
  // No popularity/film-count term. Internal ranking scores are never displayed as probabilities.
  const score=.5*affinity+.25*style+.15*genre+.1*department+(feedback[person.id]==='like'?.08:0);
  if(!cold&&score===0)return [];
  const references=[...direct,...works.filter(f=>annotations.some(a=>a.film===f.id)&&!direct.includes(f)),...works.filter(f=>!direct.includes(f)&&!annotations.some(a=>a.film===f.id))];
  const reason=[direct.length?`You selected ${direct.map(f=>f.title).join(', ')}, which credit ${person.name}.`:'',matched.length?`Film-specific evidence supports your interest in ${matched.join(' and ')}.`:'',!direct.length&&genre?`Their credited films include genres in your taste profile: ${[...new Set(works.flatMap(f=>f.genres))].filter(g=>genres.includes(g)).join(', ')}.`:'',department?`Their credited roles match your preferred department.`:'',feedback[person.id]==='like'?'You previously liked this recommendation.':'',cold?'An alphabetical starting point from this collection; add favourite films to personalize.':''].filter(Boolean).join(' ');
  return [{person,score,matched,references,reason,annotations}];
 }).sort((a,b)=>b.score-a.score||a.person.name.localeCompare(b.person.name));
}
export type Filters={industry:IndustryFilter;department:string;genre:string;role:string;from:number;to:number;language:string;country:string;style:string};
export const defaultFilters:Filters={industry:'All Cinema',department:'',genre:'',role:'',from:1900,to:2100,language:'',country:'',style:''};
export const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase();
function oneEdit(a:string,b:string){if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,n=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue}if(++n>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return n+(i<a.length||j<b.length?1:0)<=1;}
export function textMatch(text:string,q:string){const t=normalize(text),terms=normalize(q).trim().split(/\s+/).filter(Boolean);return terms.every(term=>t.includes(term)||(term.length>=4&&t.split(/[^\p{L}\p{N}]+/u).some(w=>oneEdit(w,term))));}
export function filterCatalogue(data:Catalogue,query:string,f:Filters){
 const films=data.films.filter(m=>(f.industry==='All Cinema'||m.industry===f.industry)&&m.year>=f.from&&m.year<=f.to&&(!f.genre||m.genres.includes(f.genre))&&(!f.language||m.language===f.language)&&(!f.country||m.countries.includes(f.country))&&(!f.department||m.crew.some(c=>c.department===f.department))&&(!f.role||m.crew.some(c=>c.role===f.role))&&(!f.style||data.annotations.some(a=>a.film===m.id&&a.tag===f.style)));
 const people=data.people.filter(p=>films.some(m=>m.crew.some(c=>c.person===p.id&&(!f.department||c.department===f.department)&&(!f.role||c.role===f.role))))
 .filter(p=>!f.style||data.annotations.some(a=>a.person===p.id&&a.tag===f.style&&films.some(m=>m.id===a.film)))
 .filter(p=>textMatch([p.name,...p.alternativeNames,p.department,...films.filter(m=>m.crew.some(c=>c.person===p.id)).flatMap(m=>[m.title,...m.genres,...m.crew.filter(c=>c.person===p.id).map(c=>c.role)]),...p.styles].join(' '),query));
 return {people,films:films.filter(m=>textMatch([m.title,m.originalTitle,m.language,...m.genres,...m.crew.flatMap(c=>[c.role,c.department,data.people.find(p=>p.id===c.person)?.name||''])].join(' '),query))};
}
export function collaborators(data:Catalogue,id:string,industry:IndustryFilter='All Cinema',department=''){
 const works=creditsFor(data,id,industry);return data.people.filter(p=>p.id!==id).map(person=>({person,films:works.filter(f=>f.crew.some(c=>c.person===person.id&&(!department||c.department===department)))})).filter(x=>x.films.length).sort((a,b)=>b.films.length-a.films.length||a.person.name.localeCompare(b.person.name));
}
