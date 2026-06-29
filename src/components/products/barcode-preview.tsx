"use client";

import { Barcode } from "lucide-react";
import { outfit } from "@/components/fonts/fonts";
import { cn } from "@/lib/utils";

interface BarcodePreviewProps {
  value: string;
  className?: string;
}

interface BarcodeRect {
  x: number;
  width: number;
  y: number;
  height: number;
}

interface RenderedBarcode {
  rects: BarcodeRect[];
  width: number;
  format: "CODE 128" | "EAN-13";
}

const CODE_128_PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112",
];

const START_CODE_B = 104;
const STOP_CODE = 106;
const QUIET_ZONE_MODULES = 10;
const BAR_HEIGHT = 72;
const TEXT_BASELINE = 90;
const EAN_13_QUIET_ZONE_MODULES = 11;

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

function normalizeBarcodeValue(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function getCode128BValues(value: string) {
  const values: number[] = [];

  for (const char of value) {
    const code = char.charCodeAt(0);

    if (code < 32 || code > 127) {
      return null;
    }

    values.push(code - 32);
  }

  return values;
}

function getCode128Sequence(value: string) {
  const values = getCode128BValues(value);

  if (!values) {
    return null;
  }

  const checksum =
    values.reduce(
      (sum, codeValue, index) => sum + codeValue * (index + 1),
      START_CODE_B,
    ) % 103;

  return [START_CODE_B, ...values, checksum, STOP_CODE];
}

function buildCode128Rects(sequence: number[]): RenderedBarcode {
  const rects: BarcodeRect[] = [];
  let xOffset = QUIET_ZONE_MODULES;

  for (const codeValue of sequence) {
    const pattern = CODE_128_PATTERNS[codeValue];

    for (const [index, widthText] of Array.from(pattern).entries()) {
      const width = Number(widthText);

      if (index % 2 === 0) {
        rects.push({ x: xOffset, width, y: 8, height: BAR_HEIGHT });
      }

      xOffset += width;
    }
  }

  return {
    rects,
    width: xOffset + QUIET_ZONE_MODULES,
    format: "CODE 128",
  };
}

function getEan13CheckDigit(value: string) {
  const digits = Array.from(value).map(Number);
  const sum = digits.reduce((total, digit, index) => {
    return total + digit * (index % 2 === 0 ? 1 : 3);
  }, 0);

  return (10 - (sum % 10)) % 10;
}

function isValidEan13(value: string) {
  if (!/^\d{13}$/.test(value)) {
    return false;
  }

  return getEan13CheckDigit(value.slice(0, 12)) === Number(value[12]);
}

function buildEan13Bits(value: string) {
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
    const digit = Number(value[index]);
    const patternSet = parity[index - 1] as "L" | "G";
    addBits(EAN_13_PATTERNS[patternSet][digit]);
  }

  addBits("01010", true);

  for (let index = 7; index <= 12; index += 1) {
    addBits(EAN_13_PATTERNS.R[Number(value[index])]);
  }

  addBits("101", true);

  return bits;
}

function buildEan13Rects(value: string): RenderedBarcode {
  const rects: BarcodeRect[] = [];
  const bits = buildEan13Bits(value);
  let activeRect: BarcodeRect | null = null;

  bits.forEach((module, index) => {
    const x = EAN_13_QUIET_ZONE_MODULES + index;

    if (module.bit !== "1") {
      activeRect = null;
      return;
    }

    const y = module.isGuard ? 6 : 10;
    const height = module.isGuard ? 80 : 68;

    if (activeRect && activeRect.y === y && activeRect.height === height) {
      activeRect.width += 1;
      return;
    }

    activeRect = { x, width: 1, y, height };
    rects.push(activeRect);
  });

  return {
    rects,
    width: bits.length + EAN_13_QUIET_ZONE_MODULES * 2,
    format: "EAN-13",
  };
}

function renderBarcode(value: string) {
  if (isValidEan13(value)) {
    return buildEan13Rects(value);
  }

  const sequence = getCode128Sequence(value);

  return sequence ? buildCode128Rects(sequence) : null;
}

export function BarcodePreview({ value, className }: BarcodePreviewProps) {
  const normalized = normalizeBarcodeValue(value);
  const barcode = normalized ? renderBarcode(normalized) : null;

  if (!normalized) {
    return (
      <div
        className={cn(
          "flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed bg-white px-5 py-8 text-center shadow-sm dark:bg-card",
          className,
        )}
      >
        <Barcode className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-bold text-card-foreground">
          ไม่มีบาร์โค้ดสำหรับพรีวิว
        </p>
      </div>
    );
  }

  if (!barcode) {
    return (
      <div
        className={cn(
          "flex min-h-48 flex-col items-center justify-center rounded-lg border border-orange-100 bg-orange-50/60 px-5 py-8 text-center shadow-sm dark:border-orange-500/20 dark:bg-orange-500/10",
          className,
        )}
      >
        <Barcode className="mb-3 h-8 w-8 text-main-orange" />
        <p className="text-sm font-bold text-main-orange">
          บาร์โค้ดนี้มีตัวอักษรที่ระบบพรีวิวไม่รองรับ
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-3 shadow-sm dark:bg-card",
        className,
      )}
    >
      <div className="rounded-md border bg-white p-4">
        <svg
          viewBox={`0 0 ${barcode.width} 100`}
          className="h-32 w-full text-black"
          role="img"
          aria-label={`${barcode.format} barcode for ${normalized}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <title>{`${barcode.format} barcode for ${normalized}`}</title>
          <rect width={barcode.width} height="100" fill="white" />
          {barcode.rects.map((rect) => (
            <rect
              key={`${normalized}-${rect.x}-${rect.width}`}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill="currentColor"
              shapeRendering="crispEdges"
            />
          ))}
          <text
            x={barcode.width / 2}
            y={TEXT_BASELINE}
            textAnchor="middle"
            className={cn(outfit.className, "fill-black text-[9px] font-bold")}
          >
            {normalized}
          </text>
        </svg>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold text-muted-foreground">
        <span>{barcode.format}</span>
        <span>{normalized.length} ตัวอักษร</span>
      </div>
    </div>
  );
}
