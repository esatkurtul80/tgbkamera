import type { KullaniciRol } from "@/types";

type BadgeVariant =
  | "puanli"
  | "puansiz"
  | "aktif"
  | "pasif"
  | "esik"
  | "oran"
  | KullaniciRol;

const styles: Record<BadgeVariant, string> = {
  puanli: "bg-indigo-50 text-indigo-600",
  puansiz: "bg-slate-100 text-slate-500",
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
};

const labels: Record<BadgeVariant, string> = {
  puanli: "Puanlı",
  puansiz: "Puansız",
  aktif: "Aktif",
  pasif: "Pasif",
  esik: "Eşik",
  oran: "Oran",
  admin: "Admin",
  sirketsahibi: "Şirket Sahibi",
  ust_yonetici: "Üst Yönetici",
  bolge_muduru: "Bölge Müdürü",
  magaza_sorumlusu: "Mağaza Sorumlusu",
  kameraman: "Kameraman",
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
