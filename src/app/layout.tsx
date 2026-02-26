import type { Metadata } from "next";
import { Inter, Assistant } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/sonner";
import ConditionalChatWidget from "@/components/ConditionalChatWidget";
import { ModalManager } from "@/components/modals/ModalManager";

const inter = Inter({ subsets: ["latin"] });
const assistant = Assistant({ subsets: ["hebrew"] });

export const metadata: Metadata = {
  title: "Trinity | Amber Solutions Systems",
  description: "מערכת ניהול לקוחות, תשלומים והודעות SMS",
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className="light">
      <body className={inter.className}>
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
                  error: 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-800',
                  success: 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-800',
                  warning: 'bg-yellow-50 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800',
                  info: 'bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-800',
                }
              }}
            />
            <ConditionalChatWidget />
            <ModalManager />
          </LanguageProvider>
        </QueryProvider>
      </body>
    </html>
  );
}