"use client";

import { useState, useMemo, type ReactNode } from "react";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight, Filter, X,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import EmptyState from "./EmptyState";

type SortDir = "asc" | "desc" | null;

export interface DataColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  searchValue?: (row: T) => string;
  /** Verilirse başlıkta Excel benzeri, benzersiz değer listesinden çoklu seçim filtresi açılır. */
  filterValue?: (row: T) => string;
  align?: "left" | "center" | "right";
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  searchPlaceholder?: string;
  /** false verilirse üstteki genel arama kutusu gizlenir (sütun filtreleri yeterliyse). */
  showSearch?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  defaultPageSize?: number;
  toolbar?: React.ReactNode;
  compact?: boolean;
}

const PAGE_SIZES = [10, 25, 50, 100];

const TR_TARIH = /^\d{2}\.\d{2}\.\d{4}$/;

/** dd.MM.yyyy değerlerini kronolojik (en yeni önce), diğerlerini alfabetik sıralar. */
function optionSirala(a: string, b: string): number {
  if (TR_TARIH.test(a) && TR_TARIH.test(b)) {
    const ka = a.slice(6) + a.slice(3, 5) + a.slice(0, 2);
    const kb = b.slice(6) + b.slice(3, 5) + b.slice(0, 2);
    return kb.localeCompare(ka);
  }
  return a.localeCompare(b, "tr");
}

