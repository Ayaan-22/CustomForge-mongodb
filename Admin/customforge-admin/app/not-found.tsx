import Link from "next/link";
import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { AdminBrand } from "@/components/admin-brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="admin-main-content" className="fa-not-found" tabIndex={-1}>
      <AdminBrand />
      <section className="fa-state" aria-labelledby="missing-page-title">
        <div className="fa-not-found-number" aria-hidden>404</div>
        <span className="fa-kicker">Route not found</span>
        <h1 id="missing-page-title" className="fa-state-title">This page is off the map.</h1>
        <p>The address may have changed. Return to your workspace or sign in to continue.</p>
        <div className="fa-error-actions">
          <Button asChild><Link href="/admin/dashboard"><LayoutDashboard size={16} />Open workspace</Link></Button>
          <Button variant="outline" asChild><Link href="/login"><ArrowLeft size={16} />Sign in</Link></Button>
        </div>
      </section>
    </main>
  );
}
