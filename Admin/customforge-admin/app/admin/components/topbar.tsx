"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Search, ChevronRight, ChevronDown, LogOut, UserRound, ShieldCheck, ArrowUpRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/components/auth-provider";
import { useAuthStore } from "@/lib/auth-store";
import { adminNavigation, currentAdminPage } from "@/lib/admin-navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AdminThemeSwitch } from "@/components/admin-theme-switch";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();
  const actionCode = useAuthStore(state => state.twoFactorToken);
  const pathname = usePathname(); const router = useRouter(); const queryClient = useQueryClient();
  const page = currentAdminPage(pathname);
  const [searchOpen, setSearchOpen] = useState(false); const [codeOpen, setCodeOpen] = useState(false); const [code, setCode] = useState("");
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(value => !value); }
    }
    document.addEventListener("keydown", shortcut); return () => document.removeEventListener("keydown", shortcut);
  }, []);
  return <div className="fa-header-wrap"><header className="fa-topbar">
    <div className="fa-topbar-location"><button type="button" className="fa-icon-button fa-mobile-menu" onClick={onMenuClick} aria-label="Open navigation"><Menu size={20} /></button><span className="fa-topbar-workspace">Workspace</span><ChevronRight size={14} aria-hidden="true" /><span>{page?.label ?? "Administration"}</span></div>
    <div className="fa-topbar-actions">
      <button type="button" className="fa-workspace-search" onClick={() => setSearchOpen(true)} aria-label="Search admin pages"><Search size={17} /><span>Search workspace</span><kbd>⌘ / Ctrl K</kbd></button>
      <AdminThemeSwitch />
      {user?.twoFactorEnabled && <Popover open={codeOpen} onOpenChange={setCodeOpen}><PopoverTrigger asChild><button type="button" className="fa-icon-button" aria-label="Sensitive action code"><ShieldCheck size={19} /></button></PopoverTrigger><PopoverContent align="end"><form className="space-y-3" onSubmit={event => { event.preventDefault(); if (code.length !== 6) return; useAuthStore.getState().setTwoFactorToken(code); void queryClient.invalidateQueries({ queryKey: ["admin"] }); setCode(""); setCodeOpen(false); }}><strong className="text-sm">Authorize protected actions</strong><p className="text-xs text-muted-foreground">Enter the current code from your authenticator.</p><label htmlFor="admin-action-code" className="sr-only">Current authenticator code</label><Input id="admin-action-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ""))} placeholder="6-digit code" /><Button type="submit" disabled={code.length !== 6}>Use code</Button></form></PopoverContent></Popover>}
      <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="fa-user-trigger" aria-label="Account menu"><span className="fa-avatar">{user?.name?.charAt(0).toUpperCase() || "A"}</span><span className="fa-user-copy"><strong>{user?.name || "Admin"}</strong><small>{user?.role || "Administrator"}</small></span><ChevronDown size={14} aria-hidden="true" /></button></DropdownMenuTrigger><DropdownMenuContent align="end" aria-label="Admin account"><DropdownMenuLabel>YOUR ACCOUNT</DropdownMenuLabel><DropdownMenuItem asChild><Link href="/admin/profile"><UserRound />Profile & security</Link></DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" onSelect={() => void logout()}><LogOut />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    </div>
    <CommandDialog className="fa-command-dialog" open={searchOpen} onOpenChange={setSearchOpen} title="Search workspace" description="Find an admin page and press Enter to open it."><CommandInput placeholder="Search pages, tools and settings…" aria-label="Search workspace pages" /><CommandList><CommandEmpty>No matching page. Try products, orders or inventory.</CommandEmpty>{["Workspace", "Commerce", "People & activity", "Account"].map(group => <CommandGroup heading={group} key={group}>{adminNavigation.filter(item => item.group === group).map(item => { const Icon = item.icon; return <CommandItem key={item.href} value={item.label + " " + item.description} onSelect={() => { setSearchOpen(false); router.push(item.href); }}><Icon /><span className="fa-command-copy"><strong>{item.label}</strong><small>{item.description}</small></span><ArrowUpRight className="ml-auto" /></CommandItem>; })}</CommandGroup>)}</CommandList></CommandDialog>
  </header>{user?.twoFactorEnabled && !actionCode && <div className="fa-protected-notice" role="status"><ShieldCheck size={19} aria-hidden /><div><strong>Authorize access to protected data</strong><p>Your account uses two-factor authentication. Enter a current authenticator code to load management data and authorize protected actions.</p></div><Button type="button" variant="outline" onClick={() => setCodeOpen(true)}>Enter code</Button></div>}</div>;
}
