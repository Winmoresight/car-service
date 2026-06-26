"use client";

import {
  Barcode,
  Camera,
  ClipboardList,
  Minus,
  Plus,
  RotateCcw,
  Settings,
  ShieldAlert,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { type TouchEvent, useEffect, useRef, useState } from "react";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ApiResponse, BarcodeScanResult } from "@/types/api";

type LookupState = "idle" | "loading" | "found" | "missing" | "error";

type BarcodeDetection = {
  rawValue: string;
};

type BarcodeDetectorInstance = {
  detect(
    source: HTMLVideoElement | HTMLCanvasElement,
  ): Promise<BarcodeDetection[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
};

type LookupErrorDetails = {
  stage?: string;
  message?: string;
  cause?: string;
  barcode?: string;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

interface ScannedItem {
  barcode: string;
  name: string;
  retailPrice: number;
  quantity: number;
  unit: string;
}

const preferredBarcodeFormats = [
  "ean_13",
  "ean_8",
  "code_128",
  "code_39",
  "qr_code",
  "upc_a",
  "upc_e",
  "itf",
  "code_93",
  "codabar",
] as const;

const fallbackBarcodeFormats = [
  "ean_13",
  "ean_8",
  "code_128",
  "code_39",
  "qr_code",
] as const;

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

function normalizeBarcode(value: string) {
  return value.trim().replace(/\s+/g, "");
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

export default function StockScanPage() {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isCameraScanning, setIsCameraScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [beepEnabled, setBeepEnabled] = useState(true);
  const [manualBarcode, setManualBarcode] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isScannerDrawerExpanded, setIsScannerDrawerExpanded] = useState(true);

  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [feedback, setFeedback] = useState("");
  const [_errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const lookupAbortRef = useRef<AbortController | null>(null);
  const barcodeDetectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const lookupInFlightRef = useRef(false);
  const scanCooldownsRef = useRef<{ [barcode: string]: number }>({});
  const drawerTouchStartYRef = useRef<number | null>(null);
  const lastDrawerSwipeAtRef = useRef(0);

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

  const playBeep = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (
          window as Window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(900, audioCtx.currentTime); // 900Hz beep
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.12,
      );

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.12);
    } catch (error) {
      console.warn("Failed to play beep sound", error);
    }
  };

  const releaseCameraResources = () => {
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
  };

  const stopCameraScan = () => {
    releaseCameraResources();

    lookupAbortRef.current?.abort();
    lookupAbortRef.current = null;
    lookupInFlightRef.current = false;
    setIsCameraScanning(false);
    setCameraError(null);
    setLookupState("idle");
    setFeedback("");
    setErrorMessage(null);
  };

  const ensureBarcodeDetector = async () => {
    if (barcodeDetectorRef.current) {
      return barcodeDetectorRef.current;
    }

    const Detector = window.BarcodeDetector;

    if (!Detector) {
      return null;
    }

    let formats: string[] = [...fallbackBarcodeFormats];

    if (Detector.getSupportedFormats) {
      const supportedFormats = await Detector.getSupportedFormats();
      formats = preferredBarcodeFormats.filter((format) =>
        supportedFormats.includes(format),
      );
    }

    try {
      barcodeDetectorRef.current =
        formats.length > 0 ? new Detector({ formats }) : new Detector();
    } catch {
      barcodeDetectorRef.current = new Detector();
    }

    return barcodeDetectorRef.current;
  };

  const handleBarcodeScanned = async (rawBarcode: string) => {
    const normalizedBarcode = normalizeBarcode(rawBarcode);

    if (!normalizedBarcode || lookupInFlightRef.current) {
      return;
    }

    const now = Date.now();
    const lastScanTime = scanCooldownsRef.current[normalizedBarcode] || 0;
    if (now - lastScanTime < 2500) {
      return;
    }

    scanCooldownsRef.current[normalizedBarcode] = now;

    if (beepEnabled) {
      playBeep();
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(80);
    }

    lookupInFlightRef.current = true;
    setLookupState("loading");
    setErrorMessage(null);
    setFeedback(`กำลังค้นหาข้อมูลสำหรับ ${normalizedBarcode}`);

    lookupAbortRef.current?.abort();
    const controller = new AbortController();
    lookupAbortRef.current = controller;

    try {
      const data = await fetcher(
        `/api/products/lookup?barcode=${encodeURIComponent(normalizedBarcode)}`,
        controller.signal,
      );

      setLookupState("found");
      setFeedback(`พบสินค้า "${data.name}"`);

      setScannedItems((prevItems) => {
        const existingIndex = prevItems.findIndex(
          (item) => item.barcode === data.barcode,
        );
        if (existingIndex > -1) {
          const updated = [...prevItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + 1,
          };
          return updated;
        } else {
          return [
            ...prevItems,
            {
              barcode: data.barcode,
              name: data.name,
              retailPrice: data.retailPrice,
              quantity: 1,
              unit: data.unit || "ชิ้น",
            },
          ];
        }
      });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      const message = formatLookupErrorMessage(error);
      const missing = message.includes("ไม่พบสินค้า");

      setLookupState(missing ? "missing" : "error");
      setErrorMessage(message);
      setFeedback(
        missing
          ? `ไม่พบบาร์โค้ด ${normalizedBarcode} ในฐานข้อมูล`
          : "เกิดข้อผิดพลาดระหว่างค้นหาข้อมูล",
      );
    } finally {
      lookupInFlightRef.current = false;
    }
  };

  const startCameraScan = async () => {
    stopCameraScan();
    setErrorMessage(null);
    setIsCameraScanning(true);
    setCameraError(null);
    setFeedback("กำลังเปิดกล้องหลัง...");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง");
      }

      const detector = await ensureBarcodeDetector();

      if (!detector) {
        throw new Error("เบราว์เซอร์นี้ไม่รองรับการอ่านบาร์โค้ดจากกล้อง");
      }

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

      setLookupState("idle");
      setFeedback("กำลังสแกนบาร์โค้ดจากกล้อง...");

      const scanFrame = async () => {
        if (!streamRef.current) {
          return;
        }

        try {
          if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            return;
          }

          const detections = await detector.detect(video);
          const barcodeValue = detections[0]?.rawValue
            ? normalizeBarcode(detections[0].rawValue)
            : "";

          if (barcodeValue) {
            await handleBarcodeScanned(barcodeValue);
          }
        } catch {
          // ignore
        } finally {
          if (streamRef.current) {
            scanTimerRef.current = window.setTimeout(scanFrame, 350);
          }
        }
      };

      scanFrame();
    } catch (error) {
      const message = error instanceof Error ? error.message : "เปิดกล้องไม่สำเร็จ";
      releaseCameraResources();
      setLookupState("error");
      setErrorMessage(message);
      setCameraError(message);
      setFeedback(message);
    }
  };

  const handleManualBarcodeSubmit = () => {
    if (!manualBarcode.trim()) return;
    handleBarcodeScanned(manualBarcode);
    setManualBarcode("");
  };

  const incrementQty = (barcode: string) => {
    setScannedItems((prev) =>
      prev.map((item) =>
        item.barcode === barcode
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      ),
    );
  };

  const decrementQty = (barcode: string) => {
    setScannedItems((prev) =>
      prev
        .map((item) =>
          item.barcode === barcode
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeScannedItem = (barcode: string) => {
    setScannedItems((prev) => prev.filter((item) => item.barcode !== barcode));
  };

  const handleReviewOrder = () => {
    stopCameraScan();
  };

  const handleDrawerTouchStart = (event: TouchEvent<HTMLElement>) => {
    drawerTouchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handleDrawerTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const startY = drawerTouchStartYRef.current;
    drawerTouchStartYRef.current = null;

    if (startY === null) {
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? startY;
    const deltaY = endY - startY;

    if (deltaY > 45) {
      lastDrawerSwipeAtRef.current = Date.now();
      setIsScannerDrawerExpanded(false);
    }

    if (deltaY < -45) {
      lastDrawerSwipeAtRef.current = Date.now();
      setIsScannerDrawerExpanded(true);
    }
  };

  const toggleScannerDrawer = () => {
    if (Date.now() - lastDrawerSwipeAtRef.current < 500) {
      return;
    }

    setIsScannerDrawerExpanded((current) => !current);
  };

  const handleClearAll = () => {
    setScannedItems([]);
  };

  const totalItemsCount = scannedItems.reduce(
    (acc, item) => acc + item.quantity,
    0,
  );
  const totalPrice = scannedItems.reduce(
    (acc, item) => acc + item.retailPrice * item.quantity,
    0,
  );

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb href="/stock/scan" label="สแกนสินค้า" />
      <hr className="my-4 hidden w-full min-[1025px]:block" />

      {/* Main Single-Button Screen */}
      {!isCameraScanning && (
        <div className="space-y-6">
          {scannedItems.length === 0 ? (
            <Card className="max-w-xl mx-auto mt-6 rounded-[24px] border bg-card shadow-sm py-12 px-6 text-center">
              <CardContent className="flex flex-col items-center justify-center space-y-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  <Barcode className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    สแกนบาร์โค้ดสินค้า
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    กดปุ่มเปิดกล้องเพื่อเริ่มสแกนบาร์โค้ดของสินค้าเพื่อบันทึกและจัดการสต็อก
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={startCameraScan}
                  className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground transition-all active:scale-[0.98]"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  เปิดกล้องสแกนสินค้า
                </Button>
              </CardContent>
            </Card>
          ) : (
            // Summary Screen after closing scanner
            <Card className="max-w-2xl mx-auto mt-6 overflow-hidden rounded-[24px] border bg-card shadow-sm">
              <div className="flex flex-col items-start justify-between gap-4 border-b bg-muted/15 p-5 sm:flex-row sm:items-center sm:p-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-primary">
                    สรุปรายการสแกนสินค้า
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    มีสินค้าทั้งหมด {scannedItems.length} รายการ ({totalItemsCount}{" "}
                    ชิ้น)
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-extrabold tracking-wide text-muted-foreground uppercase">
                    ราคารวมสุทธิ
                  </p>
                  <p className="mt-1 text-3xl font-extrabold text-primary">
                    ฿
                    {totalPrice.toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                  {scannedItems.map((item) => (
                    <div
                      key={item.barcode}
                      className="flex items-center justify-between gap-4 rounded-[14px] border bg-muted/15 p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold text-card-foreground">
                          {item.name}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                          <span>บาร์โค้ด: {item.barcode}</span>
                          <span>•</span>
                          <span>
                            ราคาต่อหน่วย: ฿{item.retailPrice.toFixed(2)}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex h-9 items-center overflow-hidden rounded-lg border bg-background">
                          <button
                            type="button"
                            onClick={() => decrementQty(item.barcode)}
                            className="px-2.5 h-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-muted-foreground font-bold"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-9 px-3 text-center text-sm font-bold text-foreground">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => incrementQty(item.barcode)}
                            className="px-2.5 h-full hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-muted-foreground font-bold"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeScannedItem(item.barcode)}
                          className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t pt-4">
                  <Button
                    type="button"
                    onClick={startCameraScan}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
                  >
                    <Camera className="h-4 w-4" />
                    สแกนเพิ่ม
                  </Button>
                  <Button
                    type="button"
                    onClick={handleClearAll}
                    variant="ghost"
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-muted-foreground transition-all hover:bg-destructive/5 hover:text-destructive"
                  >
                    <RotateCcw className="h-4 w-4" />
                    ล้างรายการทั้งหมด
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Responsive Camera Scanner Dialog Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[70] flex items-center justify-center p-0 md:p-4 bg-black/40 backdrop-blur-sm transition-all duration-300",
          isCameraScanning
            ? "opacity-100 pointer-events-auto visible"
            : "opacity-0 pointer-events-none invisible",
        )}
      >
        <div
          className={cn(
            "bg-background border-0 md:border rounded-none md:rounded-[28px] shadow-2xl overflow-hidden transition-all duration-300 transform w-full h-full md:h-[650px] flex flex-col md:flex-row md:max-w-4xl",
            isCameraScanning
              ? "scale-100 translate-y-0"
              : "scale-95 translate-y-4",
          )}
        >
          {/* Camera panel (Left on desktop, Top on mobile) */}
          <div className="relative flex-1 bg-zinc-950 flex flex-col min-h-[360px] md:min-h-0">
            {/* Camera Feed Video Element */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
            />

            {/* Scan Reticle (Scanner Target Bounding Box) */}
            <div
              className={cn(
                "absolute inset-0 flex justify-center pointer-events-none z-10",
                "items-center", // Vertically center on desktop
                "max-[767px]:items-start max-[767px]:pt-20", // Shift up on mobile
              )}
            >
              <div className="w-48 h-48 md:w-56 md:h-56 border-2 border-dashed border-white/25 rounded-2xl relative">
                {/* Corner Brackets */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-[5px] border-l-[5px] border-emerald-500 rounded-tl-xl -mt-[2px] -ml-[2px]" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-[5px] border-r-[5px] border-emerald-500 rounded-tr-xl -mt-[2px] -mr-[2px]" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[5px] border-l-[5px] border-emerald-500 rounded-bl-xl -mb-[2px] -ml-[2px]" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[5px] border-r-[5px] border-emerald-500 rounded-br-xl -mb-[2px] -mr-[2px]" />
              </div>
            </div>

            {/* Top Controls Overlay */}
            <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/50 to-transparent">
              <button
                type="button"
                onClick={stopCameraScan}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-md text-zinc-100 hover:bg-black/60 active:scale-90 transition-all border border-zinc-700/20"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBeepEnabled(!beepEnabled)}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-md text-zinc-100 hover:bg-black/60 active:scale-90 transition-all border border-zinc-700/20"
                  title={beepEnabled ? "ปิดเสียงบี๊บ" : "เปิดเสียงบี๊บ"}
                >
                  {beepEnabled ? (
                    <Volume2 className="h-5 w-5" />
                  ) : (
                    <VolumeX className="h-5 w-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(!settingsOpen)}
                  className="h-10 w-10 flex items-center justify-center rounded-full bg-black/45 backdrop-blur-md text-zinc-100 hover:bg-black/60 active:scale-90 transition-all border border-zinc-700/20"
                >
                  <Settings className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Settings Mini Overlay */}
            {settingsOpen && (
              <div className="absolute top-16 right-4 z-30 bg-zinc-950/95 border border-zinc-800 backdrop-blur-md text-zinc-100 rounded-2xl p-4 w-52 shadow-2xl">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  ตั้งค่าตัวอ่าน
                </h4>
                <div className="space-y-3 text-sm">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span>เสียงบี๊บ</span>
                    <input
                      type="checkbox"
                      checked={beepEnabled}
                      onChange={(e) => setBeepEnabled(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-primary focus:ring-0 focus:ring-offset-0 h-4 w-4"
                    />
                  </label>
                  <div className="pt-2 border-t border-zinc-800 flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">
                      กล้อง: โหมดตรวจจับบาร์โค้ด
                    </span>
                    <span className="text-xs font-medium text-emerald-500">
                      ทำงานอยู่ (กล้องหลัง)
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Camera Fail message overlay */}
            {cameraError && isCameraScanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center space-y-4">
                <ShieldAlert className="h-12 w-12 text-zinc-500" />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-zinc-200">
                    เปิดกล้องสแกนไม่สำเร็จ
                  </p>
                  <p className="text-xs text-zinc-500 max-w-[240px]">
                    {cameraError}
                  </p>
                  <p className="text-xs text-zinc-500 max-w-[240px]">
                    คุณสามารถพิมพ์บาร์โค้ดทางขวาแทนได้
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Items List Panel (Right side on desktop, Bottom drawer on mobile) */}
          <div
            className={cn(
              "flex flex-col bg-background text-foreground shadow-2xl border-zinc-200 transition-transform duration-300 ease-out dark:border-zinc-800",
              // Desktop layout (Right column)
              "md:relative md:inset-auto md:w-[380px] md:h-full md:max-h-full md:translate-y-0 md:rounded-none md:border-t-0 md:border-l md:bg-card md:p-6 md:pb-8 md:shadow-none",
              // Mobile layout (Bottom Drawer)
              "absolute bottom-0 inset-x-0 h-[62dvh] max-h-[62dvh] rounded-t-[32px] border-t p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]",
              isScannerDrawerExpanded
                ? "translate-y-0"
                : "translate-y-[calc(100%-112px)]",
            )}
          >
            {/* Mobile Drag Handle Bar Indicator (Hidden on desktop) */}
            <button
              type="button"
              className="mx-auto mb-4 flex h-6 w-20 items-center justify-center rounded-full md:hidden"
              aria-label={
                isScannerDrawerExpanded ? "ยุบรายการที่สแกน" : "เปิดรายการที่สแกน"
              }
              aria-expanded={isScannerDrawerExpanded}
              onClick={toggleScannerDrawer}
              onTouchStart={handleDrawerTouchStart}
              onTouchEnd={handleDrawerTouchEnd}
            >
              <span className="h-1 w-12 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </button>

            {/* Drawer Header */}
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-xl font-extrabold text-primary">
                  รายการที่สแกน
                </h3>
                <p className="mt-0.5 text-sm font-semibold text-muted-foreground">
                  {scannedItems.length === 0
                    ? "ยังไม่มีรายการ"
                    : `${scannedItems.length} รายการ (${totalItemsCount} ชิ้น)`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold tracking-wide text-muted-foreground">
                  ยอดรวม
                </p>
                <p className="mt-0.5 text-2xl font-extrabold text-primary">
                  ฿
                  {totalPrice.toLocaleString("th-TH", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            <hr className="border-zinc-200 dark:border-zinc-800 mb-4" />

            {/* Manual Input Search Bar for testing/desktop users */}
            <div className="mb-4 flex items-stretch gap-2">
              <input
                type="text"
                placeholder="ป้อนบาร์โค้ดเพื่อค้นหา..."
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleManualBarcodeSubmit();
                  }
                }}
                className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-muted px-4 text-sm font-semibold text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                type="button"
                onClick={handleManualBarcodeSubmit}
                className="h-10 shrink-0 rounded-xl border border-border bg-secondary px-4 text-sm font-bold text-secondary-foreground hover:bg-secondary/80"
              >
                จำลองสแกน
              </Button>
            </div>

            {/* Scanned Items Scrollable Area */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[90px] scrollbar-thin scrollbar-thumb-muted">
              {scannedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground space-y-1.5 h-full">
                  <Barcode className="h-6 w-6 opacity-30" />
                  <p className="text-sm font-semibold">
                    เล็งเป้าเพื่อสแกนบาร์โค้ดสินค้าจริง
                  </p>
                </div>
              ) : (
                scannedItems.map((item) => (
                  <div
                    key={item.barcode}
                    className="flex items-center justify-between rounded-2xl border border-border/80 bg-muted/35 p-3 transition-all hover:bg-muted/55"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="truncate text-base font-extrabold text-card-foreground">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-muted-foreground">
                        ฿{item.retailPrice.toFixed(2)} • {item.barcode}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-background border border-border rounded-xl px-2 py-1">
                      <button
                        type="button"
                        onClick={() => decrementQty(item.barcode)}
                        className="px-1.5 text-sm font-extrabold text-muted-foreground transition-colors hover:text-card-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-card-foreground">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => incrementQty(item.barcode)}
                        className="px-1.5 text-sm font-extrabold text-muted-foreground transition-colors hover:text-card-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Feedback message display */}
            {feedback && (
              <div className="mt-4 text-center">
                <span
                  className={cn(
                    "inline-block rounded-full border px-3 py-1 text-sm font-semibold",
                    lookupState === "found"
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : lookupState === "loading"
                        ? "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400 animate-pulse"
                        : lookupState === "missing"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {feedback}
                </span>
              </div>
            )}

            {/* Drawer Action Button */}
            <Button
              type="button"
              onClick={handleReviewOrder}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary text-base font-bold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              <ClipboardList className="h-4 w-4" />
              ตรวจรายการ
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
