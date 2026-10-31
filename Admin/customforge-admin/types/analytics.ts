export type ProductStats = {totalProducts:number;activeProducts:number;lowStock:number;outOfStock:number;growth:number|null};
export type UserAnalytics = {totalUsers:number;activeUsers:number;verifiedUsers:number;newUsers:number;adminUsers:number;growth:number|null;userGrowth:Array<{date:string;count:number}>};
export type SalesAnalytics = {
  totalRevenue:number;totalOrders:number;avgOrderValue:number;growth:number|null;
  revenueData:Array<{date:string;orders:number;revenue:number;avgOrderValue:number}>;
  topProducts:Array<{productId:string;name:string;totalQuantity:number;totalRevenue:number}>;
  customerStats:{totalCustomers:number;newCustomers:number;returningCustomers:number};
  period:string;range:{startDate:string;endDate:string};
};
export type OrderAnalytics = {
  totalOrders:number;paidOrders:number;totalRevenue:number;growth:number|null;statusCounts:Record<string,number>;
  ordersData:Array<{date:string;orders:number;delivered:number}>;
  recentOrders:Array<{id:string;customer:string;amount:number;status:string}>;
};
type InventoryProduct = {id:string;name:string;stock:number;is_active:boolean;sales_count:number;category:string;sku:string};
export type InventoryAnalytics = {
  stockLevels:{totalStock:number;avgStock:number;inStock:number;lowStock:number;outOfStock:number};
  categoryStock:Array<{category:string;totalStock:number;productCount:number;lowStockCount:number;avgStock:number}>;
  lowStockProducts:InventoryProduct[];outOfStockProducts:InventoryProduct[];topSellingProducts:InventoryProduct[];
};
export type DashboardOverview = {users:{total:number};products:{total:number;lowStock:number};orders:{total:number;paid:number;revenue:number}};
