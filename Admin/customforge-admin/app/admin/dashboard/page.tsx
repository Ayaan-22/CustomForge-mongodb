"use client"

import Link from "next/link"
import { ArrowUpRight, Gauge, Package, ShoppingBag } from "lucide-react"
import { DashboardOverview } from "../components/dashboard-overview"
import { PageShell } from "@/components/patterns/page-shell"
import { SectionHeader } from "@/components/patterns/section-header"
import { Button } from "@/components/ui/button"
import "../forge-insights.css"

export default function DashboardPage() {
  return (
    <PageShell className="fi-page">
      <SectionHeader
        eyebrow="Store operations"
        title="Your store. In focus."
        description="Track performance, spot inventory pressure, and keep every order moving."
        icon={<Gauge />}
        actions={<>
          <Button asChild variant="outline"><Link href="/admin/orders"><ShoppingBag aria-hidden /> Manage orders <ArrowUpRight aria-hidden /></Link></Button>
          <Button asChild variant="outline"><Link href="/admin/products"><Package aria-hidden /> View catalog <ArrowUpRight aria-hidden /></Link></Button>
        </>}
      />
      <DashboardOverview />
    </PageShell>
  )
}
