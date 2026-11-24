'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft, ChevronRight, Search, Users, UserCheck, Star, Loader2, X, BookOpen, RefreshCw, FileText
} from 'lucide-react';

interface SahabatItem {
  id: string;
  nama: string;
  title: string;
  desc: string;
  riwayat: number;
  items: any[];
}

export default function SahabatPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sahabatList, setSahabatList] = useState<SahabatItem[]>([]);
  const [totalHadist, setTotalHadist] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSahabat, setSelectedSahabat] = useState<SahabatItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [modalPage, setModalPage] = useState(1);
  const modalPerPage = 10;

  const fetchSahabat = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hadist/sahabat');
      const data = await res.json();
      if (res.ok && Array.isArray(data.sahabat)) {
        setSahabatList(data.sahabat);
        setTotalHadist(data.total_hadist_extracted || 0);
      }
    } catch (e) {
      console.error('Failed to fetch sahabat stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSahabat();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  const filteredSahabat = sahabatList.filter(s =>
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredSahabat.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedSahabat = filteredSahabat.slice(startIndex, startIndex + itemsPerPage);

  const modalItems = selectedSahabat?.items || [];
  const modalTotalPages = Math.max(1, Math.ceil(modalItems.length / modalPerPage));
  const safeModalPage = Math.min(modalPage, modalTotalPages);
  const paginatedModalItems = modalItems.slice(
    (safeModalPage - 1) * modalPerPage,
    safeModalPage * modalPerPage
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Amiri:wght@400;700&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .arabic-text { font-family: 'Amiri', serif; direction: rtl; }
      `}} />

      <div className="p-5 sm:p-7 space-y-6 font-jakarta text-slate-800 bg-slate-50/60 min-h-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-gradient-to-br from-blue-100/40 to-indigo-50/10 rounded-full pointer-events-none blur-2xl"></div>

          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold mb-1">
              <Users className="w-4 h-4" />
              <span>Perawi Tingkat Pertama (Database Ekstraksi)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Koleksi Sahabat Nabi</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Daftar para Sahabat Nabi ﷺ yang terekam secara otomatis dari hasil ekstraksi hadist brosur (total{' '}
              <strong className="text-slate-700">{sahabatList.length} tokoh</strong> dari{' '}
              <strong className="text-slate-700">{totalHadist} hadist</strong> di database).
            </p>
          </div>

          <button
            type="button"
            onClick={fetchSahabat}
            disabled={loading}
            className="relative z-10 inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/60 text-slate-700 hover:text-blue-700 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer self-start md:self-center"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan Data</span>
          </button>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Urutan Berdasarkan Riwayat Terekstrak</h2>
              <p className="text-xs text-slate-500 mt-1">
                Menampilkan tokoh sahabat dengan jumlah hadist terekstrak terbanyak dari brosur.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Cari nama sahabat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-xs font-semibold text-slate-500">Memuat data perawi sahabat dari database...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70 uppercase tracking-wider">
                    <th className="py-4 px-6 w-24 text-center">Urutan</th>
                    <th className="py-4 px-6 w-64">Nama Sahabat</th>
                    <th className="py-4 px-6">Informasi &amp; Biografi Singkat</th>
                    <th className="py-4 px-6 w-32 text-center">Riwayat Terekstrak</th>
                    <th className="py-4 px-6 w-28 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {paginatedSahabat.map((sahabat, index) => (
                    <tr key={sahabat.id || index} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-4 px-6 align-middle text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 font-bold text-sm text-blue-700 shadow-sm">
                          #{startIndex + index + 1}
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <UserCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{sahabat.nama}</div>
                            <span className="text-xs text-slate-500">{sahabat.title}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <p className="text-slate-600 font-medium">{sahabat.desc}</p>
                      </td>
                      <td className="py-4 px-6 align-middle text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-lg font-extrabold text-slate-800">
                            {sahabat.riwayat.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Riwayat</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right align-middle">
                        <button
                          type="button"
                          onClick={() => {
                            setModalPage(1);
                            setSelectedSahabat(sahabat);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-semibold rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all shadow-sm cursor-pointer"
                        >
                          Lihat <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredSahabat.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                          <Star className="w-10 h-10 text-slate-200 mb-2" />
                          <span className="font-semibold text-base text-slate-500">
                            {sahabatList.length === 0
                              ? 'Belum ada perawi sahabat yang terekstrak di database'
                              : 'Nama sahabat tidak ditemukan'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {!loading && filteredSahabat.length > 0 && (
            <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span className="font-medium">
                  Menampilkan <strong className="text-slate-800">{startIndex + 1}</strong>–
                  <strong className="text-slate-800">{Math.min(startIndex + itemsPerPage, filteredSahabat.length)}</strong> dari{' '}
                  <strong className="text-slate-800">{filteredSahabat.length}</strong> sahabat
                </span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value={10}>10 / hal</option>
                  <option value={20}>20 / hal</option>
                  <option value={50}>50 / hal</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-700">
                  Hal {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Detail Hadist per Sahabat */}
      {selectedSahabat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{selectedSahabat.nama}</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedSahabat.title} • {selectedSahabat.riwayat} Hadist Terekstrak
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSahabat(null)}
                className="p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40">
              {paginatedModalItems.map((item: any, idx: number) => {
                const tahun = item.brosur?.tahun || 2026;
                const slug = item.brosur?.slug || item.brosur_id;
                return (
                  <div key={item.id || idx} className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.perawi_sumber || item.rawi_kitab || 'Hadist'}
                      </span>
                      {item.brosur && (
                        <Link
                          href={`/bap/${tahun}/${encodeURIComponent(slug)}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[260px]">{item.brosur.judul}</span>
                          <BookOpen className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>

                    {item.kutipan_arab && item.kutipan_arab !== '-' && (
                      <p className="arabic-text text-xl leading-[2.2] text-slate-900 text-right">
                        {item.kutipan_arab}
                      </p>
                    )}

                    {item.terjemahan && (
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                        &ldquo;{item.terjemahan}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {modalTotalPages > 1 && (
              <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium">
                  Menampilkan {(safeModalPage - 1) * modalPerPage + 1}–{Math.min(safeModalPage * modalPerPage, modalItems.length)} dari {modalItems.length} hadist
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setModalPage(p => Math.max(1, p - 1))}
                    disabled={safeModalPage === 1}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700">
                    {safeModalPage} / {modalTotalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalPage(p => Math.min(modalTotalPages, p + 1))}
                    disabled={safeModalPage >= modalTotalPages}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
