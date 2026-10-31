import { Brand } from "@/components/forge/brand";
import { LoadingSkeleton } from "@/components/patterns/loading-skeleton";

export default function RouteLoading() {
  return (
    <div className="forge-container min-h-dvh py-10">
      <div className="mb-6 flex items-center gap-4" role="status">
        <Brand compact />
        <span className="forge-eyebrow">LOADING YOUR NEXT LEVEL…</span>
      </div>
      <LoadingSkeleton count={4} />
    </div>
  );
}
