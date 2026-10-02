import Link from "next/link";
import type React from "react";

interface StatKartProps {
  icon: React.ElementType;
  title: string;
  value: number | string;
  /** İkon kutusunun arka plan sınıfı, ör. "bg-blue-500" */
  renk: string;
  /** Verilirse kart tıklanabilir bir bağlantı olur. */
  href?: string;
  /** Değerin altında küçük yardımcı metin. */
  altMetin?: string;
  /** true ise yatay, alçak kart: ikon solda, değer ve başlık yan yana (liste sayfaları için). */
  kucuk?: boolean;
}

/** Panel üstlerindeki özet istatistik kartı. */
export default function StatKart({ icon: Icon, title, value, renk, href, altMetin, kucuk = false }: StatKartProps) {
  const icerik = kucuk ? (
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${renk}`}>
        <Icon size={14} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-slate-900 leading-tight tabular-nums">{value}</p>
        <p className="text-xs text-slate-500 truncate">{title}{altMetin ? <span className="text-slate-400"> · {altMetin}</span> : null}</p>
      </div>
    </div>
  ) : (
    <>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${renk}`}>
        <Icon size={16} className="text-white" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{title}</p>
      {altMetin && <p className="text-xs text-slate-400 mt-1">{altMetin}</p>}
    </>
  );
  const sinif = kucuk
    ? "bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm flex-1 min-w-[180px]"
    : "bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex-1 min-w-[200px]";
  if (href) {
    return (
      <Link href={href} className={`${sinif} block hover:border-indigo-200 hover:shadow transition-all`}>
        {icerik}
      </Link>
    );
  }
  return <div className={sinif}>{icerik}</div>;
}
