interface BadgeProps {
  variant: "puanli" | "puansiz" | "aktif" | "pasif";
}

const styles: Record<BadgeProps["variant"], string> = {
  puanli: "bg-indigo-50 text-indigo-600",
  puansiz: "bg-slate-100 text-slate-500",
  aktif: "bg-emerald-50 text-emerald-600",
  pasif: "bg-red-50 text-red-500",
};

const labels: Record<BadgeProps["variant"], string> = {
  puanli: "Puanlı",
  puansiz: "Puansız",
  aktif: "Aktif",
  pasif: "Pasif",
};

export default function Badge({ variant }: BadgeProps) {
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${styles[variant]}`}>
      {labels[variant]}
    </span>
  );
}
