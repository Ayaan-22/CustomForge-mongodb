"use client";

import { Card } from "@/components/ui/card";
import { ChartNoAxesCombined } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import "../forge-insights.css";

export type DashboardChartRow = Record<string, unknown>;
const MONEY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const SHORT_MONEY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
// SVG attributes resolve CSS variables in place so every chart follows the theme
// immediately, including gradients, legends, hover cursors and tooltip swatches.
export const INSIGHTS_COLORS = {
  cyan: "var(--primary)",
  violet: "var(--fa-violet)",
  grid: "var(--border)",
  text: "var(--muted-foreground)",
  warning: "var(--fa-warning)",
  danger: "var(--fa-danger)",
  cursorStroke: "color-mix(in srgb, var(--primary) 40%, transparent)",
  cursorFill: "color-mix(in srgb, var(--primary) 7%, transparent)",
  violetCursorFill: "color-mix(in srgb, var(--fa-violet) 7%, transparent)",
};
export const insightsShortMoney = (value: number) => SHORT_MONEY.format(value);
export const insightsShortDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
};

// Labels and units stay readable even when the chart is explored with a keyboard.
export function InsightsTooltip({ active, label, payload }: {
  active?: boolean;
  label?: unknown;
  payload?: readonly { name?: unknown; value?: unknown; color?: string; dataKey?: unknown }[];
}) {
  if (!active || !payload?.length) return null;
  return <div className="fi-chart-tooltip">
    {label != null ? <strong>{String(label)}</strong> : null}
    {payload.map((entry, index) => <div key={`${String(entry.dataKey)}-${index}`}><span><i style={{ background: entry.color || INSIGHTS_COLORS.cyan }} />{String(entry.name || entry.dataKey || "Value")}</span><b>{["revenue", "avgOrderValue", "totalRevenue"].includes(String(entry.dataKey)) ? MONEY.format(Number(entry.value)) : typeof entry.value === "number" ? entry.value.toLocaleString() : String(entry.value ?? "")}</b></div>)}
  </div>;
}

export function InsightsEmpty({ title = "No activity in this period", description = "Try a wider reporting period to explore more store activity." }: { title?: string; description?: string }) {
  return <div className="fi-empty"><ChartNoAxesCombined aria-hidden /><h3>{title}</h3><p>{description}</p></div>;
}

export function InsightsDataTable({ title, rows, columns }: {
  title: string;
  rows: DashboardChartRow[];
  columns: { key: string; label: string; money?: boolean }[];
}) {
  if (!rows.length) return null;
  return <details className="fi-data-details"><summary>View chart data</summary><div className="fi-table-scroll" tabIndex={0} role="region" aria-label={`${title}, scroll horizontally to view all columns`}><table className="fi-table"><caption>{title}</caption><thead><tr>{columns.map((column) => <th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${String(row.date ?? row.category ?? index)}-${index}`}>{columns.map((column) => <td key={column.key}>{column.money ? MONEY.format(Number(row[column.key] ?? 0)) : typeof row[column.key] === "number" ? Number(row[column.key]).toLocaleString() : String(row[column.key] ?? "—")}</td>)}</tr>)}</tbody></table></div></details>;
}

export function DashboardCharts({ revenueData, ordersData }: {
  revenueData: DashboardChartRow[];
  ordersData: DashboardChartRow[];
}) {
  const revenue = revenueData.reduce((total, row) => total + Number(row.revenue || 0), 0);
  const orders = ordersData.reduce((total, row) => total + Number(row.orders || 0), 0);
  const delivered = ordersData.reduce((total, row) => total + Number(row.delivered || 0), 0);
  return (
    <div className="fi-chart-grid">
      <Card className="fa-panel fi-panel">
        <div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Revenue performance</p><h2>Revenue trend</h2><p>Paid sales and average order value · USD</p></div></div>
        {revenueData.length ? <>
          <div className="fi-chart" role="img" aria-label={`Revenue trend across ${revenueData.length} recorded days, total ${MONEY.format(revenue)}. Detailed values are available in the chart data table.`}>
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={revenueData} margin={{ left: -12, right: 8, top: 10, bottom: 0 }} accessibilityLayer>
              <defs><linearGradient id="fi-dashboard-revenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={INSIGHTS_COLORS.cyan} stopOpacity={.24} /><stop offset="100%" stopColor={INSIGHTS_COLORS.cyan} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} strokeDasharray="3 5" stroke={INSIGHTS_COLORS.grid} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={12} minTickGap={28} tickFormatter={insightsShortDate} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={insightsShortMoney} width={80} tickMargin={10} />
              <Tooltip content={<InsightsTooltip />} cursor={{ stroke: INSIGHTS_COLORS.cursorStroke, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke={INSIGHTS_COLORS.cyan} strokeWidth={2.5} fill="url(#fi-dashboard-revenue)" isAnimationActive={false} />
              <Area type="monotone" dataKey="avgOrderValue" name="Avg. order value" stroke={INSIGHTS_COLORS.violet} strokeWidth={1.5} strokeDasharray="4 3" fill="transparent" isAnimationActive={false} />
            </AreaChart></ResponsiveContainer>
          </div>
          <div className="fi-legend"><span><i />Revenue</span><span><i className="is-violet" />Avg. order value</span></div>
          <InsightsDataTable title="Revenue trend in USD" rows={revenueData} columns={[{ key: "date", label: "Date (UTC)" }, { key: "revenue", label: "Revenue", money: true }, { key: "avgOrderValue", label: "Avg. order value", money: true }]} />
        </> : <InsightsEmpty title="No paid sales in this period" />}
      </Card>
      <Card className="fa-panel fi-panel">
        <div className="fa-panel-heading fi-panel-heading"><div><p className="fa-kicker">Order performance</p><h2>Orders per day</h2><p>Total orders and delivered orders · count</p></div></div>
        {ordersData.length ? <>
          <div className="fi-chart" role="img" aria-label={`${orders.toLocaleString()} orders, including ${delivered.toLocaleString()} delivered, across ${ordersData.length} recorded days. Detailed values are available in the chart data table.`}>
            <ResponsiveContainer width="100%" height="100%"><BarChart data={ordersData} margin={{ left: -22, right: 4, top: 10, bottom: 0 }} barGap={3} accessibilityLayer>
              <CartesianGrid vertical={false} strokeDasharray="3 5" stroke={INSIGHTS_COLORS.grid} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={12} minTickGap={28} tickFormatter={insightsShortDate} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tickMargin={10} />
              <Tooltip content={<InsightsTooltip />} cursor={{ fill: INSIGHTS_COLORS.cursorFill }} />
              <Bar dataKey="orders" name="All orders" fill={INSIGHTS_COLORS.cyan} radius={[3, 3, 0, 0]} maxBarSize={20} isAnimationActive={false} />
              <Bar dataKey="delivered" name="Delivered" fill={INSIGHTS_COLORS.violet} radius={[3, 3, 0, 0]} maxBarSize={20} isAnimationActive={false} />
            </BarChart></ResponsiveContainer>
          </div>
          <div className="fi-legend"><span><i />All orders</span><span><i className="is-violet" />Delivered</span></div>
          <InsightsDataTable title="Daily order counts" rows={ordersData} columns={[{ key: "date", label: "Date (UTC)" }, { key: "orders", label: "All orders" }, { key: "delivered", label: "Delivered" }]} />
        </> : <InsightsEmpty title="No orders in this period" />}
      </Card>
    </div>
  );
}
