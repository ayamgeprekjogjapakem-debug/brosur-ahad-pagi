'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  FileText, Plus, Search, Eye, Edit3, FolderOpen, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function MasterBrosurPage() {
  const [brosurs, setBrosurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const supabase = createClient();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    fetchBrosurs();
  }, []);

  const fetchBrosurs = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('brosur')
        .select('id, judul, tahun, slug, created_at, folder_id, folders(name)')
        .order('tahun', { ascending: false })
        .order('judul', { ascending: true })
        .limit(1000);
      setBrosurs(data || []);
    } catch (e) {
      console.error('Error fetching brosurs:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredBrosurs = useMemo(() => {
    if (!searchQuery.trim()) return brosurs;
    const lowerQ = searchQuery.toLowerCase();
    return brosurs.filter(b => 
      b.judul?.toLowerCase().includes(lowerQ) ||
      b.tahun?.toString().includes(lowerQ) ||
      b.folders?.name?.toLowerCase().includes(lowerQ)
    );
  }, [brosurs, searchQuery]);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}} />

      <div className="p-5 sm:p-7 space-y-6 font-jakarta text-slate-800 bg-slate-50/60 min-h-full">
        
        {/* Hero Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-gradient-to-br from-indigo-100/40 to-blue-50/10 rounded-full pointer-events-none blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold mb-1">
              <FileText className="w-4 h-4" />
              <span>Manajemen Sumber Kajian</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Master Brosur Ahad Pagi</h1>
            <p className="text-sm text-slate-500 mt-1">Kelola arsip PDF dan teks brosur yang menjadi sumber utama penarikan hadist.</p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 relative z-10">
            <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/30 transition">
              <Plus className="w-4 h-4" />
              Upload Brosur
            </button>
          </div>
        </div>

        {/* DATA TABLE SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Daftar Indeks Brosur</h3>
              <p className="text-xs text-slate-400 mt-0.5">Total {brosurs.length} arsip brosur terdaftar di dalam database.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cari judul, tahun, atau folder..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs py-1.5 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-56"
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
                  <th className="py-3 px-6">Judul Brosur</th>
                  <th className="py-3 px-6">Tahun</th>
                  <th className="py-3 px-6">Folder Lokasi</th>
                  <th className="py-3 px-6">Tanggal Upload</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      Memuat data brosur...
                    </td>
                  </tr>
                ) : filteredBrosurs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      Tidak ada data brosur ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredBrosurs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 align-middle">
                        <div className="font-bold text-slate-900 text-sm max-w-sm line-clamp-1">{b.judul}</div>
                        <span className="text-[11px] text-slate-400 mt-0.5 inline-block">/{b.slug}</span>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200/60">
                          {b.tahun || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        {b.folders?.name ? (
                          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                            {b.folders.name}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-500 align-middle">
                        {new Date(b.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-4 px-6 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Lihat Brosur">
                            <Eye className="w-4 h-4" />
                          </button>
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

          <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Menampilkan <b className="font-semibold text-slate-700">
                {filteredBrosurs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredBrosurs.length)}
              </b> dari <b className="font-semibold text-slate-700">{filteredBrosurs.length}</b> brosur
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || filteredBrosurs.length === 0}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-semibold text-slate-700 px-3">
                {currentPage} / {Math.max(1, Math.ceil(filteredBrosurs.length / itemsPerPage))}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredBrosurs.length / itemsPerPage), p + 1))}
                disabled={currentPage >= Math.ceil(filteredBrosurs.length / itemsPerPage) || filteredBrosurs.length === 0}
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
