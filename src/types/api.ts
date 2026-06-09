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

  // เงินสด/เงินโอนสำหรับปิดยอดรายวัน
  cashDrawerExpected: number;
  transferNet: number;

  // รายรับรายจ่ายอื่น
  otherIncome: number;
  otherExpense: number;
  otherIncomeCash: number;
  otherExpenseCash: number;
  otherIncomeTransfer: number;
  otherExpenseTransfer: number;
  otherPaymentCount: number;

  // ลูกหนี้
  receivableTotal: number;
  receivableCount: number;
  receivableCollected: number;
  receivableCollectedCash: number;
  receivableCollectedTransfer: number;
  receivableCollectedCount: number;

  // คู่ค้า / สินค้าเข้าร้าน
  supplierBillTotal: number;
  supplierBillCount: number;
  stockInCount: number;
  stockInQuantity: number;

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
  imageUrl?: string | null;
  imageURL?: string | null;
  thumbnailUrl?: string | null;
  thumbnailURL?: string | null;
  productImage?: string | null;
}

// API Response wrapper - Success
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

// API Response wrapper - Error
export interface ApiErrorResponse {
  success: false;
  error: string;
  details?: unknown;
  timestamp: string;
}

// Combined API Response type
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Error response (backward compatibility)
export interface ApiError {
  success: false;
  error: string;
  timestamp: string;
}
