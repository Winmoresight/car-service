"use client";

import { Barcode, Camera, Loader2, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type BarcodeDetection = {
  rawValue: string;
};

type BarcodeDetectorInstance = {
  detect(source: HTMLVideoElement): Promise<BarcodeDetection[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
};

interface BarcodeCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (barcode: string) => void;
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

function normalizeBarcode(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function getCameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "ไม่ได้รับอนุญาตให้ใช้กล้อง กรุณาอนุญาตกล้องในเบราว์เซอร์";
    }

    if (error.name === "NotFoundError") {
      return "ไม่พบกล้องบนอุปกรณ์นี้";
    }
  }

  return error instanceof Error ? error.message : "เปิดกล้องไม่สำเร็จ";
}

async function createBarcodeDetector() {
  const Detector = (
    window as Window & {
      BarcodeDetector?: BarcodeDetectorConstructor;
    }
  ).BarcodeDetector;

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
    return formats.length > 0 ? new Detector({ formats }) : new Detector();
  } catch {
    return new Detector();
  }
}

export function BarcodeCameraDialog({
  open,
  onOpenChange,
  onDetected,
}: BarcodeCameraDialogProps) {
  const [status, setStatus] = useState<
    "idle" | "opening" | "scanning" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [manualBarcode, setManualBarcode] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);
  const onDetectedRef = useRef(onDetected);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const completeScan = useCallback(
    (rawBarcode: string) => {
      const barcode = normalizeBarcode(rawBarcode);

      if (!barcode) {
        setStatus("error");
        setMessage("กรุณาระบุบาร์โค้ด");
        return;
      }

      stopCamera();
      onDetectedRef.current(barcode);
      onOpenChangeRef.current(false);
    },
    [stopCamera],
  );

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    let cancelled = false;

    const startCamera = async () => {
      setStatus("opening");
      setMessage("กำลังเปิดกล้องหลัง...");
      setManualBarcode("");

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง");
        }

        const detector = await createBarcodeDetector();

        if (!detector) {
          throw new Error("เบราว์เซอร์นี้ไม่รองรับการอ่านบาร์โค้ดจากกล้อง");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
          },
          audio: false,
        });

        if (cancelled) {
          for (const track of stream.getTracks()) {
            track.stop();
          }
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;

        if (!video) {
          throw new Error("ไม่พบพื้นที่แสดงกล้อง");
        }

        video.srcObject = stream;
        await video.play();
        setStatus("scanning");
        setMessage("เล็งบาร์โค้ดให้อยู่กลางกรอบ");

        const scanFrame = async () => {
          if (cancelled || !streamRef.current) {
            return;
          }

          try {
            if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const detections = await detector.detect(video);
              const barcode = detections[0]?.rawValue;

              if (barcode) {
                completeScan(barcode);
                return;
              }
            }
          } catch {
            // ลองอ่านภาพจากกล้องอีกครั้งในเฟรมถัดไป
          }

          if (!cancelled && streamRef.current) {
            scanTimerRef.current = window.setTimeout(scanFrame, 300);
          }
        };

        scanFrame();
      } catch (error) {
        if (cancelled) {
          return;
        }

        stopCamera();
        setStatus("error");
        setMessage(getCameraErrorMessage(error));
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [completeScan, open, stopCamera]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      stopCamera();
    }

    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="z-[60] max-w-2xl gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b px-6 py-5 pr-14">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                สแกนบาร์โค้ดสินค้า
              </DialogTitle>
              <DialogDescription className="mt-1">
                ระบบจะนำบาร์โค้ดที่อ่านได้ไปใส่ในฟอร์มเพิ่มสินค้า
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-zinc-950 p-4">
          <div className="relative mx-auto aspect-[4/3] max-h-[56vh] overflow-hidden rounded-2xl border border-white/10 bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
            />

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-40 w-64 max-w-[75%] rounded-2xl border-2 border-dashed border-white/35">
                <div className="absolute -top-0.5 -left-0.5 h-8 w-8 rounded-tl-xl border-t-4 border-l-4 border-emerald-400" />
                <div className="absolute -top-0.5 -right-0.5 h-8 w-8 rounded-tr-xl border-t-4 border-r-4 border-emerald-400" />
                <div className="absolute -bottom-0.5 -left-0.5 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-emerald-400" />
                <div className="absolute -right-0.5 -bottom-0.5 h-8 w-8 rounded-br-xl border-r-4 border-b-4 border-emerald-400" />
              </div>
            </div>

            {status === "opening" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm font-bold">{message}</p>
              </div>
            ) : null}

            {status === "error" ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center">
                <ShieldAlert className="h-10 w-10 text-zinc-400" />
                <p className="max-w-sm text-sm font-bold text-zinc-200">
                  {message}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 border-t bg-card px-6 py-5">
          <div
            className={cn(
              "flex items-center gap-2 text-sm font-bold",
              status === "error" ? "text-main-red" : "text-muted-foreground",
            )}
          >
            {status === "scanning" ? (
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
            ) : null}
            <span>{message || "พร้อมเปิดกล้อง"}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Barcode className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={manualBarcode}
                onChange={(event) => setManualBarcode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    completeScan(manualBarcode);
                  }
                }}
                className="h-11 rounded-[8px] pl-9 font-semibold"
                placeholder="กรอกบาร์โค้ดแทน"
              />
            </div>
            <Button
              type="button"
              className="h-11 rounded-[8px] px-5 font-bold"
              onClick={() => completeScan(manualBarcode)}
            >
              ใช้บาร์โค้ดนี้
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
