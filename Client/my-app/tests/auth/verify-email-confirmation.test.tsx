import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement, ReactNode } from 'react';

const fixture = vi.hoisted(() => ({effects: [] as Array<() => unknown>, verify: vi.fn()}));
vi.mock('react', async original => ({...await original<typeof import('react')>(),useEffect:(effect: () => unknown) => {fixture.effects.push(effect);}}));
vi.mock('next/navigation', () => ({useParams: () => ({token:'email-link-token'})}));
vi.mock('@/services/auth-service', () => ({AuthService:{verifyEmail:fixture.verify}}));
import VerifyEmailTokenPage from '@/app/verify-email/[token]/page';

function findClick(node: ReactNode): (() => void) | undefined {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.map(findClick).find(Boolean);
  const props = (node as ReactElement<{onClick?:()=>void;children?:ReactNode}>).props;
  return props?.onClick || findClick(props?.children);
}
beforeEach(() => {fixture.effects=[];fixture.verify.mockReset();});

describe('email link confirmation', () => {
  it('leaves the link unused on mount/replay and submits only once after an explicit confirmation', async () => {
    fixture.verify.mockResolvedValue({error:null,data:{token:'access',user:{id:'verified'}},status:200});
    let page!: ReactElement;
    function Harness() {page=VerifyEmailTokenPage();return page;}
    const html = renderToStaticMarkup(<Harness />);
    expect(html).toContain('Confirm email address');
    for(const effect of fixture.effects) {effect();effect();}
    expect(fixture.verify).not.toHaveBeenCalled();
    const confirm = findClick(page);
    expect(confirm).toBeTypeOf('function');
    confirm!();confirm!();
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
    expect(fixture.verify).toHaveBeenCalledExactlyOnceWith('email-link-token');
  });
});
