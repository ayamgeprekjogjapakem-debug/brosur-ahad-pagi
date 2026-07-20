'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Plus, Edit2, Trash2, Search, Database, FolderArchive, FileText, CheckSquare, Settings } from 'lucide-react';
import Link from 'next/link';

export default function DataBrosurPage() {
  const [activeTab, setActiveTab] = useState<'brosur' | 'folder'>('brosur');
  const [brosurs, setBrosurs] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBrosurs, setTotalBrosurs] = useState(0);
  const itemsPerPage = 50;
  // State untuk Fitur Pindah Masal (Bulk Move)
  const [selectedBrosurs, setSelectedBrosurs] = useState<string[]>([]);
  const [bulkFolderId, setBulkFolderId] = useState<string>('');
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  const [isEmptyingTable, setIsEmptyingTable] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // State untuk Generator Teks Bersih
  const [isGeneratingTeks, setIsGeneratingTeks] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generateLabel, setGenerateLabel] = useState('');

  useEffect(() => {
    // Sinkronisasi Tab dengan URL
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'folder') {
      setActiveTab('folder');
    }
  }, []);

  const changeTab = (tab: 'brosur' | 'folder') => {
    setActiveTab(tab);
    setSelectedBrosurs([]);
    window.history.pushState(null, '', `?tab=${tab}`);
  };
  
  const supabase = createClient();

  // Debounce logic for search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(search);
      setCurrentPage(1); // Reset ke halaman pertama setiap pencarian baru
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const fetchBrosurs = async () => {
    setLoading(true);
    let query = supabase
      .from('brosur')
      .select('id, judul, tahun, slug, created_at, folder_id, folders(name)', { count: 'exact' })
      .order('tahun', { ascending: false });
      
    if (searchTerm) {
      const searchNum = parseInt(searchTerm);
      if (!isNaN(searchNum) && searchNum > 1900 && searchNum < 2100) {
        query = query.or(`judul.ilike.%${searchTerm}%,tahun.eq.${searchNum}`);
      } else {
        query = query.ilike('judul', `%${searchTerm}%`);
      }
    }
    
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    const { data, count } = await query.range(from, to);
    
    if (data) setBrosurs(data);
    if (count !== null) setTotalBrosurs(count);
    
    setLoading(false);
  };

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders-stats');
      const data = await res.json();
      if (data.folders) {
        setFolders(data.folders);
      }
    } catch (err) {
      console.error('Failed to fetch folders with stats', err);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (activeTab === 'brosur') {
      fetchBrosurs();
    }
  }, [currentPage, searchTerm, activeTab]);

  const handleDeleteBrosur = async (id: string, judul: string) => {
    if (!window.confirm(`Yakin ingin menghapus brosur "${judul}"?`)) return;
    setDeletingId(id);
    const { error } = await supabase.from('brosur').delete().eq('id', id);
    if (error) alert(`Gagal menghapus: ${error.message}`);
    else {
      setBrosurs(brosurs.filter(b => b.id !== id));
      setSelectedBrosurs(selectedBrosurs.filter(s => s !== id));
    }
    setDeletingId(null);
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!window.confirm(`Yakin ingin menghapus folder "${name}"?\nPERINGATAN: Pastikan tidak ada brosur di dalam folder ini atau brosur tersebut akan ikut terhapus / kehilangan referensi!`)) return;
    setDeletingId(id);
    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) alert(`Gagal menghapus: ${error.message}`);
    else setFolders(folders.filter(f => f.id !== id));
    setDeletingId(null);
  };

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    (f.description && f.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Bulk Actions Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBrosurs(brosurs.map(b => b.id));
    } else {
      setSelectedBrosurs([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedBrosurs.includes(id)) {
      setSelectedBrosurs(selectedBrosurs.filter(b => b !== id));
    } else {
      setSelectedBrosurs([...selectedBrosurs, id]);
    }
  };

  const handleBulkMove = async () => {
    if (!bulkFolderId) return alert('Silakan pilih folder tujuan terlebih dahulu!');
    if (!window.confirm(`Pindahkan ${selectedBrosurs.length} brosur ke folder terpilih?`)) return;

    setIsUpdatingBulk(true);
    const { error } = await supabase
      .from('brosur')
      .update({ folder_id: bulkFolderId })
      .in('id', selectedBrosurs);

    if (error) {
      alert(`Gagal memindahkan brosur: ${error.message}`);
    } else {
      setSelectedBrosurs([]);
      setBulkFolderId('');
      fetchBrosurs(); // Muat ulang data
    }
    setIsUpdatingBulk(false);
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`PERINGATAN: Yakin ingin menghapus ${selectedBrosurs.length} brosur secara permanen? Data yang dihapus tidak bisa dikembalikan.`)) return;
    
    setIsUpdatingBulk(true);
    const { error } = await supabase
      .from('brosur')
      .delete()
      .in('id', selectedBrosurs);

    if (error) {
      alert(`Gagal menghapus brosur: ${error.message}`);
    } else {
      setSelectedBrosurs([]);
      fetchBrosurs();
    }
    setIsUpdatingBulk(false);
  };

  const handleEmptyTable = async () => {
    if (!window.confirm(`PERINGATAN SANGAT BERBAHAYA!\n\nApakah Anda YAKIN ingin menghapus SEMUA DATA BROSUR (sebanyak ${totalBrosurs} baris) secara permanen dari database?\nData tidak dapat dikembalikan lagi setelah dihapus.`)) return;
    
    // Konfirmasi kedua
    if (window.prompt(`Ketik "HAPUS SEMUA" untuk melanjutkan:`) !== 'HAPUS SEMUA') {
      alert('Penghapusan dibatalkan karena teks konfirmasi salah.');
      return;
    }

    setIsEmptyingTable(true);
    // Menggunakan trik neq id 0 untuk menghapus semua data (bypassing the missing where clause error)
    const { error } = await supabase
      .from('brosur')
      .delete()
      .neq('id', '0');

    if (error) {
      alert(`Gagal mengosongkan tabel: ${error.message}`);
    } else {
      alert('Tabel berhasil dikosongkan!');
      fetchBrosurs();
    }
    setIsEmptyingTable(false);
  };

  const handleGenerateTeks = async (folderId: string, folderName: string) => {
    try {
      setIsGeneratingTeks(true);
      setGenerateProgress(0);
      setGenerateLabel(`Mengambil data brosur dari koleksi ${folderName}...`);

      const resIds = await fetch(`/api/get-brosur-ids?folder_id=${folderId}`);
      const dataIds = await resIds.json();

      if (!resIds.ok) throw new Error(dataIds.error || 'Gagal mengambil ID brosur');

      let ids = dataIds.ids;
      
      // Jika semua sudah di-generate, tanya apakah ingin mere-generate ulang
      if (ids.length === 0) {
        if (window.confirm('Semua brosur di koleksi ini sudah memiliki Teks Bersih. Apakah Anda ingin ME-REGENERATE ULANG semuanya dari awal? (Berguna jika ada pembaruan teks)')) {
          const resForce = await fetch(`/api/get-brosur-ids?folder_id=${folderId}&force=true`);
          const dataForce = await resForce.json();
          ids = dataForce.ids;
        } else {
          setIsGeneratingTeks(false);
          return;
        }
      }

      setGenerateLabel(`Memproses ${ids.length} brosur...`);
      const chunkSize = 10;
      let processed = 0;

      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        
        const resProcess = await fetch('/api/generate-teks-bersih', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: chunk })
        });
        
        if (!resProcess.ok) {
          const errData = await resProcess.json();
          console.error("Error chunk:", errData);
          // Kita lanjutkan saja agar sisanya tetap terproses
        }

        processed += chunk.length;
        setGenerateProgress(Math.min(100, Math.round((processed / ids.length) * 100)));
      }

      alert('Teks bersih berhasil di-generate secara keseluruhan!');
      fetchFolders(); // Muat ulang statistik
    } catch (err: any) {
      alert(`Gagal generate teks bersih: ${err.message}`);
    } finally {
      setIsGeneratingTeks(false);
    }
  };

  return (
    <main className="p-8 md:p-12 w-full max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
            <Database className="text-accent" /> Data Brosur & Koleksi
          </h1>
          <p className="text-zinc-500">Kelola brosur dan master koleksi (kategori) arsip Anda.</p>
        </div>
        
        {activeTab === 'brosur' ? (
          <Link 
            href="/dashboard/data/create" 
            className="bg-accent text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors shrink-0"
          >
            <Plus size={18} /> Tambah Brosur
          </Link>
        ) : (
          <Link 
            href="/dashboard/data/folder/create" 
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shrink-0"
          >
            <Plus size={18} /> Buat Koleksi Baru
          </Link>
        )}
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-black/5 dark:border-white/5 pb-2">
        <button 
          onClick={() => changeTab('brosur')}
          className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-colors ${activeTab === 'brosur' ? 'bg-white dark:bg-zinc-900 border-t border-l border-r border-black/5 dark:border-white/5 text-accent' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
        >
          <FileText size={18} /> Brosur Terisi ({activeTab === 'brosur' ? totalBrosurs : '...'})
        </button>
        <button 
          onClick={() => changeTab('folder')}
          className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-colors ${activeTab === 'folder' ? 'bg-white dark:bg-zinc-900 border-t border-l border-r border-black/5 dark:border-white/5 text-blue-600' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
        >
          <FolderArchive size={18} /> Master Koleksi ({folders.length})
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm rounded-tl-none">
        
        <div className="mb-6 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder={activeTab === 'brosur' ? "Cari judul atau tahun brosur..." : "Cari nama koleksi..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>
          
          {activeTab === 'brosur' && totalBrosurs > 0 && (
            <button 
              onClick={handleEmptyTable}
              disabled={isEmptyingTable}
              className="w-full md:w-auto bg-red-500/10 text-red-600 dark:text-red-400 px-5 py-3 rounded-xl font-bold text-sm hover:bg-red-500 hover:text-white disabled:opacity-50 transition-colors shrink-0 flex items-center justify-center gap-2 border border-red-500/20"
            >
              {isEmptyingTable ? <Loader2 className="animate-spin" size={16} /> : <><Trash2 size={16} /> Hapus Semua Data</>}
            </button>
          )}
        </div>

        {/* Action Bar Muncul Jika Ada Brosur Terpilih */}
        {activeTab === 'brosur' && selectedBrosurs.length > 0 && (
          <div className="mb-6 bg-accent/10 border border-accent/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-bold flex items-center gap-2">
              <CheckSquare className="text-accent" size={20} />
              <span className="text-accent">{selectedBrosurs.length} Brosur Terpilih</span>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <select 
                value={bulkFolderId}
                onChange={(e) => setBulkFolderId(e.target.value)}
                className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accent flex-1 md:w-48"
              >
                <option value="" disabled>-- Pindah ke Koleksi --</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              
              <button 
                onClick={handleBulkMove}
                disabled={isUpdatingBulk || !bulkFolderId}
                className="bg-accent text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors shrink-0 flex items-center gap-2"
              >
                {isUpdatingBulk ? <Loader2 className="animate-spin" size={16} /> : 'Terapkan'}
              </button>
              
              <button 
                onClick={handleBulkDelete}
                disabled={isUpdatingBulk}
                className="bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-500 hover:text-white disabled:opacity-50 transition-colors shrink-0 flex items-center gap-2"
              >
                {isUpdatingBulk ? <Loader2 className="animate-spin" size={16} /> : <><Trash2 size={16} /> Hapus Terpilih</>}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-zinc-500">
            <div className="relative flex items-center justify-center w-14 h-14 mb-6">
              <div className="absolute w-full h-full border-[1.5px] border-teal-500/10 rounded-full"></div>
              <div className="absolute w-full h-full border-[1.5px] border-transparent border-t-teal-500 rounded-full animate-spin" style={{ animationDuration: '1s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
            </div>
            <p className="text-sm font-medium text-teal-600/70 tracking-widest uppercase animate-pulse">Memuat Data...</p>
          </div>
        ) : activeTab === 'brosur' ? (
          /* TAB BROSUR */
          brosurs.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <p>Tidak ada brosur yang ditemukan.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 text-zinc-500 text-sm">
                    <th className="p-4 w-12">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-accent cursor-pointer rounded"
                        checked={brosurs.length > 0 && selectedBrosurs.length === brosurs.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-4 font-bold">Judul</th>
                    <th className="p-4 font-bold">Tahun</th>
                    <th className="p-4 font-bold">Koleksi</th>
                    <th className="p-4 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {brosurs.map((brosur) => (
                    <tr key={brosur.id} className={`border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors ${selectedBrosurs.includes(brosur.id) ? 'bg-accent/5 dark:bg-accent/10' : ''}`}>
                      <td className="p-4">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 accent-accent cursor-pointer rounded"
                          checked={selectedBrosurs.includes(brosur.id)}
                          onChange={() => handleSelectOne(brosur.id)}
                        />
                      </td>
                      <td className="p-4 font-bold max-w-[200px] truncate" title={brosur.judul}>
                        {brosur.judul}
                      </td>
                      <td className="p-4">
                        <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-bold">
                          {brosur.tahun}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-zinc-500">
                        {brosur.folders ? (
                          <span className="flex items-center gap-1"><FolderArchive size={14} className="text-blue-500"/> {brosur.folders.name}</span>
                        ) : (
                          <span className="italic text-zinc-400">Tidak ada koleksi</span>
                        )}
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <Link 
                          href={`/dashboard/data/edit/${brosur.id}`}
                          className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
                          title="Edit Brosur"
                        >
                          <Edit2 size={16} />
                        </Link>
                        <button 
                          onClick={() => handleDeleteBrosur(brosur.id, brosur.judul)}
                          disabled={deletingId === brosur.id}
                          className="p-2 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                          title="Hapus Brosur"
                        >
                          {deletingId === brosur.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* PAGINATION CONTROLS */}
            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-black/5 dark:border-white/5 pt-6">
              <div className="text-sm text-zinc-500 font-medium">
                Menampilkan <span className="font-bold text-zinc-900 dark:text-zinc-100">{brosurs.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</span> - <span className="font-bold text-zinc-900 dark:text-zinc-100">{Math.min(currentPage * itemsPerPage, totalBrosurs)}</span> dari <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalBrosurs}</span> brosur
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl disabled:opacity-50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium text-sm"
                >
                  Sebelumnya
                </button>
                <div className="px-4 py-2 rounded-xl bg-accent/10 text-accent font-bold text-sm">
                  {currentPage}
                </div>
                <button 
                  disabled={currentPage * itemsPerPage >= totalBrosurs || loading}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl disabled:opacity-50 hover:bg-black/5 dark:hover:bg-white/5 transition-colors font-medium text-sm"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
            </>
          )
        ) : (
          /* TAB FOLDER */
          filteredFolders.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <p>Tidak ada koleksi yang ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFolders.map((folder) => (
                <div key={folder.id} className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col hover:border-blue-500/50 transition-colors group bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <FolderArchive size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{folder.name}</h3>
                        <p className="text-xs text-zinc-500 font-mono">/{folder.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/dashboard/data/folder/edit/${folder.id}`}
                        className="p-2 bg-black/5 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </Link>
                      <button 
                        onClick={() => handleDeleteFolder(folder.id, folder.name)}
                        disabled={deletingId === folder.id}
                        className="p-2 bg-black/5 dark:bg-white/5 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                      >
                        {deletingId === folder.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 flex-1 mb-4">
                    {folder.description || <span className="italic opacity-50">Tidak ada deskripsi</span>}
                  </p>
                  
                  {folder.stats && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-zinc-500">Status Teks Bersih</span>
                        <span className={folder.stats.clean === folder.stats.total && folder.stats.total > 0 ? "text-emerald-500" : "text-amber-500"}>
                          {folder.stats.clean} / {folder.stats.total}
                        </span>
                      </div>
                      <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${folder.stats.clean === folder.stats.total && folder.stats.total > 0 ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${folder.stats.total > 0 ? (folder.stats.clean / folder.stats.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleGenerateTeks(folder.id, folder.name)}
                    className={`w-full mt-auto py-2 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 ${
                      folder.stats?.clean === folder.stats?.total && folder.stats?.total > 0 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white'
                    }`}
                  >
                    <Settings size={16} /> 
                    {folder.stats?.clean === folder.stats?.total && folder.stats?.total > 0 ? 'Regenerate Teks' : 'Generate Teks Bersih'}
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* FULL SCREEN LOADER GENERATOR TEKS */}
      {isGeneratingTeks && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 p-10 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
            <h2 className="text-2xl font-black mb-2">Memproses Teks</h2>
            <p className="text-zinc-500 mb-6 font-medium leading-relaxed">
              {generateLabel}
            </p>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-4 mb-2 overflow-hidden border border-black/5 dark:border-white/5">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${generateProgress}%` }}
              ></div>
            </div>
            <p className="font-bold text-blue-500">{generateProgress}% Selesai</p>
          </div>
        </div>
      )}
    </main>
  );
}
