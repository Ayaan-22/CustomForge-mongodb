"use client";

import { useAdminQuery } from "./use-admin-query";
import { apiClient } from "@/lib/api-client";

export const useDashboardOverview = (period: string) =>
  useAdminQuery(["dashboard-overview", period], async () => {
      const [sales, users, orders, products] = await Promise.all([
        apiClient.getSalesAnalytics(period === "1y" ? 365 : parseInt(period, 10)),
        apiClient.getUserAnalytics(period),
        apiClient.getOrderAnalytics(period),
        apiClient.getProductStats(),
      ]);

      return {
        metrics: [
          {
            label: "Total Revenue",
            value: `$${sales.totalRevenue.toLocaleString()}`,
            change: sales.growth == null ? null : `${sales.growth}%`,
            positive: sales.growth != null && sales.growth >= 0,
            icon: "revenue",
          },
          {
            label: "Total Orders",
            value: orders.totalOrders.toLocaleString(),
            change: orders.growth == null ? null : `${orders.growth}%`,
            positive: orders.growth != null && orders.growth >= 0,
            icon: "orders",
          },
          {
            label: "Active Users",
            value: users.activeUsers.toLocaleString(),
            change: users.growth == null ? null : `${users.growth}%`,
            positive: users.growth != null && users.growth >= 0,
            icon: "users",
          },
          {
            label: "Active Products",
            value: products.activeProducts.toLocaleString(),
            change: products.growth == null ? null : `${products.growth}%`,
            positive: products.growth != null && products.growth >= 0,
            icon: "products",
          },
        ],
        revenueData: sales.revenueData,
        ordersData: orders.ordersData,
        productStats: [
          {
            label: "Total Products",
            value: products.totalProducts.toString(),
            subtext: "Active",
          },
          {
            label: "Low Stock",
            value: products.lowStock.toString(),
            subtext: "Alert",
            color: "warning",
          },
          {
            label: "Out of Stock",
            value: products.outOfStock.toString(),
            subtext: "Critical",
            color: "danger",
          },
        ],
        userStats: [
          { label: "Total Users", value: users.totalUsers.toLocaleString() },
          { label: "Active Users", value: users.activeUsers.toLocaleString() },
          { label: "New Users", value: users.newUsers.toLocaleString() },
        ],
        recentOrders: orders.recentOrders,
        alerts: [
          { type: "warning", message: `${products.lowStock} products low on stock` },
          { type: "danger", message: `${products.outOfStock} products out of stock` },
          { type: "info", message: `${users.newUsers} new users in selected period` },
        ],
      };
    });

