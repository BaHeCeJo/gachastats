import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LocalizationProvider } from "@/lib/localization";
import { headers } from "next/headers";
import { languages } from "@/lib/constants/languages";

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
  const cookies = headersList.get('cookie') || '';
  const userLang = cookies.split('; ').find(row => row.startsWith('user_lang='))?.split('=')[1];
  
  const acceptLanguage = headersList.get('Accept-Language');
  const browserLang = acceptLanguage ? acceptLanguage.split(',')[0].split('-')[0].toLowerCase() : 'en';

  const currentLang = userLang || browserLang;
  const isRtl = languages.find(l => l.code === currentLang)?.isRtl || false;

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
