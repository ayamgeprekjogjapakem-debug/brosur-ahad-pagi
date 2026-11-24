'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Book, Search, Loader2, ArrowLeft, Eye, Filter, FileText
} from 'lucide-react';
import { KITAB_CATALOG, resolveKitabFromRawi } from '@/utils/kitabCatalog';

function parsePositiveInt(val: any): number | null {
  if (val === null || val === undefined) return null;
  const num = parseInt(String(val).replace(/[^\d]/g, ''), 10);
  return !isNaN(num) && num > 0 ? num : null;
}

function extractTakhrijNumbers(item: any): { juz: number | null; hal: number | null; no: number | null } {
  let juz = parsePositiveInt(item.juz);
  let hal = parsePositiveInt(item.halaman);
  let no = parsePositiveInt(item.no_hadist);

  const sourceStr = `${item.perawi_sumber || ''} ${item.terjemahan || ''}`;

  if (juz === null) {
    const jm = sourceStr.match(/(?:juz|jilid)\s*[:=]?\s*(\d+)/i);
    if (jm?.[1]) juz = parsePositiveInt(jm[1]);
  }
  if (hal === null) {
    const hm = sourceStr.match(/(?:hal|hlm|halaman)\.?\s*[:=]?\s*(\d+)/i);
    if (hm?.[1]) hal = parsePositiveInt(hm[1]);
  }
  if (no === null) {
    const nm = sourceStr.match(/(?:no|nomor)\.?\s*[:=]?\s*(\d+)/i);
    if (nm?.[1]) no = parsePositiveInt(nm[1]);
  }

  return { juz, hal, no };
}

