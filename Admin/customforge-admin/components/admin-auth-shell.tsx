import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Boxes, ChartNoAxesCombined, ShieldCheck, ShoppingBag } from "lucide-react";
import { AdminBrand } from "@/components/admin-brand";
import { AdminThemeSwitch } from "@/components/admin-theme-switch";
import "@/app/forge-auth.css";

/** Shared public auth layout; decorative artwork never implies live store data. */
export function AdminAuthShell({ eyebrow, title, description, children, footer, back = false, variant = "default" }: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  back?: boolean;
  variant?: "default" | "register";
}) {
  return <main id="admin-main-content" className={`faa-shell${variant === "register" ? " faa-shell-register" : ""}`} tabIndex={-1}>
    <AdminThemeSwitch className="faa-theme-switch" />
    <section className="faa-story" aria-label="CustomForge admin workspace">
      <AdminBrand />
      <div className="faa-story-content">
        <p className="faa-kicker">The CustomForge control room</p>
        <h2>Every detail.<br /><span>Under control.</span></h2>
        <p className="faa-story-description">A focused workspace for the people behind every great gaming setup.</p>
        <div className="faa-workspace-art" aria-hidden="true">
          <div className="faa-art-orbit" />
          <svg className="faa-art-connections" viewBox="0 0 460 220" fill="none"><path d="M76 60H175L232 110H375M76 166H175L232 110" stroke="var(--primary)" strokeOpacity=".35" /><path d="M232 110V34M232 110V194" stroke="var(--fa-violet)" strokeOpacity=".3" strokeDasharray="4 6" /><circle cx="232" cy="110" r="39" fill="var(--fa-accent-soft)" stroke="var(--primary)" strokeOpacity=".6" /><circle cx="232" cy="110" r="28" stroke="var(--primary)" strokeOpacity=".18" /></svg>
          <div className="faa-art-node is-commerce"><ShoppingBag /><span>Commerce</span></div>
          <div className="faa-art-node is-inventory"><Boxes /><span>Inventory</span></div>
          <div className="faa-art-node is-insights"><ChartNoAxesCombined /><span>Insights</span></div>
          <div className="faa-art-core"><AdminBrand compact /></div>
          <span className="faa-art-caption">Connected operations. One workspace.</span>
        </div>
      </div>
      <div className="faa-story-footer"><ShieldCheck aria-hidden /><div><strong>Access with purpose</strong><p>Administrator permissions are assigned separately to authorized team members.</p></div></div>
    </section>
    <section className="faa-form-side" aria-labelledby="faa-page-title">
      <div className="faa-mobile-brand"><AdminBrand /></div>
      <div className="faa-form-card">
        {back ? <Link href="/login" className="faa-back-link"><ArrowLeft aria-hidden /> Back to sign in</Link> : null}
        <header className="faa-form-header"><p className="faa-kicker">{eyebrow}</p><h1 id="faa-page-title">{title}</h1><p>{description}</p></header>
        {children}
        {footer ? <div className="faa-footer">{footer}</div> : null}
      </div>
      <p className="faa-form-fineprint"><ShieldCheck aria-hidden /> CustomForge admin workspace</p>
    </section>
  </main>;
}

/** Handles Error instances and the message objects returned by existing callbacks. */
export function getAdminAuthErrorMessage(error: unknown, fallback: string) {
  return error && typeof error === "object" && "message" in error && typeof error.message === "string" ? error.message || fallback : fallback;
}
