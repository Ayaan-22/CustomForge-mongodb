"use client";
import {useEffect,type ReactNode} from 'react';
import {usePathname,useRouter} from 'next/navigation';
import {useAuth} from '@/lib/auth-context';
import {Skeleton} from '@/components/ui/skeleton';
export function RequireSession({children}:{children:ReactNode}) {
  const {isAuthenticated,isLoading,isEmailVerified}=useAuth();
  const router=useRouter(),pathname=usePathname();
  useEffect(()=>{if(!isLoading) {
    if(!isAuthenticated) router.replace('/login?redirect='+encodeURIComponent(pathname));
    else if(!isEmailVerified) router.replace('/verify-email');
  }},[isAuthenticated,isLoading,isEmailVerified,pathname,router]);
  if(isLoading || !isAuthenticated || !isEmailVerified)return <div className="container p-6" aria-label="Loading account"><Skeleton className="h-64 w-full"/></div>;
  return children;
}
