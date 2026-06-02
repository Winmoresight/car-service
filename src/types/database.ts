/**
 * Database types
 * Type definitions for database tables and queries
 */

// Master Sale Post (หัวบิลขาย)
export interface MasterSalePost {
  NumberPrintSalePost: string;
  DateSalePost: Date;
  TotalPrice: number;
  TotalCost: number;
  TotalProfit: number;
  Cash: number;
  Transfer: number;
  CustomerName?: string;
  CustomerPhone?: string;
  CarRegistration?: string;
}

// Detail Sale Post (รายการขาย)
export interface DetailSalePost {
  NumberPrintSalePost: string;
  BarCode: string;
  NameProduct: string;
  NumProduct: number;
  SalePrice: number;
  SumPrice: number;
  SumCost: number;
  SumProfit: number;
}

// Master Product
export interface MasterProduct {
  CodeProduct: string;
  NameProduct: string;
  TypeProduct?: string;
  CategoryProduct?: string;
  Active: boolean;
}

// Master Product Detail
export interface MasterProductDetail {
  BarCode: string;
  CodeProduct: string;
  NameProduct: string;
  SalePrice: number;
  CostPrice: number;
  Stock: number;
  Active: boolean;
}

// Customer
export interface Customer {
  CustomerID: string;
  CustomerName: string;
  CustomerPhone?: string;
  CustomerAddress?: string;
  CustomerIDCard?: string;
  CustomerBirthDate?: Date;
  Province?: string;
}

// Stock Movement
export interface INOUTStockProduct {
  DateSave: Date;
  NumberPrint: string;
  BarCode: string;
  NameProduct: string;
  Debit: number;
  Credit: number;
  Stock: number;
  CostPrice: number;
  NameCompany?: string;
}
