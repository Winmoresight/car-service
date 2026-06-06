/**
 * Bill Edit History API
 * GET /api/bills/edit-history - ดึงประวัติการแก้ไข/เปลี่ยนแปลงบิล
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

interface BillEditHistory {
  numberPrint: string;
  editDate: string;
  editTime: string;
  changes: {
    cash: { old: number; new: number };
    transfer: { old: number; new: number };
    bank: { old: string; new: string };
  };
  editedBy: string;
  totalChange: number;
  changeType: 'amount_change' | 'payment_method_change' | 'bank_added' | 'bank_change' | 'no_change';
}

interface EditSummary {
  totalEdits: number;
  totalCashChanges: number;
  totalTransferChanges: number;
  totalBankChanges: number;
  totalAmountChanges: number;
  totalBankOnlyChanges: number;
  totalAmountDifference: number;
  totalPaymentMethodChanges: number;
  totalBankAdded: number;
  totalNoChanges: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const search = searchParams.get("search") || "";
    const filterType = searchParams.get("filterType") || "all"; // all, amountChanges, bankOnly

    // Build query
    let query = `
      SELECT 
        NumberPrint as numberPrint,
        DateEditPrint as editDate,
        ISNULL(Times, '') as editTime,
        ISNULL(PayCashOld, 0) as payCashOld,
        ISNULL(PayCashNew, 0) as payCashNew,
        ISNULL(PayTransferOld, 0) as payTransferOld,
        ISNULL(PayTransferNew, 0) as payTransferNew,
        ISNULL(NameBankOld, '') as nameBankOld,
        ISNULL(NameBankNew, '') as nameBankNew,
        ISNULL(NameUser, '') as nameUser
      FROM dbo.ChangeEditPrint
    `;

    // Build WHERE clause
    const conditions: string[] = [];
    
    if (search) {
      conditions.push(`NumberPrint LIKE @search`);
    }
    
    if (startDate) {
      conditions.push(`CONVERT(date, DateEditPrint) >= @startDate`);
    }
    
    if (endDate) {
      conditions.push(`CONVERT(date, DateEditPrint) <= @endDate`);
    }
    
    // Add filterType conditions
    if (filterType === "amountChanges") {
      conditions.push(`((PayCashOld <> PayCashNew) OR (PayTransferOld <> PayTransferNew))`);
    } else if (filterType === "bankOnly") {
      conditions.push(`((PayCashOld = PayCashNew) AND (PayTransferOld = PayTransferNew) AND (NameBankOld <> NameBankNew))`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      ORDER BY DateEditPrint DESC, Times DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const results = await executeQuery<{
      numberPrint: string;
      editDate: Date;
      editTime: string;
      payCashOld: number;
      payCashNew: number;
      payTransferOld: number;
      payTransferNew: number;
      nameBankOld: string;
      nameBankNew: string;
      nameUser: string;
    }>(query, {
      limit,
      offset,
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    const editHistory: BillEditHistory[] = results.map((row) => {
      const cashChange = row.payCashNew - row.payCashOld;
      const transferChange = row.payTransferNew - row.payTransferOld;
      const totalChange = cashChange + transferChange;
      
      // ตรวจสอบประเภทการเปลี่ยนแปลง
      let changeType: 'amount_change' | 'payment_method_change' | 'bank_added' | 'bank_change' | 'no_change' = 'no_change';
      const hasCashChange = row.payCashOld !== row.payCashNew;
      const hasTransferChange = row.payTransferOld !== row.payTransferNew;
      const hasBankChange = row.nameBankOld !== row.nameBankNew;
      const oldBankEmpty = !row.nameBankOld || row.nameBankOld.trim() === '';
      const newBankNotEmpty = row.nameBankNew && row.nameBankNew.trim() !== '';
      
      if (hasCashChange || hasTransferChange) {
        // มีการเปลี่ยนแปลงยอดเงิน
        const cashWasZeroNowNot = row.payCashOld === 0 && row.payCashNew > 0;
        const transferWasZeroNowNot = row.payTransferOld === 0 && row.payTransferNew > 0;
        const cashWasNotNowZero = row.payCashOld > 0 && row.payCashNew === 0;
        const transferWasNotNowZero = row.payTransferOld > 0 && row.payTransferNew === 0;
        
        // เช็คว่าเป็นการเปลี่ยนวิธีการชำระเงินหรือไม่
        if ((cashWasZeroNowNot && transferWasNotNowZero) || 
            (transferWasZeroNowNot && cashWasNotNowZero)) {
          changeType = 'payment_method_change';
        } else {
          changeType = 'amount_change';
        }
      } else if (hasBankChange) {
        // ไม่มีการเปลี่ยนยอดเงิน แต่มีการเปลี่ยนธนาคาร
        if (oldBankEmpty && newBankNotEmpty) {
          changeType = 'bank_added';
        } else {
          changeType = 'bank_change';
        }
      } else {
        // ไม่มีการเปลี่ยนแปลงเลย
        changeType = 'no_change';
      }

      return {
        numberPrint: row.numberPrint,
        editDate: new Date(row.editDate).toISOString(),
        editTime: row.editTime,
        changes: {
          cash: { old: row.payCashOld, new: row.payCashNew },
          transfer: { old: row.payTransferOld, new: row.payTransferNew },
          bank: { old: row.nameBankOld, new: row.nameBankNew },
        },
        editedBy: row.nameUser,
        totalChange,
        changeType,
      };
    });

    // Get summary with more details
    let summaryQuery = `
      SELECT 
        COUNT(*) as totalEdits,
        SUM(CASE WHEN PayCashOld <> PayCashNew THEN 1 ELSE 0 END) as totalCashChanges,
        SUM(CASE WHEN PayTransferOld <> PayTransferNew THEN 1 ELSE 0 END) as totalTransferChanges,
        SUM(CASE WHEN NameBankOld <> NameBankNew THEN 1 ELSE 0 END) as totalBankChanges,
        SUM(CASE WHEN (PayCashOld <> PayCashNew) OR (PayTransferOld <> PayTransferNew) THEN 1 ELSE 0 END) as totalAmountChanges,
        SUM(CASE WHEN (PayCashOld = PayCashNew) AND (PayTransferOld = PayTransferNew) AND (NameBankOld <> NameBankNew) THEN 1 ELSE 0 END) as totalBankOnlyChanges,
        ISNULL(SUM(ABS((PayCashNew + PayTransferNew) - (PayCashOld + PayTransferOld))), 0) as totalAmountDifference,
        -- เปลี่ยนวิธีการชำระเงิน (จากสด↔โอน)
        SUM(CASE 
          WHEN ((PayCashOld = 0 AND PayCashNew > 0 AND PayTransferOld > 0 AND PayTransferNew = 0) OR
                (PayTransferOld = 0 AND PayTransferNew > 0 AND PayCashOld > 0 AND PayCashNew = 0))
          THEN 1 ELSE 0 
        END) as totalPaymentMethodChanges,
        -- เพิ่มบัญชีธนาคาร (จากว่าง → มีค่า)
        SUM(CASE 
          WHEN (ISNULL(LTRIM(RTRIM(NameBankOld)), '') = '' AND ISNULL(LTRIM(RTRIM(NameBankNew)), '') <> '')
            AND (PayCashOld = PayCashNew) AND (PayTransferOld = PayTransferNew)
          THEN 1 ELSE 0 
        END) as totalBankAdded,
        -- ไม่มีการเปลี่ยนแปลงเลย
        SUM(CASE 
          WHEN (PayCashOld = PayCashNew) 
            AND (PayTransferOld = PayTransferNew) 
            AND (ISNULL(NameBankOld, '') = ISNULL(NameBankNew, ''))
          THEN 1 ELSE 0 
        END) as totalNoChanges
      FROM dbo.ChangeEditPrint
    `;

    const summaryConditions: string[] = [];
    
    if (search) {
      summaryConditions.push(`NumberPrint LIKE @search`);
    }
    
    if (startDate) {
      summaryConditions.push(`CONVERT(date, DateEditPrint) >= @startDate`);
    }
    
    if (endDate) {
      summaryConditions.push(`CONVERT(date, DateEditPrint) <= @endDate`);
    }
    
    // Add filterType conditions to summary as well
    if (filterType === "amountChanges") {
      summaryConditions.push(`((PayCashOld <> PayCashNew) OR (PayTransferOld <> PayTransferNew))`);
    } else if (filterType === "bankOnly") {
      summaryConditions.push(`((PayCashOld = PayCashNew) AND (PayTransferOld = PayTransferNew) AND (NameBankOld <> NameBankNew))`);
    }
    
    if (summaryConditions.length > 0) {
      summaryQuery += ` WHERE ${summaryConditions.join(' AND ')}`;
    }

    const [summaryResult] = await executeQuery<{
      totalEdits: number;
      totalCashChanges: number;
      totalTransferChanges: number;
      totalBankChanges: number;
      totalAmountChanges: number;
      totalBankOnlyChanges: number;
      totalAmountDifference: number;
      totalPaymentMethodChanges: number;
      totalBankAdded: number;
      totalNoChanges: number;
    }>(summaryQuery, {
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    const summary: EditSummary = {
      totalEdits: summaryResult.totalEdits,
      totalCashChanges: summaryResult.totalCashChanges,
      totalTransferChanges: summaryResult.totalTransferChanges,
      totalBankChanges: summaryResult.totalBankChanges,
      totalAmountChanges: summaryResult.totalAmountChanges,
      totalBankOnlyChanges: summaryResult.totalBankOnlyChanges,
      totalAmountDifference: summaryResult.totalAmountDifference,
      totalPaymentMethodChanges: summaryResult.totalPaymentMethodChanges,
      totalBankAdded: summaryResult.totalBankAdded,
      totalNoChanges: summaryResult.totalNoChanges,
    };

    const response: ApiResponse<{
      data: BillEditHistory[];
      summary: EditSummary;
      limit: number;
      offset: number;
    }> = {
      success: true,
      data: {
        data: editHistory,
        summary,
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Bill Edit History API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch bill edit history",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
