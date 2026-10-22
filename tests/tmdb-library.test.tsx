import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {TmdbLibrary} from '../src/TmdbLibrary';
// @ts-expect-error The server normalizer is an ESM JavaScript module.
import {normalizeMovie} from '../server/tmdb.mjs';
const summary={tmdbId:123,title:'Fixture Film',originalTitle:'Fixture Film',year:2024,language:'ml',poster:null,backdrop:null,overview:'A test synopsis.',rating:8,votes:10,genres:['Drama']};
const catalogue=normalizeMovie({id:123,title:'Fixture Film',original_language:'ml',release_date:'2024-01-01',credits:{crew:[{id:45,name:'Fixture Artist',department:'Camera',job:'Director of Photography'}]}});
beforeEach(()=>{location.hash='#library';window.scrollTo=vi.fn()});
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
const json=(data:unknown)=>Promise.resolve(new Response(JSON.stringify(data),{status:200}));
describe('TMDB library journeys',()=>{
 it('shows the honest connection state and a working included-catalogue link',async()=>{
  vi.stubGlobal('fetch',()=>json({configured:false}));render(<TmdbLibrary initialCinema="All Cinema" favourites={[]} onUseFilm={async()=>{}}/>);
  await screen.findByText('The library is almost ready.');expect(screen.queryByText('CONNECTED TO TMDB')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Explore included films'}));expect(location.hash).toBe('#search');
 });
 it('opens a discovered film, follows its crew profile, and passes normalized credits to taste',async()=>{
  const useFilm=vi.fn(async()=>{});vi.stubGlobal('fetch',(url:string)=>{
   const params=new URL(url,'http://localhost').searchParams;
   switch(params.get('resource')){
    case 'status':return json({configured:true});
    case 'movies':return json({results:[summary],page:1,totalPages:2,totalResults:25,scope:'All Cinema',fetchedAt:'2026-10-22T00:00:00Z'});
    case 'movie':return json({catalogue});
    case 'person':return json({tmdbId:45,name:'Fixture Artist',bio:'A fixture biography.',department:'Camera',photo:null,birthplace:null,source:catalogue.people[0].source,films:[{...summary,jobs:['Director of Photography']}]});
    default:throw new Error('Unexpected test request');
   }
  });
  render(<TmdbLibrary initialCinema="All Cinema" favourites={[]} onUseFilm={useFilm}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Explore Fixture Film'}));
  await screen.findByRole('heading',{name:'Fixture Film',level:1});
  fireEvent.click(screen.getByRole('button',{name:'Use this film for my taste'}));await waitFor(()=>expect(useFilm).toHaveBeenCalledWith(catalogue));
  fireEvent.click(screen.getByRole('button',{name:'Open Fixture Artist, Director of Photography'}));
  await screen.findByRole('heading',{name:'Fixture Artist',level:1});expect(screen.getByText('A fixture biography.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Explore Fixture Film'}));await screen.findByRole('heading',{name:'Fixture Film',level:1});
 });
 it('shows upstream errors and offers a retry without displaying fake results',async()=>{
  vi.stubGlobal('fetch',(url:string)=>new URL(url,'http://localhost').searchParams.get('resource')==='status'?json({configured:true}):Promise.resolve(new Response(JSON.stringify({error:'TMDB is temporarily unavailable.'}),{status:502})));
  render(<TmdbLibrary initialCinema="All Cinema" favourites={[]} onUseFilm={async()=>{}}/>);expect(await screen.findByRole('alert')).toBeTruthy();expect(screen.getByText('TMDB is temporarily unavailable.')).toBeTruthy();expect(screen.queryByRole('button',{name:'Explore Fixture Film'})).toBeNull();expect(screen.getByRole('button',{name:'Try again'})).toBeTruthy();
 });
});
