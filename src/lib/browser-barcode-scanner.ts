export type BarcodeDetection = {
  rawValue: string;
};

export type BarcodeScannerEngine = "native" | "zxing";

export type BrowserBarcodeScanner = {
  engine: BarcodeScannerEngine;
  detect(source: HTMLVideoElement): Promise<BarcodeDetection[]>;
};

type BarcodeDetectorInstance = {
  detect(source: HTMLVideoElement): Promise<BarcodeDetection[]>;
};

type BarcodeDetectorConstructor = {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
};

type BarcodeDetectorWindow = Window & {
  BarcodeDetector?: BarcodeDetectorConstructor;
};

const preferredNativeFormats = [
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
];

const fallbackNativeFormats = [
  "ean_13",
  "ean_8",
  "code_128",
  "code_39",
  "qr_code",
];

async function createNativeBarcodeScanner(): Promise<BrowserBarcodeScanner | null> {
  const Detector = (window as BarcodeDetectorWindow).BarcodeDetector;

  if (!Detector) {
    return null;
  }

  let formats = [...fallbackNativeFormats];

  if (Detector.getSupportedFormats) {
    const supportedFormats = await Detector.getSupportedFormats();
    formats = preferredNativeFormats.filter((format) =>
      supportedFormats.includes(format),
    );
  }

  try {
    const detector =
      formats.length > 0 ? new Detector({ formats }) : new Detector();

    return {
      engine: "native",
      detect: (source) => detector.detect(source),
    };
  } catch {
    const detector = new Detector();

    return {
      engine: "native",
      detect: (source) => detector.detect(source),
    };
  }
}

async function createZxingBarcodeScanner(): Promise<BrowserBarcodeScanner> {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
    await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
  const hints = new Map();

  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.ITF,
    BarcodeFormat.CODE_93,
    BarcodeFormat.CODABAR,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new BrowserMultiFormatReader(hints, {
    delayBetweenScanAttempts: 300,
    delayBetweenScanSuccess: 500,
  });

  return {
    engine: "zxing",
    async detect(source) {
      try {
        const result = reader.decode(source);
        const rawValue = result.getText().trim();

        return rawValue ? [{ rawValue }] : [];
      } catch {
        return [];
      }
    },
  };
}

export async function createBrowserBarcodeScanner(): Promise<BrowserBarcodeScanner> {
  const nativeScanner = await createNativeBarcodeScanner();

  if (nativeScanner) {
    return nativeScanner;
  }

  return createZxingBarcodeScanner();
}
