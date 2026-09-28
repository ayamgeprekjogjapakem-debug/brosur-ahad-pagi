'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Book, Search, Loader2, ArrowLeft, Hash, Edit3, Eye, Filter
} from 'lucide-react';
import { motion } from 'framer-motion';

const KITAB_INFO: Record<string, { nama: string, rank: number, title: string }> = {
  'bukhari': { nama: 'Bukhari', rank: 1, title: 'Shahih Bukhari' },
  'muslim': { nama: 'Muslim', rank: 2, title: 'Shahih Muslim' },
  'abu-daud': { nama: 'Abu Daud', rank: 3, title: 'Sunan Abu Daud' },
  'tirmidzi': { nama: 'Tirmidzi', rank: 4, title: 'Sunan At-Tirmidzi' },
  'nasai': { nama: 'Nasai', rank: 5, title: 'Sunan An-Nasai' },
  'ibnu-majah': { nama: 'Ibnu Majah', rank: 6, title: 'Sunan Ibnu Majah' },
  'ahmad': { nama: 'Ahmad', rank: 7, title: 'Musnad Ahmad' },
  'malik': { nama: 'Malik', rank: 8, title: 'Al-Muwaththa Malik' },
  'darimi': { nama: 'Darimi', rank: 9, title: 'Sunan Ad-Darimi' },
  'lainnya': { nama: 'Lainnya', rank: 10, title: 'Kitab Tambahan' }
};

export default function DetailKitabPage() {
  const { slug } = useParams();
  const [hadistItems, setHadistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const kitabInfo = KITAB_INFO[slug as string] || KITAB_INFO['lainnya'];

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    const fetchHadistItems = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/hadist/items?sumber_jenis=hadist`);
        const data = await res.json();
        
        if (data.items) {
          // Filter out ONLY items matching this kitab
          const myItems = data.items.filter((item: any) => {
            const k = (item.rawi_kitab || '').toLowerCase();
            if (slug === 'lainnya') {
              // Not in top 9
              const isMainKitab = Object.keys(KITAB_INFO).some(id => id !== 'lainnya' && k.includes(KITAB_INFO[id].nama.toLowerCase()));
              return !isMainKitab;
            }
            return k.includes(kitabInfo.nama.toLowerCase());
          });
          setHadistItems(myItems);
        }
      } catch (e) {
        console.error('Error fetching hadist:', e);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchHadistItems();
  }, [slug, kitabInfo.nama]);

  const sortedData = useMemo(() => {
    const lowerQ = searchQuery.toLowerCase();
    const filtered = hadistItems.filter(item => 
      item.kutipan_arab?.toLowerCase().includes(lowerQ) ||
      item.terjemahan?.toLowerCase().includes(lowerQ) ||
      item.no_hadist?.toString().includes(lowerQ)
    );

    // Group by similarity (Theme/Topic) first, then sort by No. Hadist
    return filtered.sort((a, b) => {
      const temaA = (a.kelompok_hadist?.nama_kelompok || 'Z_Tanpa Tema').toLowerCase();
      const temaB = (b.kelompok_hadist?.nama_kelompok || 'Z_Tanpa Tema').toLowerCase();
      
      if (temaA < temaB) return -1;
      if (temaA > temaB) return 1;
      
      const noA = parseInt(a.no_hadist) || 0;
      const noB = parseInt(b.no_hadist) || 0;
      return noA - noB;
    });
  }, [hadistItems, searchQuery]);

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(sortedData.length / itemsPerPage));
  const currentData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Perawi
        </Link>

        {/* Hero Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-gradient-to-br from-emerald-100/40 to-teal-50/10 rounded-full pointer-events-none blur-2xl"></div>
          
          <div className="relative z-10 flex-1">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-semibold mb-1">
              <Book className="w-4 h-4" />
              <span>Detail Koleksi Kitab</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">HR. {kitabInfo.nama}</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              {kitabInfo.title} — Seluruh koleksi dari kitab ini diurutkan dari nomor terkecil hingga terbesar.
            </p>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          
          {/* Table Toolbar */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Data Urutan Hadist</h2>
              <p className="text-xs text-slate-500 mt-1">Menampilkan total <b>{hadistItems.length}</b> hadist dari HR. {kitabInfo.nama}</p>
            </div>
            
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Cari matan atau no hadist..."
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
                  <th className="py-4 px-5 w-24 text-center">No. Hadist</th>
                  <th className="py-4 px-5">Teks Arab & Terjemahan</th>
                  <th className="py-4 px-5 w-48">Tema</th>
                  <th className="py-4 px-5 w-24 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                        <span className="font-semibold text-sm animate-pulse">Memuat data hadist...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                        <Filter className="w-10 h-10 text-slate-200 mb-2" />
                        <span className="font-semibold text-base text-slate-500">Tidak ada data ditemukan</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentData.map((hadist) => (
                    <tr key={hadist.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="py-4 px-5 align-top text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 font-bold text-sm text-emerald-700">
                          {hadist.no_hadist || '?'}
                        </div>
                      </td>
                      <td className="py-4 px-5 max-w-xs sm:max-w-md align-top">
                        <p className="arabic-text text-slate-800 text-[18px] font-semibold mb-2 leading-[2.2] text-right">
                          {hadist.kutipan_arab || 'Tanpa Teks Arab'}
                        </p>
                        <p className="text-slate-600 text-[12px] leading-relaxed italic border-l-2 border-slate-200 pl-3">
                          "{hadist.terjemahan || 'Tanpa Terjemahan'}"
                        </p>
                      </td>
                      <td className="py-4 px-5 align-top">
                        <div className="flex flex-col gap-2 items-start">
                          {hadist.kelompok_hadist?.nama_kelompok ? (
                            <span className="px-2 py-0.5 rounded-full font-medium text-[11px] bg-blue-50 text-blue-700 border border-blue-200/60">
                              {hadist.kelompok_hadist.nama_kelompok}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full font-medium text-[11px] bg-slate-100 text-slate-500 border border-slate-200/60">
                              Tanpa Tema
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right align-top">
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <Link 
                            href={`/dashboard/hadist/kitab/${slug}/${hadist.id}`}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition" 
                            title="Lihat Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Data">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-medium text-slate-500">
              Menampilkan <span className="font-bold text-slate-900">
                {sortedData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
              </span> - <span className="font-bold text-slate-900">
                {Math.min(currentPage * itemsPerPage, sortedData.length)}
              </span> dari <span className="font-bold text-slate-900">{sortedData.length}</span> hadist
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || sortedData.length === 0}
                className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 text-xs font-semibold"
              >
                Sebelumnya
              </button>
              <div className="px-3 py-1.5 text-xs font-bold text-slate-700">
                {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || sortedData.length === 0}
                className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30 text-xs font-semibold"
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
