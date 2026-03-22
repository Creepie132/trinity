import type { Metadata } from "next";
import { Inter, Assistant } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ 
  subsets: ["latin", "cyrillic"], 
  display: 'swap',
  variable: '--font-inter',
});
const assistant = Assistant({ 
  subsets: ["hebrew", "latin"], 
  display: 'swap',
  variable: '--font-assistant',
});

export const metadata: Metadata = {
  title: "Trinity | Amber Solutions Systems",
  description: "מערכת ניהול לקוחות, תשלומים והודעות SMS",
  icons: {
    icon: '/logo.png',
    apple: '/icons/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning — LanguageContext меняет lang/dir на клиенте при старте
    <html lang="he" dir="rtl" className="light" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://tjryzcqvsavtllahjyrj.supabase.co" />
        <link rel="dns-prefetch" href="https://tjryzcqvsavtllahjyrj.supabase.co" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Trinity" />
      </head>
      <body className={`${inter.variable} ${assistant.variable} font-sans`} suppressHydrationWarning>
        <QueryProvider>
          <LanguageProvider>
            {children}
            <Toaster 
              position="bottom-center" 
              closeButton 
              richColors
              toastOptions={{
                style: {
                  background: 'var(--background)',
                  border: '1px solid var(--border)',
                  color: 'var(--foreground)',
                },
                classNames: {
                  toast: 'backdrop-blur-sm bg-opacity-95',
                  error: 'bg-red-50 border-red-200',
                  success: 'bg-green-50 border-green-200',
                  warning: 'bg-yellow-50 border-yellow-200',
                  info: 'bg-blue-50 border-blue-200',
                }
              }}
            />
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
