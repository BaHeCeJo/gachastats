import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LocalizationProvider } from "@/lib/localization";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GachaStats",
  description: "Gacha Archives & Analytics",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use a static default for the build to enable SSG/ISR
  const currentLang = 'en';
  const isRtl = false;

  return (
    <html lang={currentLang} dir={isRtl ? 'rtl' : 'ltr'}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LocalizationProvider currentLang={currentLang}>
          {children}
        </LocalizationProvider>
      </body>
    </html>
  );
}
