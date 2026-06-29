import type { Metadata } from "next";
import { Geist, DM_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";

const geist  = Geist({ subsets: ["latin"], variable: "--font-geist" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["300","400","500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "TGB Kamera Admin",
  description: "TGB Kamera Yönetim Paneli",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${geist.variable} ${dmMono.variable}`}>
      <body className="flex h-screen overflow-hidden bg-slate-50 antialiased font-[var(--font-geist)]">
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
