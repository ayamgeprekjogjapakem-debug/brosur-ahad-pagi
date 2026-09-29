'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Plus, Search, Database, FolderArchive, FileText, ChevronRight, ChevronLeft, BookOpen, Eye } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

export default function Hadist9ImamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get('tab') as 'hadist_chm' | 'folder' | 'vektor') || 'hadist_chm';
  
  const [activeTab, setActiveTab] = useState<'hadist_chm' | 'folder' | 'vektor'>(initialTab);
  const [hadists, setHadists] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [vektors, setVektors] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalHadists, setTotalHadists] = useState(0);
  const itemsPerPage = 50;
  
  const [syncStatus, setSyncStatus] = useState({ total: 0, synced: 0, unsynced: 0 });
  const [isVectorSyncing, setIsVectorSyncing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const changeTab = (tab: 'hadist_chm' | 'folder' | 'vektor') => {
    router.push(`?tab=${tab}`);
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(search);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const fetchHadists = async () => {
    setLoading(true);
    let query = supabase
      .from('hadist_chm')
      .select('id, judul, tahun, created_at, folders_hadist(name)', { count: 'exact' })
      .order('id', { ascending: true });
      
    if (searchTerm) {
      query = query.ilike('judul', `%${searchTerm}%`);
    }
    
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    const { data, count, error } = await query.range(from, to);
    
    if (error) {
      console.error('Fetch Hadist Error:', error);
      alert('Error fetching data: ' + error.message);
    }
    
    if (data) setHadists(data);
    if (count !== null) setTotalHadists(count);
    
    setLoading(false);
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/ai/sync-status?type=hadist_chm');
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFolders = async () => {
    try {
      const { data } = await supabase.from('folders_hadist').select('id, name, created_at');
      if (data) setFolders(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVektors = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hadist_chm_chunks')
      .select('id, judul_hadist, content')
      .limit(30)
      .order('created_at', { ascending: false });
      
    if (data) setVektors(data);
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'hadist_chm') {
      fetchHadists();
    } else if (activeTab === 'folder') {
      fetchFolders();
    } else if (activeTab === 'vektor') {
      fetchVektors();
      fetchSyncStatus();
    }
  }, [activeTab, currentPage, searchTerm]);

  const handleSyncAI = async () => {
    setIsVectorSyncing(true);
    try {
      await fetch('/api/ai/generate-chunks?type=hadist_chm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      fetchSyncStatus();
      fetchVektors();
    } catch (err) {
      console.error(err);
    } finally {
      setIsVectorSyncing(false);
    }
  };

  const renderChmCode = (id: string) => {
    // Pola umum Kitab 9 Imam: H1K01B01
    const match = id.match(/^H(\d+)K(\d+)(?:B(\d+))?/i);
    if (match) {
      const buku = match[1];
      const kitab = parseInt(match[2], 10);
      const hadistNo = match[3] ? parseInt(match[3], 10) : null;
      return (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100/80 px-2 py-0.5 rounded-md w-fit border border-zinc-200 uppercase tracking-wider">
            Buku {buku} • Kitab {kitab}
          </span>
          {hadistNo && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md w-fit border border-emerald-200">
              Hadist No. {hadistNo}
            </span>
          )}
        </div>
      );
    }
    // Fallback jika tidak sesuai skema
    return <span className="text-xs text-zinc-500 font-mono bg-zinc-50 px-2 py-1 rounded border border-zinc-100">{id}</span>;
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#fbfbfd] p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header - Apple Style */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 mb-2">
              Koleksi <span className="text-emerald-600">Hadist</span>
            </h1>
            <p className="text-zinc-500 font-medium">Manajemen perpustakaan kitab dan vektorisasi AI.</p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'vektor' && (
              <button 
                onClick={handleSyncAI}
                disabled={isVectorSyncing || syncStatus.unsynced === 0}
                className="bg-zinc-900 text-white px-6 py-2.5 rounded-full font-medium flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-md disabled:opacity-50"
              >
                {isVectorSyncing ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                {isVectorSyncing ? 'Menyinkronkan...' : syncStatus.unsynced > 0 ? `Sinkron AI (${syncStatus.unsynced})` : 'AI Tersinkron'}
              </button>
            )}
            <Link 
              href="/dashboard/hadist9imam/search" 
              className="bg-white border border-emerald-200 text-emerald-700 px-6 py-2.5 rounded-full font-medium flex items-center gap-2 hover:bg-emerald-50 transition-all shadow-sm"
            >
              <Search size={16} /> Cari Hadist
            </Link>
            <Link 
              href="/dashboard/hadist9imam/upload" 
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-full font-medium flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-md shadow-emerald-500/20"
            >
              <Plus size={16} /> Upload Kitab
            </Link>
          </div>
        </div>

        {/* Apple Style Pill Tabs */}
        <div className="flex bg-zinc-200/50 p-1 rounded-2xl w-fit mb-8 border border-black/[0.02]">
          <button 
            onClick={() => changeTab('hadist_chm')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'hadist_chm' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <FileText size={16} /> Hadist {activeTab === 'hadist_chm' && <span className="ml-1 bg-zinc-100 text-zinc-500 py-0.5 px-2 rounded-md text-xs">{totalHadists}</span>}
          </button>
          <button 
            onClick={() => changeTab('folder')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'folder' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <FolderArchive size={16} /> Kategori {activeTab === 'folder' && <span className="ml-1 bg-zinc-100 text-zinc-500 py-0.5 px-2 rounded-md text-xs">{folders.length}</span>}
          </button>
          <button 
            onClick={() => changeTab('vektor')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'vektor' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <Database size={16} /> Vektor AI {activeTab === 'vektor' && <span className="ml-1 bg-emerald-100 text-emerald-700 py-0.5 px-2 rounded-md text-xs">{syncStatus.synced}</span>}
          </button>
        </div>

        {/* Content Area - Glassmorphism Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-black/[0.04] rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
          
          {(activeTab === 'hadist_chm' || activeTab === 'vektor') && (
            <div className="p-4 border-b border-black/[0.03]">
              <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Cari berdasarkan judul..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-50/50 border border-zinc-200 rounded-full py-2.5 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
                <p className="text-sm font-medium">Memuat data...</p>
              </div>
            ) : activeTab === 'hadist_chm' ? (
              <>
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-black/[0.03]">
                    <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-40">Referensi CHM</th>
                    <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Judul Hadist</th>
                    <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tahun</th>
                    <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kategori</th>
                    <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.02]">
                  {hadists.map((h, idx) => (
                    <tr key={h.id} className="hover:bg-zinc-50/30 transition-colors">
                      <td className="p-4 align-top">
                        {renderChmCode(h.id)}
                      </td>
                      <td className="p-4 text-sm font-medium text-zinc-900 align-top">{h.judul}</td>
                      <td className="p-4 text-sm text-zinc-500 align-top">{h.tahun || '-'}</td>
                      <td className="p-4 text-sm text-zinc-500 align-top">
                        {h.folders_hadist ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium">
                            <FolderArchive size={12}/> {h.folders_hadist.name}
                          </span>
                        ) : (
                          <span className="italic text-zinc-400 text-xs">Tanpa Kategori</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-right align-top">
                        <Link 
                          href={`/dashboard/hadist9imam/${h.id}`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {hadists.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-400 text-sm">Tidak ada data hadist ditemukan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
              {/* Pagination Controls */}
              {totalHadists > itemsPerPage && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-black/[0.03] bg-zinc-50/30">
                  <span className="text-sm text-zinc-500">
                    Menampilkan <span className="font-semibold text-zinc-900">{(currentPage - 1) * itemsPerPage + 1}</span> hingga <span className="font-semibold text-zinc-900">{Math.min(currentPage * itemsPerPage, totalHadists)}</span> dari <span className="font-semibold text-zinc-900">{totalHadists}</span> hadist
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-medium text-zinc-700 px-2">
                      Hal {currentPage} dari {Math.ceil(totalHadists / itemsPerPage)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalHadists / itemsPerPage), p + 1))}
                      disabled={currentPage === Math.ceil(totalHadists / itemsPerPage)}
                      className="p-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-white"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
              </>
            ) : activeTab === 'folder' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 bg-zinc-50/30">
                {folders.map(f => (
                  <div key={f.id} className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <BookOpen className="w-6 h-6 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-zinc-900">{f.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1">Dibuat: {new Date(f.created_at).toLocaleDateString('id-ID')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/50 border-b border-black/[0.03]">
                    <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Judul / Sumber</th>
                    <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Cuplikan Teks (Vector Chunk)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.02]">
                  {vektors.map((v, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/30 transition-colors">
                      <td className="p-4 text-sm font-medium text-emerald-700 w-1/4 align-top">{v.judul_hadist}</td>
                      <td className="p-4 text-sm text-zinc-600 leading-relaxed"><span className="line-clamp-3">{v.content}</span></td>
                    </tr>
                  ))}
                  {vektors.length === 0 && (
                    <tr>
                      <td colSpan={2} className="p-8 text-center text-zinc-400 text-sm">Belum ada vektor AI yang dihasilkan. Sinkronkan sekarang!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Pagination for Hadist */}
          {activeTab === 'hadist_chm' && totalHadists > itemsPerPage && (
            <div className="p-4 border-t border-black/[0.03] flex items-center justify-between bg-zinc-50/30">
              <span className="text-sm text-zinc-500">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalHadists)} dari {totalHadists}
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-lg bg-white border border-zinc-200 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <button 
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage * itemsPerPage >= totalHadists}
                  className="px-4 py-2 rounded-lg bg-white border border-zinc-200 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
