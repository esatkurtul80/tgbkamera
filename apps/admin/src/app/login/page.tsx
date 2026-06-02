"use client";

import { useState } from "react";
import { Camera } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/popup-closed-by-user") {
        setError(null);
      } else {
        setError("Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left: Login */}
      <div className="flex flex-col justify-center items-center w-full max-w-md px-10 bg-white shrink-0">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-4">
            <Camera size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">TGB Kamera</h1>
          <p className="text-sm text-slate-500 mt-1">Yönetim Paneli</p>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            Hesabınıza giriş yapın
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            Devam etmek için Google hesabınızla giriş yapın.
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                />
                <path
                  fill="#34A853"
                  d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
                />
                <path
                  fill="#FBBC05"
                  d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                />
                <path
                  fill="#EA4335"
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                />
              </svg>
            )}
            Google ile Giriş Yap
          </button>
        </div>

        <p className="mt-10 text-xs text-slate-400">
          © {new Date().getFullYear()} TGB Kamera. Tüm hakları saklıdır.
        </p>
      </div>

      {/* Right: Decorative panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 items-center justify-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative text-center text-white px-12">
          <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mx-auto mb-6 border border-white/20">
            <Camera size={44} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-3">TGB Kamera</h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            Kamera sistemleri ve güvenlik çözümleri yönetim paneli
          </p>
          <div className="mt-10 flex gap-3 justify-center">
            {["Ürün Yönetimi", "Müşteriler", "Analitik"].map((tag) => (
              <span
                key={tag}
                className="px-3 py-1.5 rounded-full text-xs bg-white/10 border border-white/20 text-slate-300"
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
