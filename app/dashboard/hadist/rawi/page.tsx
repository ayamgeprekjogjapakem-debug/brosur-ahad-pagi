'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Book, Plus, Trash2, Search, Filter, Settings2, Edit3, Eye, Upload, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function MasterKitabPage() {
  const [rawiList, setRawiList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const supabase = createClient();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    fetchRawiList();
  }, []);

  const fetchRawiList = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hadist/rawi');
      const data = await res.json();
      if (res.ok && data.rawi) {
        setRawiList(data.rawi.filter((rw: any) => rw.kategori_rawi === 'mukharij'));
      }
    } catch (e) {
      console.error('Error fetching rawi:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRawi = useMemo(() => {
    if (!searchQuery.trim()) return rawiList;
    const lowerQ = searchQuery.toLowerCase();
    return rawiList.filter(rw => 
      rw.nama_rawi?.toLowerCase().includes(lowerQ) ||
      rw.nama_arab?.toLowerCase().includes(lowerQ)
    );
  }, [rawiList, searchQuery]);

  const handleResetAllRawi = async () => {
    const confirmMsg = 'PERINGATAN SANGAT BERBAHAYA!\n\nApakah Anda YAKIN ingin menghapus SELURUH data Kitab dan Perawi dari database?\n\nSemua data akan terhapus dan tidak dapat dikembalikan.';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/hadist/rawi/reset`, { method: 'DELETE' });
      if (res.ok) {
        alert('Seluruh data Rawi/Kitab berhasil dikosongkan.');
        fetchRawiList();
      } else {
        const data = await res.json();
        alert(`Gagal reset data: ${data.error}`);
      }
    } catch (e) {
      console.error('Error reset rawi:', e);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Amiri:wght@400;700&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .arabic-text { font-family: 'Amiri', serif; direction: rtl; }
      `}} />

      <div className="p-5 sm:p-7 space-y-6 font-jakarta text-slate-800 bg-slate-50/60 min-h-full">
        
        {/* Hero Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-gradient-to-br from-blue-100/40 to-indigo-50/10 rounded-full pointer-events-none blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-semibold mb-1">
              <Book className="w-4 h-4" />
              <span>Master Data Referensi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Koleksi Kitab Hadist</h1>
            <p className="text-sm text-slate-500 mt-1">Kelola data Mukharij (Imam Perawi) yang menjadi sumber rujukan utama hadist.</p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 relative z-10">
            <button 
              onClick={handleResetAllRawi}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 shadow-sm transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset Data Rawi
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm shadow-blue-600/30 transition">
              <Plus className="w-4 h-4" />
              Tambah Kitab Baru
            </button>
          </div>
        </div>

        {/* DATA TABLE SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Daftar Kitab Induk (Kutubus Sittah & Lainnya)</h3>
              <p className="text-xs text-slate-400 mt-0.5">Total {rawiList.length} kitab rujukan terdaftar di dalam database.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cari nama kitab..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs py-1.5 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-56"
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
                  <th className="py-3 px-6">Nama Kitab / Imam</th>
                  <th className="py-3 px-6">Tulisan Arab</th>
                  <th className="py-3 px-6">Kredibilitas</th>
                  <th className="py-3 px-6">Total Hadist Arsip</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      Memuat data kitab...
                    </td>
                  </tr>
                ) : filteredRawi.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      Tidak ada data kitab ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredRawi.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((rw) => (
                    <tr key={rw.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 align-middle">
                        <div className="font-bold text-slate-900 text-sm">{rw.nama_rawi}</div>
                        <span className="text-[11px] text-slate-400 max-w-[250px] line-clamp-1 mt-0.5">{rw.biografi || 'Tanpa biografi khusus'}</span>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        {rw.nama_arab ? (
                          <span className="arabic-text text-slate-800 text-[15px] font-semibold">{rw.nama_arab}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <span className="px-2.5 py-1 rounded-full font-medium text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          {rw.kredibilitas || 'Thiqah'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-700 align-middle">
                        {rw.total_hadist || 0} Riwayat
                      </td>
                      <td className="py-4 px-6 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Lihat Detail">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Edit Data">
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

          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Menampilkan <b className="font-semibold text-slate-700">
                {filteredRawi.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredRawi.length)}
              </b> dari <b className="font-semibold text-slate-700">{filteredRawi.length}</b> kitab mukharij
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || filteredRawi.length === 0}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700 px-3">
                {currentPage} / {Math.max(1, Math.ceil(filteredRawi.length / itemsPerPage))}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredRawi.length / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(filteredRawi.length / itemsPerPage) || filteredRawi.length === 0}
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
