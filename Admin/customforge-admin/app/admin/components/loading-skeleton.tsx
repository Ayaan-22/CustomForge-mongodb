"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return <div className="fa-panel fa-skeleton-panel space-y-4" aria-busy="true"><span className="sr-only">Loading metric…</span><Skeleton className="h-4 w-1/3" /><Skeleton className="h-8 w-1/2" /></div>;
}
export function TableSkeleton() {
  return <div className="fa-panel fa-skeleton-panel space-y-4" aria-busy="true"><span className="sr-only">Loading records…</span>{Array.from({length:5},(_,i)=><Skeleton key={i} className="h-12 w-full" />)}</div>;
}
export function ChartSkeleton() {
  return <div className="fa-panel fa-skeleton-panel space-y-4" aria-busy="true"><span className="sr-only">Loading chart…</span><Skeleton className="h-4 w-1/4" /><Skeleton className="h-64 w-full" /></div>;
}
