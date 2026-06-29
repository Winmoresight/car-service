"use client";

import { useState } from "react";
import { free3of9, outfit } from "@/components/fonts/fonts";
import { cn } from "@/lib/utils";

const barcodeTypes = [
  { label: "Code 39", value: "code39" },
  { label: "EAN-13", value: "ean13" },
] as const;

type BarcodeType = (typeof barcodeTypes)[number]["value"];

const unsupportedCode39Characters = /[^0-9A-Z $%+\-./]/g;

const EAN_13_PARITY = [
  "LLLLLL",
  "LLGLGG",
  "LLGGLG",
  "LLGGGL",
  "LGLLGG",
  "LGGLLG",
  "LGGGLL",
  "LGLGLG",
  "LGLGGL",
  "LGGLGL",
];

const EAN_13_PATTERNS = {
  L: [
    "0001101",
    "0011001",
    "0010011",
    "0111101",
    "0100011",
    "0110001",
    "0101111",
    "0111011",
    "0110111",
    "0001011",
  ],
  G: [
    "0100111",
    "0110011",
    "0011011",
    "0100001",
    "0011101",
    "0111001",
    "0000101",
    "0010001",
    "0001001",
    "0010111",
  ],
  R: [
    "1110010",
    "1100110",
    "1101100",
    "1000010",
    "1011100",
    "1001110",
    "1010000",
    "1000100",
    "1001000",
    "1110100",
  ],
} as const;

function normalizeCode39Value(value: string) {
  return value.toUpperCase().replace(unsupportedCode39Characters, "");
}

function normalizeEan13Value(value: string) {
  return value.replace(/\D/g, "").slice(0, 13);
}

function getEan13CheckDigit(value: string) {
  const digits = value.slice(0, 12).split("").map(Number);
  const sum = digits.reduce(
    (total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3),
    0,
  );

  return String((10 - (sum % 10)) % 10);
}

function buildEan13PreviewValue(value: string) {
  const normalizedValue = normalizeEan13Value(value);

  if (normalizedValue.length === 12) {
    return `${normalizedValue}${getEan13CheckDigit(normalizedValue)}`;
  }

  if (normalizedValue.length === 13) {
    return normalizedValue;
  }

  return "";
}

function isValidEan13Value(value: string) {
  return value.length === 13 && getEan13CheckDigit(value) === value[12];
}

function buildEan13Bars(value: string) {
  const firstDigit = Number(value[0]);
  const parity = EAN_13_PARITY[firstDigit];
  const bits: Array<{ bit: string; isGuard: boolean }> = [];
  const addBits = (pattern: string, isGuard = false) => {
    for (const bit of pattern) {
      bits.push({ bit, isGuard });
    }
  };

  addBits("101", true);

  for (let index = 1; index <= 6; index += 1) {
    const patternSet = parity[index - 1] as "L" | "G";
    addBits(EAN_13_PATTERNS[patternSet][Number(value[index])]);
  }

  addBits("01010", true);

  for (let index = 7; index <= 12; index += 1) {
    addBits(EAN_13_PATTERNS.R[Number(value[index])]);
  }

  addBits("101", true);

  const rects: Array<{ height: number; width: number; x: number; y: number }> =
    [];
  let activeRect: (typeof rects)[number] | null = null;

  bits.forEach((module, index) => {
    if (module.bit !== "1") {
      activeRect = null;
      return;
    }

    const rect = {
      height: module.isGuard ? 82 : 72,
      width: 1,
      x: 11 + index,
      y: module.isGuard ? 4 : 8,
    };

    if (
      activeRect &&
      activeRect.y === rect.y &&
      activeRect.height === rect.height
    ) {
      activeRect.width += 1;
      return;
    }

    activeRect = rect;
    rects.push(rect);
  });

  return rects;
}

