import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement, ReactNode } from 'react';

const fixture=vi.hoisted(()=>({effects:[] as Array<()=>unknown>,verify:vi.fn()}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),use:()=>({token:'email-link-token'}),useEffect:(effect:()=>unknown)=>{fixture.effects.push(effect);}}));
vi.mock('@/lib/auth-client',()=>({authClient:{verifyEmail:fixture.verify}}));
import VerifyEmailPage from '@/app/verify-email/[token]/page';
function click(node:ReactNode):(()=>void)|undefined {
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node))return node.map(click).find(Boolean);
  const props=(node as ReactElement<{onClick?:()=>void;children?:ReactNode}>).props;
  return props?.onClick||click(props?.children);
}
beforeEach(()=>{fixture.effects=[];fixture.verify.mockReset();});
describe('admin email link confirmation',()=>{
  it('does not verify on mount and requires an explicit single submission',async()=>{
    fixture.verify.mockResolvedValue({message:'Verified'});
    let page!:ReactElement;
    function Harness(){page=VerifyEmailPage({params:Promise.resolve({token:'email-link-token'})});return page;}
    expect(renderToStaticMarkup(<Harness/>)).toContain('Confirm email address');
    fixture.effects.forEach(effect=>effect());
    expect(fixture.verify).not.toHaveBeenCalled();
    const confirm=click(page);confirm!();confirm!();
    await Promise.resolve();
    expect(fixture.verify).toHaveBeenCalledExactlyOnceWith('email-link-token');
  });
});
