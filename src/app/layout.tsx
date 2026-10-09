import type { Metadata, Viewport } from "next";
import { Literata, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

// Literata: başlıklar ve tüm rakamlar (timer). Schibsted Grotesk: arayüz metni.
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
});

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: { default: "Study Papi", template: "%s · Study Papi" },
  description: "Arkadaşlarınla aynı salonda çalış, kimin çalıştığını canlı gör.",
};

export const viewport: Viewport = {
  themeColor: "#eef1e8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="tr" className={`${literata.variable} ${schibsted.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-[16px] leading-normal">{children}</body>
    </html>
  );
}
