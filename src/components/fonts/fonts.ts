import { Noto_Sans_Thai, Outfit } from "next/font/google";

export const noto = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
});

export const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
