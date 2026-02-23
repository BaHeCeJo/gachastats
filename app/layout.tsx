import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LocalizationProvider } from "@/lib/localization";
import { headers } from "next/headers";

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
  const headersList = await headers();
  const acceptLanguage = headersList.get('Accept-Language');
  const currentLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';

  return (
    <html lang={currentLang}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LocalizationProvider currentLang={currentLang}>
          {children}
        </LocalizationProvider>
      </body>
    </html>
  );
}
