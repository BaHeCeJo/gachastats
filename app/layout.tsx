import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { LocalizationProvider } from "@/lib/localization";
import { Toaster } from "sonner";
import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "GachaStats",
    template: "%s | GachaStats",
  },
  description: "Track your gacha game collections, explore character archives, and optimize your team compositions.",
  keywords: ["gacha", "tracker", "collection", "characters", "team builder", "archive", "analytics"],
  robots: { index: true, follow: true },
  openGraph: {
    siteName: "GachaStats",
    type: "website",
    title: "GachaStats",
    description: "Track your gacha game collections, explore character archives, and optimize your team compositions.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GachaStats",
    description: "Track your gacha game collections, explore character archives, and optimize your team compositions.",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const userLang = cookieStore.get('user_lang')?.value ?? 'en';
  const currentLang = userLang;
  const isRtl = false;

  return (
    <html lang={currentLang} dir={isRtl ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <head>
        {/* Set dark class before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();` }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LocalizationProvider currentLang={currentLang}>
          {children}
          <Toaster richColors position="bottom-right" />
        </LocalizationProvider>
      </body>
    </html>
  );
}
