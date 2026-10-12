import type { MetadataRoute } from "next";

/**
 * Web App Manifest — ana ekrana eklenen uygulamanın (iOS/Android) kapsamı tüm site ("/").
 * Manifest olmadan iOS, kapsamı eklendiği sayfanın yolu sayar ve ör. /degerlendirmeler/… gibi
 * başka yollara geçişleri uygulama içi Safari penceresinde (çarpı, paylaş çubuğu) açar.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TGB Kamera",
    short_name: "TGB Kamera",
    description: "TGB Kamera Yönetim Paneli",
    start_url: "/",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#9b1b30",
    lang: "tr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
