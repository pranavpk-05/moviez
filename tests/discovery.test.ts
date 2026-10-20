import {describe,it,expect} from 'vitest';
import {starter,recommend,filterCatalogue,defaultFilters,collaborators} from '../src/data';
import {emptyUserData} from '../src/types';
const movie=(title:string)=>starter.films.find(f=>f.title===title)!;
const person=(name:string)=>starter.people.find(p=>p.name===name)!;
describe('source-backed discovery',()=>{
 it('has equal industry coverage, unique IDs and no dangling crew',()=>{
  expect(starter.films.filter(f=>f.industry==='Malayalam')).toHaveLength(5);expect(starter.films.filter(f=>f.industry==='Hollywood')).toHaveLength(5);
  expect(new Set(starter.people.map(p=>p.id)).size).toBe(starter.people.length);
  for(const f of starter.films)for(const c of f.crew){expect(starter.people.some(p=>p.id===c.person)).toBe(true);expect(c.source.url).toMatch(/^https:/);}
 });
 it('finds titles, crafts, credited roles, partial names and a one-character typo',()=>{
  expect(filterCatalogue(starter,'Kumbalangi',defaultFilters).films[0].title).toBe('Kumbalangi Nights');
  expect(filterCatalogue(starter,'Deakns',defaultFilters).people.some(p=>p.name==='Roger Deakins')).toBe(true);
  expect(filterCatalogue(starter,'photography',defaultFilters).people.length).toBeGreaterThan(1);
  expect(filterCatalogue(starter,'Hoyte',defaultFilters).people[0].name).toBe('Hoyte van Hoytema');
 });
 it('combines cinema, department, genre and year filters',()=>{
  const r=filterCatalogue(starter,'',{...defaultFilters,industry:'Hollywood',department:'Cinematography',genre:'Science fiction',from:2015,to:2020});
  expect(r.films.map(f=>f.title)).toEqual(['Blade Runner 2049']);expect(r.people.map(p=>p.name)).toEqual(['Roger Deakins']);
 });
 it('uses shared films once per collaboration and respects industry',()=>{
  const c=collaborators(starter,person('Roger Deakins').id,'Hollywood');
  expect(c.find(x=>x.person.name==='Dennis Gassner')?.films.map(f=>f.title).sort()).toEqual(['Blade Runner 2049','Skyfall']);
  expect(collaborators(starter,person('Roger Deakins').id,'Malayalam')).toEqual([]);
 });
 it('recommends technicians with supporting real credits and no score percentages',()=>{
  const prefs=emptyUserData().preferences;const list=recommend(starter,[movie('Kumbalangi Nights').id],{...prefs,industries:['Malayalam'],departments:['Cinematography']});
  expect(list[0].person.name).toBe('Shyju Khalid');expect(list[0].reason).toContain('Kumbalangi Nights');
  for(const r of list)for(const f of r.references)expect(f.crew.some(c=>c.person===r.person.id)).toBe(true);
 });
 it('does not transfer a cinematographer style to composers on the same film',()=>{
  const list=recommend(starter,[],{...emptyUserData().preferences,styles:['Atmospheric cinematography']},'Hollywood');
  expect(list.map(r=>r.person.name)).toEqual(['Roger Deakins']);expect(list[0].annotations[0].film).toBe(movie('Blade Runner 2049').id);
 });
 it('dismisses recommendations and handles a cold start without popularity scoring',()=>{
  const prefs=emptyUserData().preferences;const cold=recommend(starter,[],prefs);expect(cold[0].person.name).toBe('Alphonse Puthren');expect(cold.every(r=>r.score===0)).toBe(true);
  const filtered=recommend(starter,[],prefs,'All Cinema',{[cold[0].person.id]:'dismiss'});expect(filtered.some(r=>r.person.id===cold[0].person.id)).toBe(false);
 });
 it('keeps unsupported style requests out of explanations',()=>{expect(recommend(starter,[],{...emptyUserData().preferences,styles:['Electronic soundtracks']})).toEqual([])});
});
