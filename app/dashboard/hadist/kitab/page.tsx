'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, BookOpen, Search, ShieldCheck, ListOrdered, Loader2, Book, RefreshCw } from 'lucide-react';
import { KITAB_CATALOG, resolveKitabFromRawi } from '@/utils/kitabCatalog';

interface KitabRow {
  slug: string;
  nama: string;
  title: string;
  desc: string;
  rank: number;
  isKutubutTisah: boolean;
  count: number;
}

export default function ListKitabPage() {
  const [kitabRows, setKitabRows] = useState<KitabRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'tisah' | 'tambahan' | 'has_data'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, itemsPerPage]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hadist/items?sumber_jenis=hadist', { cache: 'no-store' });
      const data = await res.json();

      // Mulai dengan seluruh kitab standar di katalog (Kutubut Tis'ah + Mu'tabarah)
      const map = new Map<string, KitabRow>();
      for (const k of KITAB_CATALOG) {
        map.set(k.id, {
          slug: k.id,
          nama: k.nama,
          title: k.title,
          desc: k.desc,
          rank: k.rank,
          isKutubutTisah: k.isKutubutTisah,
          count: 0,
        });
      }

      // Tambahkan & hitung SEMUA rawi_kitab yang ada di database secara dinamis
      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          const raw = (item.rawi_kitab || '').trim();
          if (raw.toLowerCase().includes('qur')) continue;

          const resolved = resolveKitabFromRawi(raw);
          const existing = map.get(resolved.slug);
          if (existing) {
            existing.count += 1;
          } else {
            map.set(resolved.slug, {
              ...resolved,
              count: 1,
            });
          }
        }
      }

      // Tampilkan:
      // 1. Semua Kutubut Tis'ah (#1 - #9) selalu tampil di urutan atas
      // 2. Semua kitab tambahan yang ada di katalog ATAU muncul di database, diurutkan berdasarkan jumlah hadits terbanyak lalu rank
      const rows = Array.from(map.values()).sort((a, b) => {
        if (a.isKutubutTisah && b.isKutubutTisah) return a.rank - b.rank;
        if (a.isKutubutTisah) return -1;
        if (b.isKutubutTisah) return 1;
        if (a.slug === 'tidak-dikenal') return 1;
        if (b.slug === 'tidak-dikenal') return -1;
        if (b.count !== a.count) return b.count - a.count;
        if (a.rank !== b.rank) return a.rank - b.rank;
        return a.nama.localeCompare(b.nama);
      });

      setKitabRows(rows);
    } catch (e) {
      console.error('Error loading kitab list:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalHadits = useMemo(() => kitabRows.reduce((s, r) => s + r.count, 0), [kitabRows]);
  const kitabWithDataCount = useMemo(() => kitabRows.filter(r => r.count > 0).length, [kitabRows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return kitabRows.filter(r => {
      if (filterType === 'tisah' && !r.isKutubutTisah) return false;
      if (filterType === 'tambahan' && r.isKutubutTisah) return false;
      if (filterType === 'has_data' && r.count === 0) return false;
      if (!q) return true;
      return (
        r.nama.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q)
      );
    });
  }, [kitabRows, searchQuery, filterType]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + itemsPerPage);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}} />

      <div className="p-4 sm:p-6 space-y-5 font-jakarta text-slate-800 bg-slate-50/70 min-h-full">
        {/* Header + Statistik */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-bold mb-1">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Daftar Semua Kitab Hadits</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Koleksi Lengkap Kitab Hadits
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Menampilkan seluruh Kutubut Tis&apos;ah dan seluruh kitab perawi tambahan yang tersimpan di database.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchStats}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-xl transition cursor-pointer w-fit"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                filterType === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
              }`}
            >
              <p className={`text-[11px] font-bold uppercase ${filterType === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>Total Kitab</p>
              <p className="text-2xl font-black mt-0.5">{loading ? '—' : kitabRows.length}</p>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('tisah')}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                filterType === 'tisah' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50/60 border-emerald-200/70 hover:bg-emerald-100/60'
              }`}
            >
              <p className={`text-[11px] font-bold uppercase ${filterType === 'tisah' ? 'text-emerald-100' : 'text-emerald-700'}`}>Kutubut Tis&apos;ah</p>
              <p className={`text-2xl font-black mt-0.5 ${filterType === 'tisah' ? 'text-white' : 'text-emerald-900'}`}>9</p>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('has_data')}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                filterType === 'has_data' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50/60 border-blue-200/70 hover:bg-blue-100/60'
              }`}
            >
              <p className={`text-[11px] font-bold uppercase ${filterType === 'has_data' ? 'text-blue-100' : 'text-blue-700'}`}>Kitab Terisi</p>
              <p className={`text-2xl font-black mt-0.5 ${filterType === 'has_data' ? 'text-white' : 'text-blue-900'}`}>
                {loading ? '—' : kitabWithDataCount}
              </p>
            </button>

            <div className="p-3.5 rounded-xl border bg-amber-50/60 border-amber-200/70">
              <p className="text-[11px] font-bold uppercase text-amber-700">Total Hadits</p>
              <p className="text-2xl font-black mt-0.5 text-amber-900">{loading ? '—' : totalHadits}</p>
            </div>
          </div>
        </div>

        {/* Tabel Semua Kitab */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <input
                  type="text"
                  placeholder="Cari nama kitab atau imam..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="all">Semua Kitab ({kitabRows.length})</option>
                <option value="has_data">Yang Ada Haditsnya ({kitabWithDataCount})</option>
                <option value="tisah">Kutubut Tis&apos;ah (9)</option>
                <option value="tambahan">Kitab Tambahan ({Math.max(0, kitabRows.length - 9)})</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
              <ListOrdered className="w-4 h-4 text-slate-400" />
              <span>{filteredRows.length} kitab ditampilkan</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-5 w-20 text-center">No</th>
                  <th className="py-3.5 px-5 w-64">Nama Kitab &amp; Imam</th>
                  <th className="py-3.5 px-5">Kategori &amp; Deskripsi</th>
                  <th className="py-3.5 px-5 w-32 text-center">Tersimpan</th>
                  <th className="py-3.5 px-5 w-28 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center text-slate-400 font-medium">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                      Memuat seluruh koleksi kitab...
                    </td>
                  </tr>
                ) : paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-14 text-center text-slate-400">
                      Tidak ada kitab yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((kitab, index) => (
                    <tr key={kitab.slug} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-5 align-middle text-center">
                        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border font-bold text-xs ${
                          kitab.isKutubutTisah
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-slate-100 border-slate-200 text-slate-600'
                        }`}>
                          #{startIndex + index + 1}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 align-middle">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            kitab.isKutubutTisah ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {kitab.isKutubutTisah ? <ShieldCheck className="w-4 h-4" /> : <Book className="w-4 h-4" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {kitab.slug === 'tidak-dikenal' ? kitab.nama : `HR. ${kitab.nama}`}
                            </div>
                            <span className="text-[11px] text-slate-500">{kitab.title}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 align-middle">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            kitab.isKutubutTisah
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {kitab.isKutubutTisah ? "Kutubut Tis'ah" : 'Kitab Tambahan'}
                          </span>
                          <p className="text-slate-600">{kitab.desc}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 align-middle text-center">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                          kitab.count > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          {kitab.count} hadits
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right align-middle">
                        <Link
                          href={`/dashboard/hadist/kitab/${encodeURIComponent(kitab.slug)}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition shadow-2xs"
                        >
                          Lihat <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                Menampilkan{' '}
                <strong className="text-slate-700">
                  {filteredRows.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredRows.length)}
                </strong>{' '}
                dari <strong className="text-slate-700">{filteredRows.length}</strong> kitab
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value={10}>10 / hal</option>
                <option value={15}>15 / hal</option>
                <option value={25}>25 / hal</option>
                <option value={50}>50 / hal</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-3 py-1.5 font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 font-semibold cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
