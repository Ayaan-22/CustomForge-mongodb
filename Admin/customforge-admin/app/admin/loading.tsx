import { LoadingSkeleton } from "@/components/patterns/loading-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return <div className="space-y-6"><div className="space-y-3"><Skeleton className="h-3 w-32" /><Skeleton className="h-9 w-64" /><Skeleton className="h-4 w-full max-w-lg" /></div><LoadingSkeleton variant="dashboard" /></div>;
}