function Ean13Preview({ value }: { value: string }) {
  const rects = buildEan13Bars(value);
  const moduleWidth = 4;

  return (
    <svg
      viewBox="0 0 468 100"
      className="h-[100px] w-full max-w-[468px] text-black"
      role="img"
      aria-label={`EAN-13 barcode for ${value}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{`EAN-13 barcode for ${value}`}</title>
      <rect width="468" height="100" fill="white" />
      {rects.map((rect) => (
        <rect
          key={`${rect.x}-${rect.width}-${rect.y}`}
          x={rect.x * moduleWidth}
          y={rect.y}
          width={rect.width * moduleWidth}
          height={rect.height}
          fill="currentColor"
          shapeRendering="crispEdges"
        />
      ))}
      <text
        x={5.5 * moduleWidth}
        y="96"
        fill="black"
        fontSize="14"
        fontWeight="700"
        textAnchor="middle"
      >
        {value[0]}
      </text>
      <text
        x={35 * moduleWidth}
        y="96"
        fill="black"
        fontSize="14"
        fontWeight="700"
        letterSpacing="1"
        textAnchor="middle"
      >
        {value.slice(1, 7)}
      </text>
      <text
        x={83 * moduleWidth}
        y="96"
        fill="black"
        fontSize="14"
        fontWeight="700"
        letterSpacing="1"
        textAnchor="middle"
      >
        {value.slice(7)}
      </text>
    </svg>
  );
}

export default function BarcodeFontTestPage() {
  const [barcode, setBarcode] = useState("8859305599670");
  const [barcodeType, setBarcodeType] = useState<BarcodeType>("ean13");
  const isEan13 = barcodeType === "ean13";
  const normalizedCode39Value = normalizeCode39Value(barcode);
  const ean13PreviewValue = buildEan13PreviewValue(barcode);
  const previewValue = isEan13
    ? ean13PreviewValue || " "
    : normalizedCode39Value
      ? `*${normalizedCode39Value}*`
      : " ";
  const isEan13ChecksumValid = isValidEan13Value(ean13PreviewValue);
  const previewFontSize = `${Math.max(
    32,
    Math.min(100, 1500 / Math.max(previewValue.length, 1)),
  )}px`;

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center px-4 py-10">
      <main className="flex w-full max-w-4xl flex-col items-center gap-8">
        <div className="grid w-full max-w-xl grid-cols-2 gap-2 rounded-xl border bg-white p-1 shadow-sm">
          {barcodeTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setBarcodeType(type.value)}
              className={cn(
                outfit.className,
                "h-11 rounded-lg font-bold text-sm transition",
                barcodeType === type.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {type.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          inputMode={isEan13 ? "numeric" : "text"}
          value={barcode}
          onChange={(event) => setBarcode(event.target.value)}
          className={cn(
            outfit.className,
            "h-14 w-full max-w-xl rounded-lg border bg-white px-5 text-center !text-xl font-bold text-card-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10",
          )}
          placeholder={isEan13 ? "ป้อนเลข EAN-13" : "ป้อนบาร์โค้ด Code 39"}
          autoComplete="off"
          spellCheck={false}
        />

        <section className="flex h-40 w-full max-w-3xl items-center justify-center overflow-hidden rounded-lg border bg-white px-5 shadow-sm">
          <p
            className={cn(
              free3of9.className,
              "max-w-full overflow-hidden whitespace-nowrap text-center leading-none text-black",
              isEan13 && "hidden",
            )}
            style={{
              fontSize: previewFontSize,
              fontKerning: "none",
              fontVariantLigatures: "none",
            }}
          >
            {previewValue}
          </p>

          {isEan13 && ean13PreviewValue && (
            <Ean13Preview value={ean13PreviewValue} />
          )}
        </section>

        {isEan13 && (
          <p
            className={cn(
              outfit.className,
              "min-h-5 text-center text-muted-foreground text-sm",
            )}
          >
            {ean13PreviewValue
              ? isEan13ChecksumValid
                ? `EAN-13 พร้อมสแกน: ${ean13PreviewValue}`
                : "checksum ไม่ตรง สแกนอาจไม่ติด"
              : "EAN-13 ต้องใช้เลข 12 หลักเพื่อเติม checksum หรือ 13 หลักที่ถูกต้อง"}
          </p>
        )}
      </main>
    </div>
  );
}
