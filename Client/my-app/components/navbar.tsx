"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  Heart,
  User,
  Monitor,
  Zap,
  Wrench,
  GitCompareArrows,
  Package,
  MapPin,
  CreditCard,
  ShieldCheck,
  LogOut,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Brand } from "@/components/forge/brand";
import { MiniCart } from "@/components/forge/mini-cart";
import {
  NavigationMenus,
  MobileCategoryGroups,
} from "@/components/forge/navigation-menus";
import { SearchField } from "@/components/forge/search-field";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const links = [
  { href: "/products", label: "Shop all", icon: null },
  {
    href: "/products?category=Prebuilt%20PCs",
    label: "Prebuilt PCs",
    icon: Monitor,
  },
  { href: "/pc-builder", label: "PC builder", icon: Wrench },
  { href: "/deals", label: "Deals", icon: Zap },
];
const accountLinks = [
  { href: "/profile", label: "My profile", icon: User },
  { href: "/orders", label: "My orders", icon: Package },
  { href: "/addresses", label: "Addresses", icon: MapPin },
  { href: "/payment-methods", label: "Payment methods", icon: CreditCard },
  { href: "/profile/security", label: "Security & 2FA", icon: ShieldCheck },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [mobile, setMobile] = useState(false);
  // URL reading is deferred so a search field never makes the global shell CSR-only.
  useEffect(() => {
    const syncSearch = () =>
      setQ(
        pathname === "/search"
          ? new URLSearchParams(window.location.search).get("q") || ""
          : "",
      );
    syncSearch();
    setMobile(false);
    window.addEventListener("popstate", syncSearch);
    return () => window.removeEventListener("popstate", syncSearch);
  }, [pathname]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        Array.from(
          document.querySelectorAll<HTMLInputElement>(".forge-search input"),
        )
          .find((input) => input.offsetWidth > 0)
          ?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return (
    <>
      <div className="forge-announcement">
        <span>
          <i className="forge-status-dot" /> BUILT BY GAMERS. FOR YOUR NEXT
          LEVEL.
        </span>
        <Link href="/pc-builder" prefetch={false}>
          Your dream rig starts here <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <header className="forge-header">
        <div className="forge-container forge-nav-main">
          <Sheet open={mobile} onOpenChange={setMobile}>
            <SheetTrigger asChild>
              <button
                className="forge-nav-icon md:hidden"
                aria-label="Open navigation"
              >
                <Menu size={22} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="forge-navigation-sheet">
              <SheetHeader>
                <SheetTitle>
                  <Brand />
                </SheetTitle>
                <SheetDescription>
                  Find the gear. Forge your advantage.
                </SheetDescription>
              </SheetHeader>
              <nav
                className="forge-mobile-navigation"
                aria-label="Mobile shop navigation"
              >
                <Button
                  variant="ghost"
                  asChild
                  className="justify-start"
                  onClick={() => setMobile(false)}
                >
                  <Link href="/products" prefetch={false}>
                    Shop all products
                  </Link>
                </Button>
                <MobileCategoryGroups
                  open={mobile}
                  onSelect={() => setMobile(false)}
                />
                {links.slice(1).map(({ href, label, icon: Icon }) => (
                  <Button
                    variant="ghost"
                    asChild
                    key={href}
                    className="justify-start"
                    onClick={() => setMobile(false)}
                  >
                    <Link href={href} prefetch={false}>
                      {Icon && <Icon size={18} />} {label}
                    </Link>
                  </Button>
                ))}
                <Button
                  asChild
                  variant="outline"
                  onClick={() => setMobile(false)}
                >
                  <Link href="/compare" prefetch={false}>
                    <GitCompareArrows />
                    Compare products
                  </Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/" prefetch={false} aria-label="CustomForge home">
            <Brand />
          </Link>
          <div className="forge-desktop-search">
            <SearchField
              value={q}
              onChange={setQ}
              onNavigate={() => setMobile(false)}
            />
          </div>
          <nav className="forge-nav-actions" aria-label="Account and shopping">
            <Link
              href="/wishlist"
              prefetch={false}
              className="forge-nav-icon"
              aria-label="Wishlist"
            >
              <Heart size={20} />
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="forge-nav-icon" aria-label="Account menu">
                  <User size={20} />
                  <span className="hidden xl:inline">
                    {user?.name?.split(" ")[0] || "Account"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64"
                aria-label="Account navigation"
              >
                <DropdownMenuLabel>
                  {user ? "Your command center" : "Welcome, player"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user ? (
                  <>
                    {accountLinks.map(({ href, label, icon: Icon }) => (
                      <DropdownMenuItem asChild key={href}>
                        <Link href={href}>
                          <Icon aria-hidden="true" />
                          {label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => void logout()}>
                      <LogOut aria-hidden="true" />
                      Sign out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/login">
                        <LogIn aria-hidden="true" />
                        Sign in
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/register">
                        <UserPlus aria-hidden="true" />
                        Create account
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="forge-nav-divider" />
            <MiniCart />
          </nav>
        </div>
        <div className="forge-mobile-search forge-container">
          <SearchField
            value={q}
            onChange={setQ}
            onNavigate={() => setMobile(false)}
          />
        </div>
        <div className="forge-nav-bottom">
          <nav className="forge-container" aria-label="Shop navigation">
            <Link
              href="/products"
              prefetch={false}
              className={cn(
                "forge-nav-link",
                pathname === "/products" && "is-active",
              )}
              aria-current={pathname === "/products" ? "page" : undefined}
            >
              Shop all
            </Link>
            <NavigationMenus
              routeKey={pathname}
              onOpen={() => {
                if (document.activeElement instanceof HTMLInputElement)
                  document.activeElement.blur();
              }}
            />
            {links.slice(1).map(({ href, label, icon: Icon }) => (
              <Link
                href={href}
                prefetch={false}
                key={href}
                className={cn(
                  "forge-nav-link",
                  pathname === href && "is-active",
                )}
                aria-current={pathname === href ? "page" : undefined}
              >
                {Icon && <Icon size={15} />} {label}
                {label === "PC builder" && (
                  <span className="forge-small-tag">BETA</span>
                )}
              </Link>
            ))}
            <Link
              className="forge-nav-compare"
              href="/compare"
              prefetch={false}
            >
              <GitCompareArrows size={15} /> Compare
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
