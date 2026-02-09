import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="he" dir="rtl">
      <body className={inter.className}>
        <QueryProvider>
          <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar />
            
            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
              <div className="container mx-auto p-6 max-w-7xl">
                {children}
              </div>
            </main>
          </div>
          <Toaster position="top-center" />
        </QueryProvider>
      </body>
    </html>
  );
}
