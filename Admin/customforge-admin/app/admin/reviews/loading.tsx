import "../forge-operations.css";
import { PageShell } from "@/components/patterns/page-shell";

export default function Loading() {
  return (
    <PageShell className="fo-page" role="status" aria-label="Loading reviews workspace">
      <div className="space-y-3" aria-hidden="true">
        <div className="fo-loading-bar !h-3 !w-36" />
        <div className="fo-loading-bar !h-8 !w-72 max-w-full" />
      </div>
      <div className="fo-stats fo-stats-five" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((stat) => <div className="fo-loading-bar !h-32" key={stat} />)}
      </div>
      <div className="fa-panel fo-loading" aria-hidden="true">
        {[0, 1, 2, 3].map((row) => <div className="fo-loading-bar" key={row} />)}
      </div>
      <span className="sr-only">Loading review queue…</span>
    </PageShell>
  );
}
