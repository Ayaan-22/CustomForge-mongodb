"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight, CircleDollarSign, ShoppingBag, TrendingUp, TrendingDown,
  Users, Package, AlertTriangle, CircleCheck, Info, RefreshCw,
} from "lucide-react";
import { useDashboardOverview } from "@/hooks/use-dashboard-overview";
import { ErrorState } from "@/components/patterns/error-state";
import { LoadingSkeleton } from "@/components/patterns/loading-skeleton";
import { ActionBar } from "@/components/patterns/action-bar";
import "../forge-insights.css";

const DashboardCharts = dynamic(
  () => import("./dashboard-charts").then((m) => ({ default: m.DashboardCharts })),
  {
    ssr: false,
    loading: () => (
      <div className="fi-chart-grid" aria-busy="true" aria-label="Loading performance charts">
        <Skeleton className="h-[350px] w-full rounded-xl" />
        <Skeleton className="h-[350px] w-full rounded-xl" />
      </div>
    ),
  }
);

const PERIODS = [{ value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }, { value: "90d", label: "90 days" }, { value: "1y", label: "1 year" }];
const METRIC_ICONS = { revenue: CircleDollarSign, orders: ShoppingBag, users: Users, products: Package };
const MONEY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function statusTone(status: string) {
  if (["delivered", "paid"].includes(status)) return "is-success";
  if (["cancelled", "refunded", "returned"].includes(status)) return "is-danger";
  if (["pending", "processing"].includes(status)) return "is-warning";
  return "is-neutral";
}

export function DashboardOverview() {
  const [period, setPeriod] = useState<string>("30d");
  const { data, isPending, isError, error, refetch, isFetching } = useDashboardOverview(period);

  return (
    <div className="fi-overview">
      <ActionBar layout="split">
        <div><p className="fa-kicker">Performance overview</p><p className="fi-toolbar-copy">A clear view of your store&apos;s activity.</p></div>
        <div className="fi-toolbar-actions">
          <div className="fa-segmented" role="group" aria-label="Reporting period">
            {PERIODS.map((p) => <Button key={p.value} type="button" variant="ghost" size="sm" aria-pressed={period === p.value} onClick={() => setPeriod(p.value)} className={period === p.value ? "is-active" : ""}>{p.label}</Button>)}
          </div>
          <Button type="button" variant="outline" size="icon" aria-label="Refresh dashboard" disabled={isFetching} onClick={() => refetch()}><RefreshCw aria-hidden className={isFetching ? "fi-refreshing" : ""} /></Button>
        </div>
      </ActionBar>

      {isPending ? <LoadingSkeleton variant="dashboard" /> : null}
      {isError ? <ErrorState message={error instanceof Error ? error.message : "Failed to load dashboard data"} onRetry={() => refetch()} /> : null}

      {!isPending && !isError && data ? <>
        <div className="fa-stat-grid">
          {data.metrics.map((metric) => {
            const Icon = METRIC_ICONS[metric.icon as keyof typeof METRIC_ICONS] || Package;
            return <Card key={metric.label} className="fa-stat fi-metric">
              <div className="fi-metric-top"><span>{metric.label}</span><span className="fi-metric-icon"><Icon aria-hidden /></span></div>
              <strong className="fi-metric-value">{metric.value}</strong>
              <div className="fi-metric-bottom">
                <span>{metric.icon === "revenue" || metric.icon === "orders" ? `Last ${period === "1y" ? "365" : parseInt(period, 10)} days` : "Current total"}</span>
                {metric.change !== null ? <span className={`fi-change ${metric.positive ? "is-positive" : "is-negative"}`}>{metric.positive ? <TrendingUp aria-hidden /> : <TrendingDown aria-hidden />}{metric.change}</span> : null}
              </div>
            </Card>;
          })}
        </div>
        <p className="fi-scope-note"><Info aria-hidden /> Revenue counts paid orders excluding cancellations and refunds. Active users and products show current totals.</p>
        <DashboardCharts revenueData={data.revenueData} ordersData={data.ordersData} />

        <div className="fi-operations-grid">
          <Card className="fa-panel fi-panel">
            <div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Catalog pulse</p><h2><Package aria-hidden /> Product status</h2></div><Button asChild variant="outline" size="icon"><Link href="/admin/analytics/inventory" aria-label="View inventory analytics"><ArrowUpRight aria-hidden /></Link></Button></div>
            <dl className="fi-stat-list">
              {data.productStats.map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd><strong>{stat.value}</strong>{stat.color ? <span className={`fa-status ${stat.color === "warning" ? "is-warning" : "is-danger"}`}>{stat.subtext}</span> : <span className="fi-subtext">Catalog total</span>}</dd></div>)}
            </dl>
          </Card>
          <Card className="fa-panel fi-panel">
            <div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Community pulse</p><h2><Users aria-hidden /> User statistics</h2></div><Button asChild variant="outline" size="icon"><Link href="/admin/users" aria-label="Manage users"><ArrowUpRight aria-hidden /></Link></Button></div>
            <dl className="fi-stat-list">{data.userStats.map((stat) => <div key={stat.label}><dt>{stat.label}<span className="fi-subtext">{stat.label === "New Users" ? "Selected period" : "Current total"}</span></dt><dd><strong>{stat.value}</strong></dd></div>)}</dl>
          </Card>
          <Card className="fa-panel fi-panel">
            <div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Attention queue</p><h2><AlertTriangle aria-hidden /> Store signals</h2></div></div>
            <div className="fi-alert-list">{data.alerts.map((alert) => <div key={alert.message} className={`fi-alert is-${alert.type}`}>{alert.type === "info" ? <Info aria-hidden /> : <AlertTriangle aria-hidden />}<p>{alert.message}</p></div>)}</div>
          </Card>
        </div>

        <Card className="fa-panel fi-panel fi-orders-panel">
          <div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Order activity</p><h2>Recent orders</h2><p>Up to 10 latest orders in the selected period.</p></div><Button asChild variant="outline"><Link href="/admin/orders">All orders <ArrowUpRight aria-hidden /></Link></Button></div>
          {data.recentOrders.length ? <div className="fa-table-scroll fi-table-scroll" tabIndex={0} role="region" aria-label="Recent orders, scroll horizontally to view all columns"><table className="fa-data-table fi-table"><thead><tr><th scope="col">Order</th><th scope="col">Customer</th><th scope="col" className="fi-numeric">Amount</th><th scope="col">Status</th></tr></thead><tbody>
            {data.recentOrders.map((order) => <tr key={order.id}><td><span className="fi-order-id" title={order.id}>{order.id}</span></td><td>{order.customer}</td><td className="fi-numeric fi-cell-strong">{MONEY.format(order.amount)}</td><td><span className={`fa-status ${statusTone(order.status)}`}>{order.status}</span></td></tr>)}
          </tbody></table></div> : <div className="fi-empty"><CircleCheck aria-hidden /><h3>No orders in this period</h3><p>Choose a wider reporting period to explore earlier activity.</p></div>}
        </Card>
      </> : null}
    </div>
  );
}
