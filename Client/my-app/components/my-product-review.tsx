"use client";
import {useState} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useAuth} from '@/lib/auth-context';
import {ReviewService} from '@/services/review-service';
import {requireSuccess} from '@/lib/query-result';
import {useDeleteReview} from '@/hooks/use-reviews';
import {ReviewForm} from './review-form';
import {Button} from './ui/button';
import Link from 'next/link';
import {toast} from 'sonner';
export function MyProductReview({productId}:{productId:string}) {
 const {user,isAuthenticated,isEmailVerified}=useAuth();
 const [editing,setEditing]=useState(false);
 const mine=useQuery({queryKey:['my-review',productId,user?.id],enabled:isAuthenticated&&isEmailVerified,queryFn:()=>ReviewService.mine(productId).then(requireSuccess)});
 const remove=useDeleteReview(productId);
 if(!isAuthenticated)return <Link href={'/login?redirect='+encodeURIComponent('/products/'+productId)} className="underline">Sign in to write a review</Link>;
 if(!isEmailVerified)return <Link href="/verify-email" className="underline">Verify your email to write a review</Link>;
 if(mine.isPending)return <p role="status">Loading your review…</p>;
 if(mine.error)return <div role="alert"><p>{mine.error.message}</p><Button onClick={()=>mine.refetch()}>Retry your review</Button></div>;
 const review=mine.data?.data;
 if(!review)return <ReviewForm productId={productId}/>;
 return <section className="space-y-3 rounded-lg border p-4"><h3 className="font-semibold">Your review</h3><p className="text-sm text-muted-foreground">{review.isActive?'Published':'Not public — pending moderation or withdrawn'}</p>
 {editing?<ReviewForm key={review.id} productId={productId} review={review} onSuccess={()=>setEditing(false)}/>:<><p className="font-medium">{review.title}</p><p>{review.comment}</p></>}
 <div className="flex gap-2"><Button variant="outline" onClick={()=>setEditing(!editing)}>{editing?'Cancel editing':'Edit review'}</Button><Button variant="outline" disabled={remove.isPending} onClick={async()=>{if(!confirm('Withdraw this review from public display?'))return;try{await remove.mutateAsync(review.id);toast.success('Review withdrawn')}catch(error){toast.error(error instanceof Error?error.message:'Unable to withdraw review')}}}>Withdraw review</Button></div></section>;
}
