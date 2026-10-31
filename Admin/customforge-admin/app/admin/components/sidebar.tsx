"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AdminBrand } from "@/components/admin-brand";
import { adminNavigation } from "@/lib/admin-navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";

type SidebarProps = { open: boolean; onToggle: () => void; collapsed?: boolean; onCollapse?: () => void };
export function Sidebar({ open, onToggle, collapsed = false, onCollapse }: SidebarProps) {
  const pathname = usePathname();
  function navigation(compact = false, close?: () => void) {
    return <nav className="fa-navigation" aria-label="Admin navigation">
      {["Workspace", "Commerce", "People & activity", "Account"].map(group => <div className="fa-nav-group" key={group}>
        <p className={cn("fa-nav-label", compact && "sr-only")}>{group}</p>
        {adminNavigation.filter(item => item.group === group).map(item => {
          const Icon = item.icon; const active = pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} prefetch={false} onClick={close} title={compact ? item.label : undefined} aria-label={item.label} aria-current={active ? "page" : undefined} className={cn("fa-nav-link", active && "is-active")}>
            <Icon size={19} aria-hidden="true" />{!compact && <><span>{item.label}</span>{active && <span className="fa-nav-dot" aria-hidden="true" />}</>}
          </Link>;
        })}
      </div>)}
    </nav>;
  }
  return <>
    <aside className={cn("fa-sidebar", collapsed && "is-collapsed")}>
      <div className="fa-sidebar-brand"><Link href="/admin/dashboard" aria-label="CustomForge admin overview"><AdminBrand compact={collapsed} /></Link></div>
      {navigation(collapsed)}
      <button type="button" className="fa-sidebar-collapse" onClick={onCollapse ?? onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed}>{collapsed ? <ChevronRight size={18} aria-hidden="true" /> : <><ChevronLeft size={18} aria-hidden="true" /><span>Collapse sidebar</span></>}</button>
    </aside>
    <Sheet open={open} onOpenChange={next => { if (next !== open) onToggle(); }}>
      <SheetContent side="left" className="fa-mobile-sidebar"><SheetTitle className="sr-only">Admin navigation</SheetTitle><SheetDescription className="sr-only">Navigate CustomForge administration.</SheetDescription><div className="fa-sidebar-brand"><AdminBrand /></div>{navigation(false, onToggle)}</SheetContent>
    </Sheet>
  </>;
}