export default function DetailKitabPage() {
  const { slug } = useParams();
  const [hadistItems, setHadistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const slugStr = decodeURIComponent(String(slug || ''));
  const catalogMatch = KITAB_CATALOG.find(k => k.id === slugStr);
  const [dynamicKitabInfo, setDynamicKitabInfo] = useState<{ nama: string; title: string } | null>(null);

  const kitabInfo = catalogMatch
    ? { nama: catalogMatch.nama, title: catalogMatch.title }
    : dynamicKitabInfo || (
        slugStr === 'lainnya'
          ? { nama: 'Kitab Lainnya', title: 'Kitab Tambahan di luar Kutubut Tis\'ah' }
          : slugStr === 'tidak-dikenal'
          ? { nama: 'Sumber Tidak Dikenal', title: 'Belum Teridentifikasi Kitabnya' }
          : {
              nama: slugStr.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              title: `Koleksi Hadits ${slugStr.replace(/-/g, ' ')}`,
            }
      );

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchHadistItems = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/hadist/items?sumber_jenis=hadist`, { cache: 'no-store' });
        const data = await res.json();

        if (data.items) {
          let detectedInfo: { nama: string; title: string } | null = null;
          const myItems = data.items
            .filter((item: any) => {
              const raw = (item.rawi_kitab || '').trim();
              if (raw.toLowerCase().includes('qur')) return false;
              const resolved = resolveKitabFromRawi(raw);

              if (slugStr === 'lainnya') {
                return !resolved.isKutubutTisah;
              }
              if (resolved.slug === slugStr) {
                if (!detectedInfo) {
                  detectedInfo = { nama: resolved.nama, title: resolved.title };
                }
                return true;
              }
              return false;
            })
            .map((item: any) => ({
              ...item,
              _takhrij: extractTakhrijNumbers(item),
            }));

          if (detectedInfo) setDynamicKitabInfo(detectedInfo);
          setHadistItems(myItems);
        }
      } catch (e) {
        console.error('Error fetching hadist:', e);
      } finally {
        setLoading(false);
      }
    };
    if (slugStr) fetchHadistItems();
  }, [slugStr]);

  // Filter & Urutkan secara ketat berdasarkan Juz -> Halaman -> No. Hadist
  const sortedData = useMemo(() => {
    const lowerQ = searchQuery.toLowerCase().trim();
    const filtered = hadistItems.filter(item => {
      if (!lowerQ) return true;
      const t = item._takhrij;
      return (
        item.kutipan_arab?.toLowerCase().includes(lowerQ) ||
        item.terjemahan?.toLowerCase().includes(lowerQ) ||
        item.perawi_sumber?.toLowerCase().includes(lowerQ) ||
        t.juz?.toString().includes(lowerQ) ||
        t.hal?.toString().includes(lowerQ) ||
        t.no?.toString().includes(lowerQ)
      );
    });

    const MAX = 9999999;
    return [...filtered].sort((a, b) => {
      const ta = a._takhrij || { juz: null, hal: null, no: null };
      const tb = b._takhrij || { juz: null, hal: null, no: null };

      const juzDiff = (ta.juz ?? MAX) - (tb.juz ?? MAX);
      if (juzDiff !== 0) return juzDiff;

      const halDiff = (ta.hal ?? MAX) - (tb.hal ?? MAX);
      if (halDiff !== 0) return halDiff;

      const noDiff = (ta.no ?? MAX) - (tb.no ?? MAX);
      if (noDiff !== 0) return noDiff;

      return (a.terjemahan || '').localeCompare(b.terjemahan || '');
    });
  }, [hadistItems, searchQuery]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const currentData = sortedData.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Amiri:wght@400;700&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .arabic-text { font-family: 'Amiri', serif; direction: rtl; }
      `}} />

      <div className="p-5 sm:p-7 space-y-6 font-jakarta text-slate-800 bg-slate-50/60 min-h-full">

        <Link href="/dashboard/hadist/kitab" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm w-fit">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Kitab
        </Link>

        {/* Hero Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-gradient-to-br from-emerald-100/40 to-teal-50/10 rounded-full pointer-events-none blur-2xl"></div>

          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold mb-1">
              <Book className="w-4 h-4" />
              <span>Detail Koleksi Kitab</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {slugStr === 'lainnya' ? 'Kitab Lainnya' : `HR. ${kitabInfo.nama}`}
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              {kitabInfo.title} — Diurutkan secara sistematis sesuai urutan <strong>Juz → Halaman → Nomor Hadist</strong>.
            </p>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">

          {/* Table Toolbar */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Data Urutan Hadist</h2>
              <p className="text-xs text-slate-500 mt-1">
                Menampilkan total <b>{hadistItems.length}</b> hadist dari{' '}
                {slugStr === 'lainnya' ? 'Kitab Lainnya' : `HR. ${kitabInfo.nama}`}
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Cari matan, juz, hal, atau no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors shadow-sm"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70 uppercase tracking-wider">
                  <th className="py-4 px-4 w-16 text-center">No.</th>
                  <th className="py-4 px-4 w-36">Juz / Hal / Nomor</th>
                  <th className="py-4 px-5">Teks Arab &amp; Terjemahan</th>
                  <th className="py-4 px-4 w-44">Perawi / Tema</th>
                  <th className="py-4 px-4 w-20 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                        <span className="font-semibold text-sm animate-pulse">Memuat data hadist...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <Filter className="w-10 h-10 text-slate-200 mb-2" />
                        <span className="font-semibold text-base text-slate-500">Tidak ada data ditemukan</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentData.map((hadist, idx) => {
                    const t = hadist._takhrij || { juz: null, hal: null, no: null };
                    return (
                      <tr key={hadist.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-4 px-4 align-top text-center">
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 font-bold text-xs text-slate-700">
                            {startIndex + idx + 1}
                          </div>
                        </td>
                        <td className="py-4 px-4 align-top">
                          <div className="flex flex-col gap-1.5 items-start">
                            {t.juz !== null && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                                Juz {t.juz}
                              </span>
                            )}
                            {t.hal !== null && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px]">
                                Hal. {t.hal}
                              </span>
                            )}
                            {t.no !== null && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[11px]">
                                No. {t.no}
                              </span>
                            )}
                            {t.juz === null && t.hal === null && t.no === null && (
                              <span className="text-[11px] text-slate-400 italic">Tanpa nomor</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5 max-w-xs sm:max-w-lg align-top">
                          <p className="arabic-text text-slate-800 text-[18px] font-semibold mb-2 leading-[2.2] text-right">
                            {hadist.kutipan_arab || 'Tanpa Teks Arab'}
                          </p>
                          <p className="text-slate-600 text-[12px] leading-relaxed italic border-l-2 border-slate-200 pl-3">
                            &ldquo;{hadist.terjemahan || 'Tanpa Terjemahan'}&rdquo;
                          </p>
                          {hadist.brosur && (
                            <div className="mt-2.5">
                              <Link
                                href={`/bap/${hadist.brosur.tahun || 2026}/${encodeURIComponent(hadist.brosur.slug || hadist.brosur_id)}`}
                                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 hover:underline"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Dari: {hadist.brosur.judul}</span>
                              </Link>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 align-top">
                          <div className="flex flex-col gap-1.5 items-start">
                            {hadist.rawi_teratas && (
                              <span className="px-2 py-0.5 rounded-full font-semibold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                {hadist.rawi_teratas}
                              </span>
                            )}
                            {hadist.kelompok_hadist?.nama_kelompok ? (
                              <span className="px-2 py-0.5 rounded-full font-medium text-[11px] bg-blue-50 text-blue-700 border border-blue-200/60">
                                {hadist.kelompok_hadist.nama_kelompok}
                              </span>
                            ) : !hadist.rawi_teratas ? (
                              <span className="px-2 py-0.5 rounded-full font-medium text-[11px] bg-slate-100 text-slate-500 border border-slate-200/60">
                                {hadist.rawi_kitab || 'Umum'}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right align-top">
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <Link
                              href={`/dashboard/hadist/kitab/${slug}/${hadist.id}`}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-medium text-slate-500">
              Menampilkan <span className="font-bold text-slate-900">
                {sortedData.length === 0 ? 0 : startIndex + 1}
              </span> - <span className="font-bold text-slate-900">
                {Math.min(startIndex + itemsPerPage, sortedData.length)}
              </span> dari <span className="font-bold text-slate-900">{sortedData.length}</span> hadist
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1 || sortedData.length === 0}
                className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 text-xs font-semibold cursor-pointer"
              >
                Sebelumnya
              </button>
              <div className="px-3 py-1.5 text-xs font-bold text-slate-700">
                {safePage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages || sortedData.length === 0}
                className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 text-xs font-semibold cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
