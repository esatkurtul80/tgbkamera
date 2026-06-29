"use client";

import { useState } from "react";
import { Camera, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError("E-posta veya şifre hatalı. Lütfen tekrar deneyin.");
      } else if (code === "auth/too-many-requests") {
        setError("Çok fazla başarısız deneme. Lütfen bir süre bekleyin.");
      } else {
        setError("Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.");
      }
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-xl font-semibold text-slate-900 mb-1">Giriş Yap</h2>
          <p className="text-sm text-slate-500 mb-7">Hesabınıza erişmek için bilgilerinizi girin.</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">E-posta</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@sirket.com"
                  required
                  className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Şifre</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400">Veya</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSubmit}
            disabled={loading}
            className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
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
            Personel değerlendirme ve mağaza denetim sistemi
          </p>
          <div className="mt-10 flex gap-3 justify-center flex-wrap">
            {["Mağaza Denetimi", "Personel Değerlendirme", "Raporlama"].map((tag) => (
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
