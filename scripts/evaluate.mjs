import {starter,recommend,creditsFor} from '../src/data.ts';
import {emptyUserData} from '../src/types.ts';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
// Deliberately small editorial regression cases, never real user relevance labels.
const cases=[
 {title:'Kumbalangi camera',films:['Kumbalangi Nights'],industry:'Malayalam',department:'Cinematography',relevant:['Shyju Khalid']},
 {title:'Bangalore editing',films:['Bangalore Days'],industry:'Malayalam',department:'Film editing',relevant:['Praveen Prabhakar']},
 {title:'Premam score',films:['Premam'],industry:'Malayalam',department:'Music composition',relevant:['Rajesh Murugesan']},
 {title:'Interstellar camera',films:['Interstellar'],industry:'Hollywood',department:'Cinematography',relevant:['Hoyte van Hoytema']},
 {title:'Blade Runner editing',films:['Blade Runner 2049'],industry:'Hollywood',department:'Film editing',relevant:['Joe Walker']},
 {title:'Skyfall score',films:['Skyfall'],industry:'Hollywood',department:'Music composition',relevant:['Thomas Newman']},
];
const movie=n=>starter.films.find(f=>f.title===n);
function candidates(c){return starter.people.filter(p=>creditsFor(starter,p.id,c.industry).some(f=>f.crew.some(x=>x.person===p.id&&x.department===c.department)))}
function ranked(c,algorithm){
 const fav=c.films.map(n=>movie(n).id),prefs={...emptyUserData().preferences,industries:[c.industry],departments:[c.department]};
 if(algorithm==='hybrid')return recommend(starter,fav,prefs,c.industry).map(r=>r.person.name);
 const genres=new Set(c.films.flatMap(n=>movie(n).genres));
 return candidates(c).map(p=>({name:p.name,score:algorithm==='popularity'?creditsFor(starter,p.id,c.industry).length:creditsFor(starter,p.id,c.industry).reduce((n,f)=>n+f.genres.filter(g=>genres.has(g)).length,0)})).sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).map(x=>x.name);
}
const algorithms=['hybrid','popularity','genre-overlap'];const details=cases.map(c=>({case:c.title,relevant:c.relevant,rankings:Object.fromEntries(algorithms.map(a=>[a,ranked(c,a)]))}));
const metrics=Object.fromEntries(algorithms.map(a=>{let reciprocal=0,hit=0;for(const d of details){const rank=d.rankings[a].findIndex(n=>d.relevant.includes(n));if(rank>=0)reciprocal+=1/(rank+1);if(rank>=0&&rank<3)hit++;}return [a,{mrr:Number((reciprocal/cases.length).toFixed(3)),hitAt3:Number((hit/cases.length).toFixed(3))}]}));
assert.equal(metrics.hybrid.mrr,1,'Regression: source-credit preference should rank its technician first.');
const report={scope:'Six handcrafted fixture cases over the 10-film starter catalogue, with relevant technicians selected from known credits. Regression evidence only; not a held-out user study, calibration, fairness analysis or proof of generalization.',metrics,details};
await writeFile('docs/evaluation-results.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({scope:report.scope,metrics},null,2));
