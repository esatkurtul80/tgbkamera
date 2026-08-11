import type { Metadata } from "next";
import { Geist, DM_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import StaleBuildGuard from "@/components/StaleBuildGuard";

const geist  = Geist({ subsets: ["latin"], variable: "--font-geist" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["300","400","500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "TGB Kamera Admin",
  description: "TGB Kamera Yönetim Paneli",
};

// Tüm sayfalar oturum açmış kullanıcıya göre istemci tarafında render oluyor;
// statik/uzun ömürlü CDN önbelleği (varsayılan: 1 yıl) her deploy'da eski
// derlemenin artık var olmayan dosyalarına işaret eden HTML'in önbellekte
// kalmasına ve bölgeye göre 404'lere yol açıyordu. Dinamik render, her
// isteğin her zaman güncel derlemeyi almasını garantiler.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${geist.variable} ${dmMono.variable}`}>
      <body className="flex h-screen overflow-hidden bg-slate-50 antialiased font-[var(--font-geist)]">
        <StaleBuildGuard />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
