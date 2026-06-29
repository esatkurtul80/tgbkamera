"use client";

import { useState, useMemo } from "react";
import {
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import EmptyState from "./EmptyState";

type SortDir = "asc" | "desc" | null;

export interface DataColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  searchValue?: (row: T) => string;
  align?: "left" | "center" | "right";
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  searchPlaceholder?: string;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: string;
  defaultPageSize?: number;
  toolbar?: React.ReactNode;
  compact?: boolean;
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function DataTable<T>({
  data,
  columns,
  rowKey,
  loading = false,
  searchPlaceholder = "Ara...",
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

  const searchable = columns.some((c) => c.searchValue);

  const searchedData = useMemo(() => {
    if (!search.trim()) return data;
    const lower = search.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => col.searchValue?.(row).toLowerCase().includes(lower))
    );
  }, [data, search, columns]);

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

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Toolbar */}
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
        {search && (
          <span className="text-xs text-slate-400 ml-auto">{total} sonuç</span>
        )}
      </div>

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
          title={search ? `"${search}" için sonuç bulunamadı` : emptyTitle}
          description={search ? "Farklı bir arama terimi deneyin." : (emptyDescription ?? "")}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-10">#</th>
                {columns.map((col) => (
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
                    {col.sortValue ? (
                      <span className={`inline-flex items-center gap-1 ${
                        col.align === "center" ? "justify-center" : col.align === "right" ? "justify-end" : ""
                      }`}>
                        {col.header}
                        {sortKey === col.key && sortDir === "asc" ? (
                          <ChevronUp size={12} className="text-indigo-600" />
                        ) : sortKey === col.key && sortDir === "desc" ? (
                          <ChevronDown size={12} className="text-indigo-600" />
                        ) : (
                          <ChevronsUpDown size={12} className="text-slate-300" />
                        )}
                      </span>
                    ) : col.header}
                  </th>
                ))}
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
