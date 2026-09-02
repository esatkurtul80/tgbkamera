import type { KullaniciRol, SoruTipi } from "@/types";

type BadgeVariant =
  | "puanli"
  | "puansiz"
  | "yorumlu_puanli"
  | "aktif"
  | "pasif"
  | "esik"
  | "oran"
  | KullaniciRol
  | SoruTipi;

const styles: Record<BadgeVariant, string> = {
  puanli: "bg-indigo-50 text-indigo-600",
  puansiz: "bg-slate-100 text-slate-500",
  yorumlu_puanli: "bg-violet-50 text-violet-600",
  aktif: "bg-emerald-50 text-emerald-600",
  pasif: "bg-red-50 text-red-500",
  esik: "bg-amber-50 text-amber-600",
  oran: "bg-sky-50 text-sky-600",
  admin: "bg-violet-50 text-violet-700",
  sirketsahibi: "bg-rose-50 text-rose-700",
  ust_yonetici: "bg-orange-50 text-orange-700",
  bolge_muduru: "bg-blue-50 text-blue-700",
  magaza_sorumlusu: "bg-teal-50 text-teal-700",
  kameraman: "bg-slate-100 text-slate-600",
  evet_hayir_muaf: "bg-indigo-50 text-indigo-600",
  sayi: "bg-cyan-50 text-cyan-600",
  tarih: "bg-fuchsia-50 text-fuchsia-600",
  saat: "bg-purple-50 text-purple-600",
  kisa_metin: "bg-lime-50 text-lime-700",
  yorum: "bg-pink-50 text-pink-600",
};

const labels: Record<BadgeVariant, string> = {
  puanli: "Puanlı",
  puansiz: "Puansız",
  yorumlu_puanli: "Yorumlu Puanlı",
  aktif: "Aktif",
  pasif: "Pasif",
  esik: "Eşik",
  oran: "Oran",
  admin: "Admin",
  sirketsahibi: "Şirket Sahibi",
  ust_yonetici: "Üst Yönetici",
  bolge_muduru: "Bölge Müdürü",
  magaza_sorumlusu: "Mağaza",
  kameraman: "Kameraman",
  evet_hayir_muaf: "Evet/Hayır/Muaf",
  sayi: "Sayı",
  tarih: "Tarih",
  saat: "Saat",
  kisa_metin: "Kısa Metin",
  yorum: "Yorum",
};

interface BadgeProps {
  variant: BadgeVariant;
}

export default function Badge({ variant }: BadgeProps) {
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {labels[variant]}
    </span>
  );
}
