'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Tags, Plus, Search, Eye, Edit3, Trash2, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function TemaKelompokPage() {
  const [kelompokList, setKelompokList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const supabase = createClient();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    fetchKelompok();
  }, []);

  const fetchKelompok = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hadist/kelompok');
      const data = await res.json();
      if (res.ok && data.kelompok) {
        setKelompokList(data.kelompok || []);
      }
    } catch (e) {
      console.error('Error fetching kelompok:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllKelompok = async () => {
    const confirmMsg = 'PERINGATAN!\n\nApakah Anda YAKIN ingin menghapus SELURUH data Kelompok/Tema dari database?\n\nSemua tema akan terhapus.';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/hadist/kelompok/reset', { method: 'DELETE' });
      if (res.ok) {
        alert('Seluruh data Kelompok/Tema berhasil dikosongkan.');
        fetchKelompok();
      } else {
        const data = await res.json();
        alert(`Gagal reset data: ${data.error}`);
      }
    } catch (e) {
      console.error('Error reset kelompok:', e);
    }
  };

  const filteredKelompok = useMemo(() => {
    if (!searchQuery.trim()) return kelompokList;
    const lowerQ = searchQuery.toLowerCase();
    return kelompokList.filter(k => 
      k.nama_kelompok?.toLowerCase().includes(lowerQ) ||
      k.deskripsi?.toLowerCase().includes(lowerQ)
    );
  }, [kelompokList, searchQuery]);

  // Helper to map DB color string to Tailwind classes
  const getBadgeColors = (colorStr: string) => {
    const map: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      amber: 'bg-amber-50 text-amber-700 border-amber-200',
      rose: 'bg-rose-50 text-rose-700 border-rose-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    };
    return map[colorStr] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Amiri:wght@400;700&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}} />

      <div className="p-5 sm:p-7 space-y-6 font-jakarta text-slate-800 bg-slate-50/60 min-h-full">
        
        {/* Hero Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-gradient-to-br from-amber-100/40 to-orange-50/10 rounded-full pointer-events-none blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold mb-1">
              <Tags className="w-4 h-4" />
              <span>Manajemen Label & Kategori</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Kelompok / Tema Dalil</h1>
            <p className="text-sm text-slate-500 mt-1">Kelola kategori tematik untuk memudahkan pengelompokan hadist dalam brosur.</p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 relative z-10">
            <button 
              onClick={handleResetAllKelompok}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 shadow-sm transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Data Tema
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm shadow-amber-600/30 transition">
              <Plus className="w-4 h-4" />
              Buat Tema Baru
            </button>
          </div>
        </div>

        {/* DATA TABLE SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Daftar Tema Pengelompokan</h3>
              <p className="text-xs text-slate-400 mt-0.5">Total {kelompokList.length} tema aktif digunakan.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cari nama tema..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs py-1.5 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 w-56"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              </div>
            </div>
          </div>

          {/* Table View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/70">
                  <th className="py-3 px-6">Nama Kelompok / Tema</th>
                  <th className="py-3 px-6">Deskripsi</th>
                  <th className="py-3 px-6 text-center">Preview Label</th>
                  <th className="py-3 px-6 text-center">Total Hadist Terkait</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      Memuat daftar kelompok...
                    </td>
                  </tr>
                ) : filteredKelompok.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      Tidak ada tema ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredKelompok.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900 align-middle">
                        {k.nama_kelompok}
                      </td>
                      <td className="py-4 px-6 max-w-sm align-middle">
                        <p className="text-slate-500 truncate">
                          {k.deskripsi || '-'}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-center align-middle">
                        <span className={`px-2.5 py-1 rounded-full font-semibold text-[11px] border ${getBadgeColors(k.warna_badge || 'slate')}`}>
                          {k.nama_kelompok}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-slate-700 align-middle">
                        {k.stats?.totalHadist || 0}
                      </td>
                      <td className="py-4 px-6 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Tema">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition" title="Hapus Tema">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Menampilkan <b className="font-semibold text-slate-700">
                {filteredKelompok.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredKelompok.length)}
              </b> dari <b className="font-semibold text-slate-700">{filteredKelompok.length}</b> tema pengelompokan
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || filteredKelompok.length === 0}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700 px-3">
                {currentPage} / {Math.max(1, Math.ceil(filteredKelompok.length / itemsPerPage))}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredKelompok.length / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(filteredKelompok.length / itemsPerPage) || filteredKelompok.length === 0}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
