/**
 * API response types
 * Type definitions for API endpoints
 */

// Dashboard KPI
export interface DashboardKPI {
  // วันนี้
  todaySales: number;
  todayProfit: number;
  todayBills: number;
  todayCash: number;
  todayTransfer: number;

  // เดือนนี้
  monthSales: number;
  monthProfit: number;
  monthBills: number;

  // อัตรา
  profitMargin: number; // อัตรากำไรขั้นต้น (%)
}

// Daily Sales Data (สำหรับกราฟ)
export interface DailySales {
  date: string; // ISO date string
  sales: number;
  profit: number;
  bills: number;
  cash: number;
  transfer: number;
}

// Top Product
export interface TopProduct {
  name: string;
  sales: number;
  profit: number;
  quantity: number;
  profitMargin: number; // %
}

// Loss Product (รายการขาดทุน)
export interface LossProduct {
  name: string;
  sales: number;
  profit: number; // จะเป็นค่าลบ
  quantity: number;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

// Error response
export interface ApiError {
  success: false;
  error: string;
  timestamp: string;
}
