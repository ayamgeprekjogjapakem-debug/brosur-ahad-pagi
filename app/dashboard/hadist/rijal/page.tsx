'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Users, Plus, Search, Eye, Edit3, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function MasterPerawiPage() {
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
        setRawiList(data.rawi.filter((rw: any) => rw.kategori_rawi !== 'mukharij'));
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
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-gradient-to-br from-purple-100/40 to-fuchsia-50/10 rounded-full pointer-events-none blur-2xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-purple-600 text-xs font-semibold mb-1">
              <Users className="w-4 h-4" />
              <span>Master Data Referensi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Rijalul Hadits</h1>
            <p className="text-sm text-slate-500 mt-1">Daftar profil sahabat nabi dan perawi sanad (Al-Jarh wa At-Ta'dil).</p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 relative z-10">
            <button className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm shadow-purple-600/30 transition">
              <Plus className="w-4 h-4" />
              Tambah Perawi
            </button>
          </div>
        </div>

        {/* DATA TABLE SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Daftar Biografi Sahabat & Perawi Sanad</h3>
              <p className="text-xs text-slate-400 mt-0.5">Total {rawiList.length} riwayat biografi terdaftar.</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Cari nama sahabat..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs py-1.5 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 w-56"
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
                  <th className="py-3 px-6 w-16 text-center">No</th>
                  <th className="py-3 px-6">Nama Perawi & Arab</th>
                  <th className="py-3 px-6">Kategori / Kredibilitas</th>
                  <th className="py-3 px-6 max-w-sm">Biografi Singkat</th>
                  <th className="py-3 px-6 text-center">Total Hadist</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      Memuat data rijalul hadits...
                    </td>
                  </tr>
                ) : filteredRawi.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold text-sm">
                      Tidak ada perawi ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredRawi.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((rw, idx) => (
                    <tr key={rw.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 text-center font-bold text-slate-400 align-middle">
                        {idx + 1}
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="font-bold text-slate-900 text-sm">{rw.nama_rawi}</div>
                        {rw.nama_arab && (
                          <div className="arabic-text text-slate-500 text-[15px] mt-1 font-semibold">{rw.nama_arab}</div>
                        )}
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className="px-2 py-0.5 rounded-full font-medium text-[10px] bg-purple-50 text-purple-700 border border-purple-200/60 uppercase tracking-wider">
                            {rw.kredibilitas || 'Thiqah'}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {rw.kategori_rawi === 'sahabat' ? 'Sahabat Nabi ﷺ' : 'Perawi Sanad'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 max-w-sm align-middle">
                        <p className="text-slate-500 line-clamp-2 leading-relaxed">
                          {rw.biografi || '-'}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-slate-700 align-middle">
                        {rw.total_hadist || 0}
                      </td>
                      <td className="py-4 px-6 text-right align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition" title="Lihat Detail">
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
                {filteredRawi.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredRawi.length)}
              </b> dari <b className="font-semibold text-slate-700">{filteredRawi.length}</b> perawi sanad
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
