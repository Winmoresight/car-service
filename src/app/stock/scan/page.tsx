"use client";

import {
  Camera,
  ImageUp,
  Loader2,
  RefreshCw,
  ScanBarcode,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ApiResponse, BarcodeScanResult } from "@/types/api";

type LookupState = "idle" | "loading" | "found" | "missing" | "error";
type ScanOrigin = "manual" | "camera" | "image";

type BarcodeDetection = {
  rawValue: string;
};

type BarcodeDetectorInstance = {
  detect(
    source: HTMLVideoElement | HTMLCanvasElement,
  ): Promise<BarcodeDetection[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorInstance;

type ScanHistoryItem = {
  barcode: string;
  name: string;
  origin: ScanOrigin;
  status: Exclude<LookupState, "idle" | "loading">;
  timestamp: string;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

const fetcher = async (url: string, signal?: AbortSignal) => {
  const response = await fetch(url, { signal });
  const payload = (await response.json()) as ApiResponse<BarcodeScanResult>;

  if (!payload.success) {
    throw Object.assign(new Error(payload.error), {
      details: payload.details,
      status: response.status,
    });
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return payload.data;
};

type LookupErrorDetails = {
  stage?: string;
  message?: string;
  cause?: string;
  barcode?: string;
};

function normalizeBarcode(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
  }).format(value || 0)}%`;
}

function formatLookupErrorMessage(error: unknown) {
  const details = error as Error & { details?: unknown };

  if (details?.details && typeof details.details === "object") {
    const lookupDetails = details.details as LookupErrorDetails;
    const parts = [
      lookupDetails.stage,
      lookupDetails.message,
      lookupDetails.cause,
    ]
      .filter((part): part is string => Boolean(part))
      .map((part) => part.trim());

    if (parts.length > 0) {
      return parts.join(" · ");
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "ค้นหาไม่สำเร็จ";
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getMovementLabel(type: "in" | "out") {
  return type === "in" ? "รับเข้า" : "จ่ายออก";
}

function getMovementStyle(type: "in" | "out") {
  return type === "in"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";
}

function getStatusMeta(status: LookupState) {
  if (status === "found") {
    return {
      label: "พบสินค้า",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    };
  }

  if (status === "missing") {
    return {
      label: "ไม่พบข้อมูล",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
    };
  }

  if (status === "error") {
    return {
      label: "ผิดพลาด",
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300",
    };
  }

  return {
    label: "พร้อมใช้งาน",
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300",
  };
}

const resultSkeletonCards = [
  { id: "stock", title: "สต็อก" },
  { id: "price", title: "ราคาขาย" },
  { id: "cost", title: "ต้นทุน" },
  { id: "sales", title: "ยอดขาย" },
] as const;

export default function StockScanPage() {
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState<BarcodeScanResult | null>(null);
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [feedback, setFeedback] = useState(
    "พร้อมรับบาร์โค้ดจากการพิมพ์ กล้อง หรือภาพถ่าย",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const [isCameraSupported, setIsCameraSupported] = useState(false);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [lastDetectedBarcode, setLastDetectedBarcode] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const lookupAbortRef = useRef<AbortController | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const lastAutoLookupRef = useRef("");

  useEffect(() => {
    setIsCameraSupported(
      typeof window !== "undefined" &&
        "mediaDevices" in navigator &&
        typeof window.BarcodeDetector === "function",
    );
  }, []);

  useEffect(() => {
    return () => {
      lookupAbortRef.current?.abort();

      if (scanTimerRef.current) {
        window.clearTimeout(scanTimerRef.current);
      }

      for (const track of streamRef.current?.getTracks() || []) {
        track.stop();
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const statusMeta = getStatusMeta(lookupState);
  const movementRows = result?.recentMovements || [];
  const currentProfitPerUnit = useMemo(
    () => result?.profitPerUnit ?? 0,
    [result],
  );
  const currentMargin = useMemo(() => result?.profitMargin ?? 0, [result]);

  const pushHistory = (
    item: Omit<ScanHistoryItem, "timestamp"> & { timestamp?: string },
  ) => {
    setScanHistory((current) =>
      [
        {
          ...item,
          timestamp: item.timestamp || new Date().toISOString(),
        },
        ...current,
      ].slice(0, 10),
    );
  };

  const stopCameraScan = () => {
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    for (const track of streamRef.current?.getTracks() || []) {
      track.stop();
    }

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsCameraScanning(false);
  };

  const ensureBarcodeDetector = () => {
    if (barcodeDetectorRef.current) {
      return barcodeDetectorRef.current;
    }

    const Detector = window.BarcodeDetector;

    if (!Detector) {
      return null;
    }

    barcodeDetectorRef.current = new Detector({
      formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code"],
    });

    return barcodeDetectorRef.current;
  };

  const runLookup = async (rawBarcode: string, origin: ScanOrigin) => {
    const normalizedBarcode = normalizeBarcode(rawBarcode);

    if (!normalizedBarcode) {
      setLookupState("error");
      setErrorMessage("กรุณาระบุบาร์โค้ดให้ถูกต้อง");
      setFeedback("ยังไม่พบหมายเลขบาร์โค้ด");
      return;
    }

    setBarcode(normalizedBarcode);
    setLookupState("loading");
    setErrorMessage(null);
    setFeedback(`กำลังค้นหาข้อมูลสำหรับ ${normalizedBarcode}`);

    lookupAbortRef.current?.abort();
    const controller = new AbortController();
    lookupAbortRef.current = controller;

    try {
      const demoQuery = isDemoMode ? "&demo=1" : "";
      const data = await fetcher(
        `/api/products/lookup?barcode=${encodeURIComponent(normalizedBarcode)}${demoQuery}`,
        controller.signal,
      );

      setResult(data);
      setLookupState("found");
      setFeedback(`พบสินค้า "${data.name}" จากบาร์โค้ด ${normalizedBarcode}`);
      setLastDetectedBarcode(normalizedBarcode);
      pushHistory({
        barcode: normalizedBarcode,
        name: data.name,
        origin,
        status: "found",
      });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      const message = formatLookupErrorMessage(error);
      const missing = message.includes("ไม่พบสินค้า");

      setResult(null);
      setLookupState(missing ? "missing" : "error");
      setErrorMessage(message);
      setFeedback(
        missing
          ? `ไม่พบบาร์โค้ด ${normalizedBarcode} ในฐานข้อมูล`
          : "เกิดข้อผิดพลาดระหว่างค้นหาข้อมูล",
      );
      pushHistory({
        barcode: normalizedBarcode,
        name: missing ? "ไม่พบข้อมูล" : "ค้นหาไม่สำเร็จ",
        origin,
        status: missing ? "missing" : "error",
      });
    }
  };

  const scanImageFile = async (file: File) => {
    const detector = ensureBarcodeDetector();

    if (!detector) {
      setLookupState("error");
      setErrorMessage("บราวเซอร์นี้ยังไม่รองรับการอ่านบาร์โค้ดจากภาพ");
      setFeedback("โปรดพิมพ์บาร์โค้ดเองแทน");
      return;
    }

    setIsScanningImage(true);
    setErrorMessage(null);
    setFeedback("กำลังอ่านบาร์โค้ดจากภาพ...");

    let imageUrl = "";

    try {
      imageUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = imageUrl;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("ไม่สามารถสร้างพื้นที่ประมวลผลภาพได้");
      }

      context.drawImage(image, 0, 0);
      const detections = await detector.detect(canvas);
      const barcodeValue = detections[0]?.rawValue || "";

      if (!barcodeValue) {
        throw new Error("ไม่พบบาร์โค้ดในภาพที่เลือก");
      }

      await runLookup(barcodeValue, "image");
    } catch (error) {
      const message = error instanceof Error ? error.message : "อ่านภาพไม่สำเร็จ";
      setLookupState("error");
      setErrorMessage(message);
      setFeedback("อ่านข้อมูลจากภาพไม่สำเร็จ");
    } finally {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }

      setIsScanningImage(false);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await scanImageFile(file);
    event.target.value = "";
  };

  const startCameraScan = async () => {
    if (!isCameraSupported) {
      setLookupState("error");
      setErrorMessage("บราวเซอร์นี้ยังไม่รองรับกล้องหรือ BarcodeDetector");
      setFeedback("ใช้ช่องกรอกบาร์โค้ดแทนได้");
      return;
    }

    stopCameraScan();
    setErrorMessage(null);
    setFeedback("กำลังเปิดกล้องหลัง...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        throw new Error("ไม่พบพื้นที่แสดงกล้อง");
      }

      video.srcObject = stream;
      await video.play();

      setIsCameraScanning(true);
      setLookupState("idle");
      setFeedback("กำลังสแกนบาร์โค้ดจากกล้อง...");

      const detector = ensureBarcodeDetector();

      if (!detector) {
        throw new Error("ไม่สามารถสร้างตัวอ่านบาร์โค้ดได้");
      }

      const scanFrame = async () => {
        if (!streamRef.current || lookupState === "loading") {
          scanTimerRef.current = window.setTimeout(scanFrame, 250);
          return;
        }

        try {
          const detections = await detector.detect(video);
          const barcodeValue = detections[0]?.rawValue
            ? normalizeBarcode(detections[0].rawValue)
            : "";

          if (barcodeValue && barcodeValue !== lastAutoLookupRef.current) {
            lastAutoLookupRef.current = barcodeValue;
            await runLookup(barcodeValue, "camera");
          }
        } catch {
          // ลองรอบถัดไป
        } finally {
          if (streamRef.current) {
            scanTimerRef.current = window.setTimeout(scanFrame, 350);
          }
        }
      };

      scanFrame();
    } catch (error) {
      stopCameraScan();
      const message = error instanceof Error ? error.message : "เปิดกล้องไม่สำเร็จ";
      setLookupState("error");
      setErrorMessage(message);
      setFeedback("เปิดกล้องไม่สำเร็จ");
    }
  };

  const submitBarcode = async () => {
    await runLookup(barcode, "manual");
  };

  const hasResult = lookupState === "found" && result;

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb href="/stock/scan" label="สแกนสินค้า" />
      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-start min-[900px]:justify-between">
              <div className="max-w-3xl space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5" />
                  Barcode lookup
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  สแกนบาร์โค้ดสินค้า
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  หน้านี้ใช้สำหรับทดสอบการสแกนจากกล้อง รูปภาพ หรือการกรอกบาร์โค้ด
                  แล้วดึงข้อมูลต้นทุน ราคา และสต็อกมาแสดงแบบตรงไปตรงมา
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full px-3 py-1.5">
                  {isDemoMode ? "โหมดเดโม" : "เชื่อม DB จริง"}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1.5">
                  {isCameraSupported ? "รองรับกล้อง" : "ไม่รองรับกล้อง"}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1.5">
                  {isCameraScanning ? "กำลังสแกน" : "พร้อมใช้งาน"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_380px]">
          <div className="space-y-6">
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="space-y-4 pt-6">
                <div className="flex flex-col gap-3 min-[760px]:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={barcode}
                      onChange={(event) => setBarcode(event.target.value)}
                      placeholder="พิมพ์หรือสแกนบาร์โค้ด"
                      className="h-11 rounded-2xl pl-10"
                    />
                  </div>
                  <Button
                    type="button"
                    className="h-11 rounded-2xl px-5 font-semibold"
                    onClick={submitBarcode}
                    disabled={lookupState === "loading"}
                  >
                    {lookupState === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ScanBarcode className="h-4 w-4" />
                    )}
                    ค้นหา
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={isDemoMode ? "default" : "outline"}
                    className="h-10 rounded-2xl px-4 font-semibold"
                    onClick={() => setIsDemoMode((current) => !current)}
                  >
                    <Sparkles className="h-4 w-4" />
                    {isDemoMode ? "ปิดเดโม" : "เปิดเดโม"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-2xl px-4 font-semibold"
                    onClick={startCameraScan}
                    disabled={isCameraScanning || lookupState === "loading"}
                  >
                    <Camera className="h-4 w-4" />
                    {isCameraScanning ? "เปิดกล้องอยู่" : "เริ่มสแกนจากกล้อง"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-2xl px-4 font-semibold"
                    onClick={stopCameraScan}
                    disabled={!isCameraScanning}
                  >
                    <RefreshCw className="h-4 w-4" />
                    หยุดกล้อง
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-10 rounded-2xl px-4 font-semibold"
                    onClick={openFilePicker}
                    disabled={isScanningImage}
                  >
                    {isScanningImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImageUp className="h-4 w-4" />
                    )}
                    อัปโหลดรูป
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      สถานะ
                    </p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {statusMeta.label}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      ที่มา
                    </p>
                    <p className="mt-2 text-base font-semibold text-foreground">
                      {result?.source === "master"
                        ? "MasterProductDetail"
                        : result?.source === "sales-history"
                          ? "ประวัติการขาย"
                          : result
                            ? "ข้อมูลจำลอง"
                            : "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      บาร์โค้ดล่าสุด
                    </p>
                    <p className="mt-2 break-all text-base font-semibold text-foreground">
                      {lastDetectedBarcode || "-"}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">
                        ข้อความสถานะ
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {feedback}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="rounded-full px-3 py-1.5"
                    >
                      {statusMeta.label}
                    </Badge>
                  </div>

                  {errorMessage ? (
                    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-destructive">
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <p className="text-sm font-medium">{errorMessage}</p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      ผลการค้นหา
                    </p>
                    <h2 className="text-xl font-bold text-foreground">
                      {hasResult ? result.name : "ยังไม่มีข้อมูลสินค้า"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {hasResult
                        ? `Barcode: ${result.barcode}`
                        : "สแกนหรือกรอกบาร์โค้ดเพื่อแสดงข้อมูลสินค้า"}
                    </p>
                  </div>
                  {hasResult ? (
                    <Badge
                      variant="outline"
                      className="rounded-full px-3 py-1.5"
                    >
                      {result.source === "master"
                        ? "ข้อมูลหลัก"
                        : result.source === "sales-history"
                          ? "ข้อมูลจากการขาย"
                          : "ข้อมูลจำลอง"}
                    </Badge>
                  ) : null}
                </div>

                {lookupState === "loading" ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {resultSkeletonCards.map((card) => (
                      <div key={card.id} className="rounded-2xl border p-4">
                        <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
                        <div className="mt-4 h-7 w-28 animate-pulse rounded-xl bg-muted" />
                        <div className="mt-2 h-3 w-16 animate-pulse rounded-full bg-muted" />
                      </div>
                    ))}
                  </div>
                ) : null}

                {hasResult ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        สต็อก
                      </p>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {formatNumber(result.stock)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        มูลค่าทุน {formatCurrency(result.stockValue)}
                      </p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        ราคาขาย
                      </p>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {formatCurrency(result.retailPrice)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        กำไร/ชิ้น {formatCurrency(currentProfitPerUnit)}
                      </p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        ต้นทุน
                      </p>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {formatCurrency(result.costPrice)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Margin {formatPercent(currentMargin)}
                      </p>
                    </div>
                    <div className="rounded-2xl border p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        ยอดขาย
                      </p>
                      <p className="mt-2 text-2xl font-bold text-foreground">
                        {formatCurrency(result.totalSales)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        ขายแล้ว {formatNumber(result.totalSoldQuantity)} ชิ้น
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    ยังไม่มีผลการค้นหา
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      เคลื่อนไหวล่าสุด
                    </p>
                    <h2 className="text-xl font-bold text-foreground">
                      สรุปจาก INOUTStockProduct
                    </h2>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1.5">
                    {formatNumber(movementRows.length)} รายการ
                  </Badge>
                </div>

                {movementRows.length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border">
                    <div className="grid grid-cols-[120px_1fr_120px] border-b bg-muted/30 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <div>ประเภท</div>
                      <div>รายละเอียด</div>
                      <div className="text-right">คงเหลือ</div>
                    </div>
                    <div className="divide-y">
                      {movementRows.map((movement) => (
                        <div
                          key={`${movement.date}-${movement.stock}-${movement.quantity}`}
                          className="grid grid-cols-[120px_1fr_120px] items-center px-4 py-3 text-sm"
                        >
                          <Badge
                            variant="outline"
                            className={cn(
                              "w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              getMovementStyle(movement.type),
                            )}
                          >
                            {getMovementLabel(movement.type)}
                          </Badge>
                          <div>
                            <p className="font-medium text-foreground">
                              {formatDateTime(movement.date)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {movement.company || "ไม่มีชื่อบริษัท"} ·{" "}
                              {formatNumber(movement.quantity)} ชิ้น
                            </p>
                          </div>
                          <div className="text-right font-semibold text-foreground">
                            {formatNumber(movement.stock)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                    ยังไม่มีประวัติการเคลื่อนไหวของบาร์โค้ดนี้
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Live scanner
                    </p>
                    <h2 className="text-xl font-bold text-foreground">
                      กล้องสแกนบาร์โค้ด
                    </h2>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1.5">
                    {isCameraScanning ? "กำลังทำงาน" : "พร้อมใช้งาน"}
                  </Badge>
                </div>

                <div className="mt-4 rounded-2xl border bg-muted/20 p-3">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border bg-background">
                    <video
                      ref={videoRef}
                      className={cn(
                        "h-full w-full object-cover",
                        isCameraScanning ? "opacity-100" : "opacity-30",
                      )}
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-2xl border border-dashed border-primary/40 bg-background/80 px-4 py-3 text-center shadow-sm backdrop-blur">
                        <p className="text-sm font-semibold text-foreground">
                          วางบาร์โค้ดไว้ในกรอบ
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          ใช้กล้องหลังหรืออัปโหลดภาพแทนได้
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      รองรับกล้อง
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {isCameraSupported ? "ใช่" : "ไม่ใช่"}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      ตรวจครั้งล่าสุด
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {scanHistory[0]?.timestamp
                        ? formatDateTime(scanHistory[0].timestamp)
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      จำนวนบันทึก
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {formatNumber(scanHistory.length)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      ประวัติการสแกน
                    </p>
                    <h2 className="text-xl font-bold text-foreground">
                      รอบล่าสุด
                    </h2>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1.5">
                    {formatNumber(scanHistory.length)} รายการ
                  </Badge>
                </div>

                {scanHistory.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {scanHistory.map((item) => (
                      <div
                        key={`${item.barcode}-${item.timestamp}`}
                        className="rounded-2xl border p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {item.name}
                            </p>
                            <p className="mt-1 break-all text-xs text-muted-foreground">
                              {item.barcode}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              item.status === "found"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : item.status === "missing"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-destructive/20 bg-destructive/5 text-destructive",
                            )}
                          >
                            {item.status === "found"
                              ? "พบ"
                              : item.status === "missing"
                                ? "ไม่พบ"
                                : "error"}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full border bg-muted/20 px-2.5 py-1">
                            {formatDateTime(item.timestamp)}
                          </span>
                          <span className="rounded-full border bg-muted/20 px-2.5 py-1">
                            {item.origin === "camera"
                              ? "กล้อง"
                              : item.origin === "image"
                                ? "ภาพถ่าย"
                                : "กรอกเอง"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    ยังไม่มีประวัติการสแกน
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border bg-card shadow-sm">
              <CardContent className="pt-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  หมายเหตุสำหรับ phase 2
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {isDemoMode
                    ? "ตอนนี้อยู่ในโหมดเดโมเพื่อให้ทดสอบหน้าได้โดยไม่ต้องเชื่อมฐานข้อมูลจริง"
                    : "ถ้าต้องการต่อ workflow เพิ่ม เราค่อยเชื่อมข้อมูลสแกนเข้ากระบวนการตรวจสต็อกหรือรายงานในรอบถัดไป"}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
