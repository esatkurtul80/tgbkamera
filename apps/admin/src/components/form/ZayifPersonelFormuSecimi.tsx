"use client";

interface ZayifPersonelFormuSecimiProps {
  checked: boolean;
  /** Mağaza formuyla birlikte işaretlenemez — mağaza formu seçiliyken devre dışı. */
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/**
 * "Zayıf Personel Formu" onay kutusu — formlar sayfasındaki üç editörde ortak.
 * İşaretli formlar, İzlenecekler havuzunda takip raporu açılırken listelenir.
 */
export default function ZayifPersonelFormuSecimi({ checked, disabled = false, onChange }: ZayifPersonelFormuSecimiProps) {
  return (
    <label className={`flex items-start gap-2.5 select-none ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        checked={checked && !disabled}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer disabled:cursor-not-allowed"
      />
      <span>
        <span className="block text-sm font-medium text-slate-700">Zayıf Personel Formu</span>
        <span className="block text-xs text-slate-400 mt-0.5">
          İşaretlenirse bu form, Zayıf Personel → İzlenecekler havuzunda takip raporu açılırken
          listelenir. En az bir form işaretlenmelidir; mağaza formlarıyla birlikte işaretlenemez.
        </span>
      </span>
    </label>
  );
}
