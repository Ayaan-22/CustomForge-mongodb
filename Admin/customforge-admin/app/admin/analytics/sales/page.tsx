"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdminQuery } from "@/hooks/use-admin-query";
import { QueryError } from "@/components/patterns/query-error";
import { LoadingSkeleton } from "@/components/patterns/loading-skeleton";
import { PageShell } from "@/components/patterns/page-shell";
import { SectionHeader } from "@/components/patterns/section-header";
import { ActionBar } from "@/components/patterns/action-bar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, CalendarDays, CircleDollarSign, Info, RefreshCw, ShoppingBag, TrendingUp, Users, Wallet } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { apiClient } from "@/lib/api-client";
import { INSIGHTS_COLORS, InsightsDataTable, InsightsEmpty, InsightsTooltip, insightsShortDate, insightsShortMoney } from "../../components/dashboard-charts";
import "../../forge-insights.css";

const PERIODS = [{ value: "7d", label: "7 days" }, { value: "30d", label: "30 days" }, { value: "90d", label: "90 days" }, { value: "1y", label: "1 year" }];
const MONEY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const reportDate = (value: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));

export default function SalesAnalyticsPage() {
  const [period, setPeriod] = useState("30d");
  const [grouping, setGrouping] = useState("daily");
  const days = ({ "7d": 7, "30d": 30, "90d": 90, "1y": 365 } as Record<string, number>)[period] || 30;
  const query = useAdminQuery(["analytics", "sales", days, grouping], () => apiClient.getSalesAnalytics(days, grouping));
  const data = query.data;
  const chartData = data?.revenueData || [];
  const maxRevenue = Math.max(1, ...(data?.topProducts || []).map((product) => product.totalRevenue));

  return <PageShell className="fi-page">
    <SectionHeader eyebrow="Commerce intelligence" title="Sales performance" description="See what drives revenue, how customers buy, and which products lead the way." icon={<TrendingUp />} actions={<Button asChild variant="outline"><Link href="/admin/orders">Explore orders <ArrowUpRight aria-hidden /></Link></Button>} />

    <ActionBar layout="split">
      <div className="fi-report-field">
        <span id="sales-period-label" className="fi-control-label">Reporting period</span>
        <div className="fa-segmented" role="group" aria-labelledby="sales-period-label">
          {PERIODS.map((p) => <Button key={p.value} type="button" variant="ghost" size="sm" aria-pressed={period === p.value} className={period === p.value ? "is-active" : ""} onClick={() => setPeriod(p.value)}>{p.label}</Button>)}
        </div>
      </div>
      <div className="fi-report-field">
        <span id="sales-grouping-label" className="fi-control-label">Group results</span>
        <div className="fi-toolbar-actions">
          <div className="fa-segmented" role="group" aria-labelledby="sales-grouping-label">
            {["daily", "weekly", "monthly"].map((value) => <Button key={value} type="button" variant="ghost" size="sm" aria-pressed={grouping === value} className={grouping === value ? "is-active" : ""} onClick={() => setGrouping(value)}>{value.charAt(0).toUpperCase() + value.slice(1)}</Button>)}
          </div>
          <Button type="button" variant="outline" size="icon" aria-label="Refresh sales analytics" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw aria-hidden className={query.isFetching ? "fi-refreshing" : ""} /></Button>
        </div>
      </div>
    </ActionBar>
    {query.error ? <QueryError error={query.error} retry={() => query.refetch()} /> : null}
    {query.isLoading ? <LoadingSkeleton variant="dashboard" /> : null}
    {!query.isLoading && !query.error && data ? <>
      {data.range?.startDate && data.range.endDate ? <div><span className="fi-report-range"><CalendarDays aria-hidden />{reportDate(data.range.startDate)} — {reportDate(data.range.endDate)} · UTC</span></div> : null}
      <div className="fa-stat-grid">
        {[
          { label: "Total revenue", value: MONEY.format(data.totalRevenue), detail: "Paid orders", Icon: CircleDollarSign },
          { label: "Total orders", value: (data.totalOrders || 0).toLocaleString(), detail: "Paid orders in range", Icon: ShoppingBag },
          { label: "Average order value", value: MONEY.format(data.avgOrderValue || 0), detail: "Revenue per paid order", Icon: Wallet },
          { label: "New customers", value: data.customerStats?.newCustomers == null ? "Unavailable" : data.customerStats.newCustomers.toLocaleString(), detail: "First paid purchase in range", Icon: Users },
        ].map(({ label, value, detail, Icon }) => <Card key={label} className="fa-stat fi-metric"><div className="fi-metric-top"><span>{label}</span><span className="fi-metric-icon"><Icon aria-hidden /></span></div><strong className="fi-metric-value">{value}</strong><div className="fi-metric-bottom"><span>{detail}</span></div></Card>)}
      </div>
      <p className="fi-scope-note"><Info aria-hidden /> All sales figures use paid orders in the selected range and exclude cancelled or refunded orders. Charts show recorded activity; days with no sales have no bucket.</p>

      <div className="fi-chart-grid">
        <Card className="fa-panel fi-panel"><div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Revenue movement</p><h2>Revenue over time</h2><p>{grouping.charAt(0).toUpperCase() + grouping.slice(1)} paid sales · USD</p></div></div>
          {chartData.length ? <><div className="fi-chart" role="img" aria-label={`${MONEY.format(data.totalRevenue)} total revenue across ${chartData.length} recorded ${grouping} buckets. Values are available in the chart data table.`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ left: -12, right: 8, top: 10, bottom: 0 }} accessibilityLayer><defs><linearGradient id="fi-sales-revenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={INSIGHTS_COLORS.cyan} stopOpacity={.24} /><stop offset="100%" stopColor={INSIGHTS_COLORS.cyan} stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 5" stroke={INSIGHTS_COLORS.grid} /><XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={12} minTickGap={28} tickFormatter={insightsShortDate} /><YAxis axisLine={false} tickLine={false} tickFormatter={insightsShortMoney} width={80} tickMargin={10} /><Tooltip content={<InsightsTooltip />} cursor={{ stroke: INSIGHTS_COLORS.cursorStroke, strokeDasharray: "4 4" }} /><Area type="monotone" dataKey="revenue" name="Revenue" stroke={INSIGHTS_COLORS.cyan} strokeWidth={2.5} fill="url(#fi-sales-revenue)" isAnimationActive={false} /></AreaChart></ResponsiveContainer></div><div className="fi-legend"><span><i />Revenue in USD</span></div><InsightsDataTable title="Revenue by reporting bucket" rows={chartData} columns={[{ key: "date", label: "Bucket start (UTC)" }, { key: "revenue", label: "Revenue", money: true }, { key: "avgOrderValue", label: "Avg. order value", money: true }]} /></> : <InsightsEmpty title="No paid revenue in this period" />}
        </Card>
        <Card className="fa-panel fi-panel"><div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Purchase volume</p><h2>Orders over time</h2><p>{grouping.charAt(0).toUpperCase() + grouping.slice(1)} paid orders · count</p></div></div>
          {chartData.length ? <><div className="fi-chart" role="img" aria-label={`${data.totalOrders.toLocaleString()} paid orders across ${chartData.length} recorded ${grouping} buckets. Values are available in the chart data table.`}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} margin={{ left: -22, right: 4, top: 10, bottom: 0 }} accessibilityLayer><CartesianGrid vertical={false} strokeDasharray="3 5" stroke={INSIGHTS_COLORS.grid} /><XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={12} minTickGap={28} tickFormatter={insightsShortDate} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tickMargin={10} /><Tooltip content={<InsightsTooltip />} cursor={{ fill: INSIGHTS_COLORS.violetCursorFill }} /><Bar dataKey="orders" name="Paid orders" fill={INSIGHTS_COLORS.violet} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} /></BarChart></ResponsiveContainer></div><div className="fi-legend"><span><i className="is-violet" />Paid orders</span></div><InsightsDataTable title="Paid orders by reporting bucket" rows={chartData} columns={[{ key: "date", label: "Bucket start (UTC)" }, { key: "orders", label: "Paid orders" }]} /></> : <InsightsEmpty title="No paid orders in this period" />}
        </Card>
      </div>

      <div className="fi-two-panels">
        <Card className="fa-panel fi-panel"><div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Product leaderboard</p><h2>Top selling products</h2><p>Up to 10 products ranked by paid item revenue in this period.</p></div><Button asChild variant="outline" size="icon"><Link href="/admin/products" aria-label="Manage products"><ArrowUpRight aria-hidden /></Link></Button></div>
          {data.topProducts?.length ? <ol className="fi-ranking">{data.topProducts.map((product, index) => <li key={product.productId}><span className="fi-rank">{String(index + 1).padStart(2, "0")}</span><div><h3>{product.name}</h3><div className="fi-rank-track" aria-hidden><span style={{ width: `${Math.max(0, product.totalRevenue / maxRevenue * 100)}%` }} /></div></div><div className="fi-rank-value"><strong>{MONEY.format(product.totalRevenue)}</strong><span>{product.totalQuantity.toLocaleString()} units sold</span></div></li>)}</ol> : <InsightsEmpty title="No product sales yet" description="Products appear here when paid orders contain product line items." />}
        </Card>
        <Card className="fa-panel fi-panel"><div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Customer behavior</p><h2>Who's buying</h2><p>Customers with a paid order in the selected range.</p></div></div><dl className="fi-stat-list"><div><dt>Purchasing customers</dt><dd><strong>{(data.customerStats?.totalCustomers || 0).toLocaleString()}</strong></dd></div><div><dt>New customers<span className="fi-subtext">First paid purchase in this range</span></dt><dd><strong>{data.customerStats?.newCustomers == null ? "Unavailable" : data.customerStats.newCustomers.toLocaleString()}</strong></dd></div><div><dt>Returning customers<span className="fi-subtext">Paid purchase before this range</span></dt><dd><strong>{data.customerStats?.returningCustomers == null ? "Unavailable" : data.customerStats.returningCustomers.toLocaleString()}</strong></dd></div><div><dt>Returning customer share</dt><dd><strong>{data.customerStats?.returningCustomers == null ? "Unavailable" : data.customerStats.totalCustomers > 0 ? `${(data.customerStats.returningCustomers / data.customerStats.totalCustomers * 100).toFixed(1)}%` : "0%"}</strong></dd></div></dl><div className="fi-alert is-info"><Info aria-hidden /><p>Revenue growth: <strong>{data.growth == null ? "Unavailable" : `${data.growth > 0 ? "+" : ""}${data.growth}%`}</strong>{data.growth == null ? ". A previous-period comparison is not supplied by this report." : " versus the previous period."}</p></div></Card>
      </div>
    </> : null}
  </PageShell>;
}
