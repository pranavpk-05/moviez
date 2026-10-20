import {afterEach,describe,it,expect} from 'vitest';
import {cleanup,render,screen,fireEvent,waitFor} from '@testing-library/react';
import {Account} from '../src/Account';
import {usePlatform} from '../src/platform';
function Harness(){const p=usePlatform();return <><button onClick={()=>void p.change({...p.userData,favourites:['test-film']})}>Select a film</button><span data-testid="count">{p.userData.favourites.length}</span><Account platform={p} notify={()=>{}} recovery={false}/></>}
afterEach(cleanup);
describe('guest platform boundary',()=>{it('supports session-local taste while explaining that accounts need Supabase',async()=>{render(<Harness/>);expect(screen.getByText('Connect your account')).toBeTruthy();fireEvent.click(screen.getByText('Select a film'));await waitFor(()=>expect(screen.getByTestId('count').textContent).toBe('1'));expect(localStorage.getItem('btf-favourites')).toBeNull()})});
