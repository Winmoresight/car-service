import { Noto_Sans_Thai, Outfit } from "next/font/google";
import localFont from "next/font/local";

export const noto = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
});

export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const free3of9 = localFont({
  src: [
    {
      path: "./free3of9/free3of9-web.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  display: "block",
  adjustFontFallback: false,
});