export default function DataTable<T>({
  data,
  columns,
  rowKey,
  loading = false,
  searchPlaceholder = "Ara...",
  showSearch = true,
  emptyIcon,
  emptyTitle = "Kayıt bulunamadı",
  emptyDescription,
  defaultPageSize = 10,
  toolbar,
  compact = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Excel benzeri sütun filtreleri: sütun anahtarı → seçili değerler.
  // Boş küme = o sütunda filtre yok (tümü görünür).
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [acikFiltre, setAcikFiltre] = useState<{ key: string; top: number; left: number } | null>(null);
  const [filtreArama, setFiltreArama] = useState("");

  const searchable = showSearch && columns.some((c) => c.searchValue);
  const hasActiveFilters = Object.values(filters).some((s) => s.size > 0);

  const columnFilteredData = useMemo(() => {
    const aktif = Object.entries(filters).filter(([, s]) => s.size > 0);
    if (aktif.length === 0) return data;
    return data.filter((row) =>
      aktif.every(([key, secili]) => {
        const col = columns.find((c) => c.key === key);
        return !col?.filterValue || secili.has(col.filterValue(row));
      })
    );
  }, [data, filters, columns]);

  const searchedData = useMemo(() => {
    if (!search.trim()) return columnFilteredData;
    const lower = search.toLowerCase();
    return columnFilteredData.filter((row) =>
      columns.some((col) => col.searchValue?.(row).toLowerCase().includes(lower))
    );
  }, [columnFilteredData, search, columns]);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return searchedData;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return searchedData;
    return [...searchedData].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [searchedData, sortKey, sortDir, columns]);

  const total = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageData = sortedData.slice(start, start + pageSize);

  // Açık filtre menüsünün seçenekleri: diğer sütunların filtreleri uygulanmış
  // veri üzerinden benzersiz değerler + kayıt sayıları (Excel davranışı).
  const acikCol = acikFiltre ? columns.find((c) => c.key === acikFiltre.key) : null;
  const filtreSecenekleri = useMemo(() => {
    if (!acikCol?.filterValue) return [];
    const digerleri = Object.entries(filters).filter(([k, s]) => k !== acikCol.key && s.size > 0);
    const satirlar = data.filter((row) =>
      digerleri.every(([k, secili]) => {
        const c = columns.find((cc) => cc.key === k);
        return !c?.filterValue || secili.has(c.filterValue(row));
      })
    );
    const sayilar = new Map<string, number>();
    satirlar.forEach((row) => {
      const v = acikCol.filterValue!(row);
      sayilar.set(v, (sayilar.get(v) ?? 0) + 1);
    });
    return [...sayilar.entries()]
      .sort((a, b) => optionSirala(a[0], b[0]))
      .map(([value, count]) => ({ value, count }));
  }, [acikCol, data, filters, columns]);

  const gorunenSecenekler = useMemo(() => {
    if (!filtreArama.trim()) return filtreSecenekleri;
    const q = filtreArama.toLowerCase();
    return filtreSecenekleri.filter((o) => o.value.toLowerCase().includes(q));
  }, [filtreSecenekleri, filtreArama]);

  function filtreAcKapa(key: string, e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (acikFiltre?.key === key) { setAcikFiltre(null); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const genislik = 264;
    setFiltreArama("");
    setAcikFiltre({
      key,
      top: r.bottom + 6,
      left: Math.max(8, Math.min(r.left - 12, window.innerWidth - genislik - 8)),
    });
  }

  function secimIsaretliMi(key: string, value: string): boolean {
    const set = filters[key];
    return !set || set.size === 0 ? true : set.has(value);
  }

  function degerToggle(key: string, value: string) {
    const tumDegerler = filtreSecenekleri.map((o) => o.value);
    setFilters((prev) => {
      const cur = prev[key];
      let next: Set<string>;
      if (!cur || cur.size === 0) {
        // Filtre yokken bir değeri kaldırmak = diğer tüm değerler seçili kalır
        next = new Set(tumDegerler.filter((v) => v !== value));
      } else {
        next = new Set(cur);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        // Tüm değerler yeniden seçildiyse filtre etkisiz hale gelir
        if (next.size >= tumDegerler.length && tumDegerler.every((v) => next.has(v))) next = new Set();
      }
      return { ...prev, [key]: next };
    });
    setPage(1);
  }

  function sutunFiltreTemizle(key: string) {
    setFilters((prev) => ({ ...prev, [key]: new Set() }));
    setPage(1);
  }

  function tumFiltreleriTemizle() {
    setFilters({});
    setAcikFiltre(null);
    setPage(1);
  }

  function handleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortKey(null); setSortDir(null); }
      else setSortDir("asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
  }

  function getPageNumbers(): (number | "...")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (safePage > 3) pages.push("...");
    for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
      pages.push(i);
    }
    if (safePage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  const py = compact ? "py-2.5" : "py-3.5";
  const aktifFiltreSayisi = Object.values(filters).filter((s) => s.size > 0).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      {(searchable || toolbar || hasActiveFilters) && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-wrap">
          {searchable && (
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              />
            </div>
          )}
          {toolbar}
          {hasActiveFilters && (
            <button
              onClick={tumFiltreleriTemizle}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
            >
              <Filter size={11} />
              {aktifFiltreSayisi} sütunda filtre aktif — Temizle
              <X size={12} />
            </button>
          )}
          {search && (
            <span className="text-xs text-slate-400 ml-auto">{total} sonuç</span>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="divide-y divide-slate-50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <div className="w-6 h-3 bg-slate-100 rounded animate-pulse" />
              <div className="flex-1 h-3 bg-slate-100 rounded animate-pulse" />
              <div className="w-28 h-3 bg-slate-100 rounded animate-pulse" />
              <div className="w-16 h-3 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : pageData.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={
            search
              ? `"${search}" için sonuç bulunamadı`
              : hasActiveFilters
              ? "Filtrelerle eşleşen kayıt bulunamadı"
              : emptyTitle
          }
          description={
            search
              ? "Farklı bir arama terimi deneyin."
              : hasActiveFilters
              ? "Sütun başlıklarındaki filtreleri gevşetin veya temizleyin."
              : (emptyDescription ?? "")
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-10">#</th>
                {columns.map((col) => {
                  const filtreAktif = (filters[col.key]?.size ?? 0) > 0;
                  const filtreButonu = col.filterValue ? (
                    <button
                      onClick={(e) => filtreAcKapa(col.key, e)}
                      title="Filtrele"
                      className={`p-0.5 rounded transition-colors ${
                        filtreAktif
                          ? "text-indigo-600 bg-indigo-100"
                          : "text-slate-300 hover:text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      <Filter size={11} fill={filtreAktif ? "currentColor" : "none"} />
                    </button>
                  ) : null;
                  return (
                    <th
                      key={col.key}
                      style={col.width ? { width: col.width } : undefined}
                      onClick={col.sortValue ? () => handleSort(col.key) : undefined}
                      className={[
                        "px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider",
                        col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : "text-left",
                        col.sortValue ? "cursor-pointer select-none hover:text-slate-600 transition-colors" : "",
                      ].join(" ")}
                    >
                      <span className={`inline-flex items-center gap-1 ${
                        col.align === "center" ? "justify-center" : col.align === "right" ? "justify-end" : ""
                      }`}>
                        {col.header}
                        {col.sortValue && (
                          sortKey === col.key && sortDir === "asc" ? (
                            <ChevronUp size={12} className="text-indigo-600" />
                          ) : sortKey === col.key && sortDir === "desc" ? (
                            <ChevronDown size={12} className="text-indigo-600" />
                          ) : (
                            <ChevronsUpDown size={12} className="text-slate-300" />
                          )
                        )}
                        {filtreButonu}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pageData.map((row, i) => (
                <tr key={rowKey(row)} className="hover:bg-slate-50/60 transition-colors">
                  <td className={`px-4 ${py} text-sm text-slate-400 tabular-nums`}>{start + i + 1}</td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 ${py} ${
                        col.align === "center" ? "text-center" : col.align === "right" ? "text-right" : ""
                      }`}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Excel benzeri sütun filtre menüsü (overflow kırpmasına takılmamak için fixed) */}
      {acikFiltre && acikCol && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAcikFiltre(null)} />
          <div
            className="fixed z-50 w-[264px] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
            style={{ top: acikFiltre.top, left: acikFiltre.left }}
          >
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={filtreArama}
                  onChange={(e) => setFiltreArama(e.target.value)}
                  placeholder="Değer ara..."
                  className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                />
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(filters[acikFiltre.key]?.size ?? 0) === 0}
                  onChange={() => sutunFiltreTemizle(acikFiltre.key)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                Tümünü Seç
              </label>
              {(filters[acikFiltre.key]?.size ?? 0) > 0 && (
                <button
                  onClick={() => sutunFiltreTemizle(acikFiltre.key)}
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800"
                >
                  Temizle
                </button>
              )}
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {gorunenSecenekler.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-400">Eşleşen değer yok</p>
              ) : (
                gorunenSecenekler.map((o) => (
                  <label
                    key={o.value}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={secimIsaretliMi(acikFiltre.key, o.value)}
                      onChange={() => degerToggle(acikFiltre.key, o.value)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />
                    <span className="flex-1 truncate">{o.value}</span>
                    <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{o.count}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400">
              {start + 1}–{Math.min(start + pageSize, total)} / <span className="font-medium text-slate-600">{total}</span> kayıt
            </p>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s} / sayfa</option>
              ))}
            </select>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              {getPageNumbers().map((p, idx) =>
                p === "..." ? (
                  <span key={`e${idx}`} className="px-1.5 text-xs text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-medium transition-colors ${
                      p === safePage ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
