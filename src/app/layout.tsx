import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_Bengali } from "next/font/google";
import { getLang, getTheme } from "@/lib/auth";
import "./globals.css";

// Inter for Latin (tall x-height, made for screen UI) paired with Noto Sans
// Bengali, whose metrics sit close enough that mixed Bangla/English lines in
// the same table row stay on one baseline.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bengali = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-bangla",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ভাড়া খাতা — Bhara Khata | Rent Collector for Bangladesh",
  description:
    "বাড়িওয়ালার ডিজিটাল ভাড়া খাতা — ভাড়াটিয়া, মাসিক বিল, বিদ্যুৎ মিটার, মানি রিসিট ও বকেয়ার হিসাব এক জায়গায়।",
};

export const viewport: Viewport = {
  themeColor: "#008bc5",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lang, theme] = await Promise.all([getLang(), getTheme()]);
  return (
    <html
      lang={lang}
      className={`${inter.variable} ${bengali.variable} ${jetbrains.variable} h-full ${
        theme === "dark" ? "dark" : ""
      }`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
