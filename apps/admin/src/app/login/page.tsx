"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err?.code !== "auth/popup-closed-by-user") {
        setError("Google ile giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full">
      {/* Left: Login */}
      <div className="flex flex-col w-full lg:w-[440px] xl:w-[480px] shrink-0 px-8 sm:px-14 py-10 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Camera size={17} className="text-white" />
          </div>
          <span className="text-base font-bold text-slate-900">TGB Kamera</span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-sm">
            <h1 className="text-2xl font-bold text-slate-900 mb-1.5">Tekrar hoş geldiniz</h1>
            <p className="text-sm text-slate-500 mb-8">
              Devam etmek için şirket Google hesabınızla giriş yapın.
            </p>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSubmit}
              disabled={loading}
              className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-sm"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.355 0 3.39 2.673 1.482 6.573l3.784 3.192Z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.273c0-.818-.073-1.609-.209-2.373H12v4.5h6.445A5.518 5.518 0 0 1 16.082 18l3.745 2.909C22.018 19.018 23.49 15.936 23.49 12.273Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.266 14.235A7.108 7.108 0 0 1 4.909 12c0-.79.127-1.555.357-2.265l-3.784-3.19A11.91 11.91 0 0 0 0 12c0 2.027.509 3.936 1.409 5.618l3.857-3.383Z"
                  />
                  <path
                    fill="#34A853"
                    d="M16.082 18a7.009 7.009 0 0 1-4.082 1.1c-3.155 0-5.836-2.127-6.79-4.99L1.354 17.5A11.905 11.905 0 0 0 12 24c3.245 0 5.973-1.073 7.964-2.909L16.082 18Z"
                  />
                </svg>
              )}
              {loading ? "Giriş yapılıyor..." : "Google ile Giriş Yap"}
            </button>

            <p className="mt-5 text-xs text-slate-400 leading-relaxed">
              Yalnızca yetkilendirilmiş şirket e-posta adresleriyle giriş yapılabilir.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} TGB Kamera. Tüm hakları saklıdır.
        </p>
      </div>

      {/* Right: Decorative panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-700 items-center justify-center">
        <div className="absolute -top-24 -left-16 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-blue-400/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
            backgroundSize: "36px 36px",
          }}
        />

        <div className="relative text-white px-16 max-w-lg">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-8 border border-white/20">
            <Camera size={26} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4">
            Mağaza denetimlerini ve personel performansını tek panelden yönetin.
          </h2>
          <p className="text-indigo-100/80 text-sm leading-relaxed">
            Kameramanlarınızın sahadan ilettiği değerlendirmeleri anında görün, puanlayın ve raporlayın.
          </p>
          <div className="mt-9 flex gap-2.5 flex-wrap">
            {["Mağaza Denetimi", "Personel Değerlendirme", "Raporlama"].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 border border-white/20 text-white/90"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
