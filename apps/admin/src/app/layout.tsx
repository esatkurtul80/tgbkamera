import type { Metadata, Viewport } from "next";
import { Geist, DM_Mono, Playfair_Display, Archivo, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import AppShell from "@/components/AppShell";
import StaleBuildGuard from "@/components/StaleBuildGuard";

const geist  = Geist({ subsets: ["latin"], variable: "--font-geist" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["300","400","500"], variable: "--font-mono" });
// Rapor tasarımında kullanılan fontlar (Türkçe karakterler için latin-ext şart)
const playfair   = Playfair_Display({ subsets: ["latin", "latin-ext"], variable: "--font-playfair" });
const archivo    = Archivo({ subsets: ["latin", "latin-ext"], variable: "--font-archivo" });
const splineMono = Spline_Sans_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-splinemono" });

export const metadata: Metadata = {
  title: "TGB Kamera Admin",
  description: "TGB Kamera Yönetim Paneli",
  applicationName: "TGB Kamera",
  manifest: "/manifest.webmanifest",
  // iOS ana ekran: bağımsız (standalone) açılış; kapsam manifest'ten ("/") gelir,
  // böylece rapor detayı gibi başka yollar uygulama içi Safari penceresinde açılmaz.
  appleWebApp: { capable: true, title: "TGB Kamera", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#9b1b30",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Tüm sayfalar oturum açmış kullanıcıya göre istemci tarafında render oluyor;
// statik/uzun ömürlü CDN önbelleği (varsayılan: 1 yıl) her deploy'da eski
// derlemenin artık var olmayan dosyalarına işaret eden HTML'in önbellekte
// kalmasına ve bölgeye göre 404'lere yol açıyordu. Dinamik render, her
// isteğin her zaman güncel derlemeyi almasını garantiler.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${geist.variable} ${dmMono.variable} ${playfair.variable} ${archivo.variable} ${splineMono.variable}`}>
      <body className="flex h-dvh overflow-hidden bg-slate-50 antialiased font-[var(--font-geist)]">
        <StaleBuildGuard />
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
