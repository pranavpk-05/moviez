import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import App from '../src/App';
beforeEach(()=>{location.hash='';window.scrollTo=vi.fn();localStorage.clear();vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}})});
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
async function route(hash:string){location.hash=hash;window.dispatchEvent(new HashChangeEvent('hashchange'));await waitFor(()=>expect(location.hash).toBe(hash));}
describe('rendered app journeys (DOM, not browser layout)',()=>{
 it.each([['Malayalam','Kumbalangi Nights','Shyju Khalid'],['Hollywood','Blade Runner 2049','Roger Deakins']])('explores %s film, crew and linked filmography',async(industry,title,name)=>{
  render(<App/>);await route('#search');fireEvent.click(within(screen.getByRole('group',{name:'Cinema collection'})).getByText(industry));
  await waitFor(()=>expect(screen.getByLabelText('Search movies and technicians')).toBeTruthy());
  fireEvent.change(screen.getByLabelText('Search movies and technicians'),{target:{value:title}});
  await waitFor(()=>expect(screen.getByRole('button',{name:'Open '+title})).toBeTruthy());fireEvent.click(screen.getByRole('button',{name:'Open '+title}));
  await waitFor(()=>expect(screen.getByRole('heading',{name:title,level:1})).toBeTruthy());
  fireEvent.click(screen.getByRole('button',{name:new RegExp(name+'.*Director of photography')}));
  await waitFor(()=>expect(screen.getByRole('heading',{name,level:1})).toBeTruthy());expect(screen.getByText('Known credits in this catalogue')).toBeTruthy();
  const link=screen.getAllByRole('button').find(b=>b.textContent?.includes('— '+title));expect(link).toBeTruthy();fireEvent.click(link!);
  await waitFor(()=>expect(screen.getByRole('heading',{name:title,level:1})).toBeTruthy());
 });
 it('selects three films and displays recommendation explanations with linked evidence',async()=>{
  render(<App/>);await route('#taste');await waitFor(()=>expect(screen.getByText('Which films stay with you?')).toBeTruthy());
  for(const title of ['Kumbalangi Nights','Manjummel Boys','Maheshinte Prathikaaram'])fireEvent.click(screen.getByRole('button',{name:new RegExp('^'+title+'.*')}));
  const reveal=screen.getByRole('button',{name:'Reveal my matches'});expect(reveal.hasAttribute('disabled')).toBe(false);fireEvent.click(reveal);
  await waitFor(()=>expect(screen.getByText('Meet your next')).toBeTruthy());expect(screen.getAllByText(/You selected.*Kumbalangi Nights/).length).toBeGreaterThan(0);
 });
 it('protects saved collections and shows the sign-in boundary to guests',async()=>{render(<App/>);await route('#saved');await waitFor(()=>expect(screen.getByText('Your collection travels with you')).toBeTruthy());fireEvent.click(screen.getByRole('button',{name:'Sign in'}));await waitFor(()=>expect(screen.getByText('Connect your account')).toBeTruthy())});
 it('offers a keyboard-addressable mobile navigation toggle',()=>{render(<App/>);const menu=screen.getByRole('button',{name:'Toggle menu'});expect(menu.getAttribute('aria-expanded')).toBe('false');fireEvent.click(menu);expect(menu.getAttribute('aria-expanded')).toBe('true')});
});
