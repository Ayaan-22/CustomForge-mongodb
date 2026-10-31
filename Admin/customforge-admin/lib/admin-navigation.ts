import { BarChart3, Boxes, LayoutDashboard, Package, ShoppingBag, Users, TicketPercent, MessageSquare, ScrollText, UserRound } from "lucide-react";

export const adminNavigation = [
  { href: "/admin/dashboard", label: "Overview", group: "Workspace", icon: LayoutDashboard, description: "Your store at a glance" },
  { href: "/admin/analytics/sales", label: "Sales analytics", group: "Workspace", icon: BarChart3, description: "Revenue and product performance" },
  { href: "/admin/analytics/inventory", label: "Inventory", group: "Workspace", icon: Boxes, description: "Stock levels and availability" },
  { href: "/admin/products", label: "Products", group: "Commerce", icon: Package, description: "Manage the gaming catalog" },
  { href: "/admin/orders", label: "Orders", group: "Commerce", icon: ShoppingBag, description: "Fulfillment and order details" },
  { href: "/admin/coupons", label: "Coupons", group: "Commerce", icon: TicketPercent, description: "Discounts and promotions" },
  { href: "/admin/users", label: "Customers", group: "People & activity", icon: Users, description: "Customer accounts and details" },
  { href: "/admin/reviews", label: "Reviews", group: "People & activity", icon: MessageSquare, description: "Ratings and moderation" },
  { href: "/admin/logs", label: "Activity log", group: "People & activity", icon: ScrollText, description: "Review recorded admin activity" },
  { href: "/admin/profile", label: "My profile", group: "Account", icon: UserRound, description: "Profile and account security" },
] as const;

export function currentAdminPage(pathname: string) {
  return adminNavigation.find(item => pathname.startsWith(item.href));
}
