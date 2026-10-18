'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Plus, Edit2, Trash2, Search, Database, FolderArchive, FileText, CheckSquare, Settings, Download } from 'lucide-react';
import Link from 'next/link';

export default function DataBrosurPage() {
  const [activeTab, setActiveTab] = useState<'brosur' | 'folder' | 'vektor'>('brosur');
  const [brosurs, setBrosurs] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [vektors, setVektors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [capacity, setCapacity] = useState<any>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBrosurs, setTotalBrosurs] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [filterFolder, setFilterFolder] = useState<string>('');
  const [filterTahun, setFilterTahun] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('tahun_desc');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  // State untuk Fitur Pindah Masal (Bulk Move)
  const [selectedBrosurs, setSelectedBrosurs] = useState<string[]>([]);
  const [bulkFolderId, setBulkFolderId] = useState<string>('');
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  const [isEmptyingTable, setIsEmptyingTable] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // State untuk Generator Teks Bersih & Standarisasi
  const [isGeneratingTeks, setIsGeneratingTeks] = useState(false);
  const [isStandardizing, setIsStandardizing] = useState(false);
  const [isVectorSyncing, setIsVectorSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState({ total: 0, synced: 0, unsynced: 0 });
  const [generateProgress, setGenerateProgress] = useState(0);
  const [generateLabel, setGenerateLabel] = useState('');

  useEffect(() => {
    // Sinkronisasi Tab dengan URL
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'folder') {
      setActiveTab('folder');
    } else if (tab === 'vektor') {
      setActiveTab('vektor');
    }
  }, []);

  const changeTab = (tab: 'brosur' | 'folder' | 'vektor') => {
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
      .select('id, judul, tahun, slug, created_at, folder_id, folders(name)', { count: 'exact' });
      
    if (sortBy === 'tahun_desc') {
      query = query.order('tahun', { ascending: false }).order('judul', { ascending: true });
    } else if (sortBy === 'tahun_asc') {
      query = query.order('tahun', { ascending: true }).order('judul', { ascending: true });
    } else if (sortBy === 'judul_asc') {
      query = query.order('judul', { ascending: true });
    } else if (sortBy === 'judul_desc') {
      query = query.order('judul', { ascending: false });
    }
      
    if (searchTerm) {
      const searchNum = parseInt(searchTerm);
      if (!isNaN(searchNum) && searchNum > 1900 && searchNum < 2100) {
        query = query.or(`tahun.eq.${searchNum},judul.ilike.%${searchTerm}%`);
      } else {
        // Menggunakan logika FTS yang disamakan dengan global search
        query = query.textSearch('fts', searchTerm, { type: 'websearch', config: 'indonesian' });
      }
    }
    
    if (filterFolder) {
      if (filterFolder === 'none') {
        query = query.is('folder_id', null);
      } else {
        query = query.eq('folder_id', filterFolder);
      }
    }

    if (filterTahun) {
      query = query.eq('tahun', filterTahun);
    }
    
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    const { data, count } = await query.range(from, to);
    
    if (data) setBrosurs(data);
    if (count !== null) setTotalBrosurs(count);
    
    setLoading(false);
  };

  const fetchSyncStatus = async () => {
    try {
      const res = await fetch('/api/ai/sync-status');
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (e) {
      console.error("Gagal memuat status sinkronisasi", e);
    }
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

  const fetchVektors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('brosur_chunks')
      .select('id, judul_brosur, content, embedding')
      .limit(20)
      .order('id', { ascending: false }); // asumsikan id uuid tidak urut waktu, tapi cukup untuk sampel
    if (data) setVektors(data);
    setLoading(false);
  };

  const fetchAvailableYears = async () => {
    const { data } = await supabase.from('brosur').select('tahun').order('tahun', { ascending: false });
    if (data) {
      const years = Array.from(new Set(data.map(d => d.tahun).filter(Boolean)));
      setAvailableYears(years as number[]);
    }
  };

  const fetchCapacity = async () => {
    try {
      const res = await fetch('/api/database-capacity');
      const json = await res.json();
      if (json.success) {
        setCapacity(json.data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchFolders();
    fetchAvailableYears();
    fetchCapacity();
    fetchSyncStatus();
  }, []);

  useEffect(() => {
    if (activeTab === 'brosur') {
      fetchBrosurs();
    } else if (activeTab === 'vektor') {
      fetchVektors();
    }
  }, [currentPage, itemsPerPage, searchTerm, filterFolder, filterTahun, sortBy, activeTab]);

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
    if (!window.confirm(`Yakin ingin menghapus folder "${name}" beserta SELURUH data brosur di dalamnya secara permanen? Data tidak dapat dikembalikan.`)) return;
    
    // Kita ubah state menghapus menjadi ID ini, tapi jika lama kita bisa tunjukkan progress
    setDeletingId(id);
    
    try {
      let isDeletingBrosur = true;
      let totalDeletedBrosur = 0;

      // Hapus brosur secara bertahap (batch) untuk menghindari limit Supabase 1000 baris
      while (isDeletingBrosur) {
        // Ambil ID brosur yang akan dihapus terlebih dahulu
        const { data: brosursToDel, error: fetchErr } = await supabase
          .from('brosur')
          .select('id')
          .eq('folder_id', id)
          .limit(1000);
          
        if (fetchErr) throw new Error(`Gagal mengambil brosur: ${fetchErr.message}`);

        if (brosursToDel && brosursToDel.length > 0) {
          const ids = brosursToDel.map(b => b.id);
          
          // Hapus anak-anak datanya (vektor/chunks) terlebih dahulu untuk menghindari Foreign Key Constraint error
          await supabase.from('brosur_chunks').delete().in('brosur_id', ids);
          
          // Baru hapus induk brosurnya
          const { data: deletedBrosurs, error: brosurError } = await supabase.from('brosur').delete().in('id', ids).select('id');
          
          if (brosurError) {
            throw new Error(`Gagal menghapus batch brosur: ${brosurError.message}`);
          }
          if (!deletedBrosurs || deletedBrosurs.length === 0) {
            throw new Error("Penghapusan diblokir oleh sistem database (kemungkinan aturan RLS/Hak Akses Anda tidak memiliki izin untuk menghapus data ini).");
          }

          totalDeletedBrosur += deletedBrosurs.length;
          // Kasih jeda sedikit agar server tidak menolak (rate-limit)
          await new Promise(resolve => setTimeout(resolve, 300));
        } else {
          // Jika data yang terhapus 0, artinya brosur di folder ini sudah habis.
          isDeletingBrosur = false;
        }
      }

      // Setelah dipastikan seluruh brosur (mungkin ribuan) terhapus, baru hapus foldernya
      const { error: folderError } = await supabase.from('folders').delete().eq('id', id);
      
      if (folderError) {
        throw new Error(`Gagal menghapus folder: ${folderError.message}`);
      }
      
      alert(`Berhasil menghapus folder beserta ${totalDeletedBrosur} brosur di dalamnya!`);
      setFolders(folders.filter(f => f.id !== id));
      fetchBrosurs();
      fetchCapacity();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadBrosur = async (id: string, judul: string) => {
    try {
      setDownloadingId(id);
      const { data, error } = await supabase
        .from('brosur')
        .select('konten, teks_bersih')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      
      const contentToDownload = data?.teks_bersih || data?.konten || '';
      
      if (!contentToDownload) {
        alert('Tidak ada konten teks pada brosur ini.');
        return;
      }
      
      // Clean up the filename by removing invalid characters
      const safeJudul = judul.replace(/[/\\?%*:|"<>]/g, '-');
      const blob = new Blob([contentToDownload], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeJudul}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Gagal mengunduh: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
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
    // Hapus data vektor (chunks) terlebih dahulu agar tidak error Foreign Key Constraint
    await supabase.from('brosur_chunks').delete().in('brosur_id', selectedBrosurs);
    
    const { data: deletedRows, error } = await supabase
      .from('brosur')
      .delete()
      .in('id', selectedBrosurs)
      .select('id');

    if (error) {
      alert(`Gagal menghapus brosur: ${error.message}`);
    } else if (!deletedRows || deletedRows.length === 0) {
      alert("Gagal menghapus: Akses ditolak oleh database (aturan RLS tidak mengizinkan Anda menghapus data ini).");
    } else {
      setSelectedBrosurs([]);
      fetchBrosurs();
    }
    setIsUpdatingBulk(false);
  };

  const handleDeleteFiltered = async () => {
    let confirmMsg = '';
    let promptMsg = '';
    
    if (filterFolder && filterFolder !== 'none') {
      const selectedFolder = folders.find(f => f.id === filterFolder);
      confirmMsg = `PERINGATAN: Yakin ingin menghapus SEMUA brosur dalam koleksi "${selectedFolder?.name || 'terpilih'}"?`;
      promptMsg = 'HAPUS KOLEKSI';
    } else if (filterFolder === 'none') {
      confirmMsg = `PERINGATAN: Yakin ingin menghapus SEMUA brosur yang TIDAK MEMILIKI KOLEKSI?`;
      promptMsg = 'HAPUS TANPA KOLEKSI';
    } else {
      confirmMsg = `PERINGATAN SANGAT BERBAHAYA!\n\nApakah Anda YAKIN ingin menghapus SEMUA DATA BROSUR (sebanyak ${totalBrosurs} baris) secara permanen dari database?\nData tidak dapat dikembalikan lagi setelah dihapus.`;
      promptMsg = 'HAPUS SEMUA';
    }

    if (!window.confirm(confirmMsg)) return;
    if (window.prompt(`Ketik "${promptMsg}" untuk melanjutkan:`) !== promptMsg) {
      alert('Penghapusan dibatalkan karena teks konfirmasi salah.');
      return;
    }

    setIsEmptyingTable(true);
    
    try {
      let isDeleting = true;
      let totalDeleted = 0;

      while (isDeleting) {
        let query = supabase.from('brosur').select('id').limit(1000);
        
        if (filterFolder && filterFolder !== 'none') {
          query = query.eq('folder_id', filterFolder);
        } else if (filterFolder === 'none') {
          query = query.is('folder_id', null);
        } else {
          query = query.neq('id', '0'); // Hapus semua
        }

        const { data: brosursToDel, error: fetchErr } = await query;
        
        if (fetchErr) {
          throw new Error(`Gagal mengambil batch data brosur: ${fetchErr.message}`);
        }

        if (brosursToDel && brosursToDel.length > 0) {
          const ids = brosursToDel.map(b => b.id);
          
          // Hapus vektor AI / chunks terlebih dahulu untuk mencegah FK constraint error
          await supabase.from('brosur_chunks').delete().in('brosur_id', ids);
          
          const { data: deletedRows, error } = await supabase.from('brosur').delete().in('id', ids).select('id');
          if (error) throw new Error(`Gagal menghapus brosur: ${error.message}`);
          if (!deletedRows || deletedRows.length === 0) {
             throw new Error("Akses ditolak: Database mencegah penghapusan (aturan RLS tidak mengizinkan Anda menghapus data ini).");
          }

          totalDeleted += deletedRows.length;
          // Kasih jeda sedikit agar server tidak menolak (rate-limit)
          await new Promise(resolve => setTimeout(resolve, 300));
        } else {
          // Jika tidak ada lagi yang terhapus, hentikan loop
          isDeleting = false;
        }
      }

      alert(`Penghapusan berhasil! Total ${totalDeleted} brosur telah dihapus.`);
      fetchBrosurs();
      fetchFolders();
      fetchCapacity();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsEmptyingTable(false);
    }
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

  const handleStandardizeArabic = async (folderId: string, folderName: string) => {
    try {
      setIsStandardizing(true);
      setGenerateProgress(0);
      setGenerateLabel(`Mengambil data brosur dari koleksi ${folderName} untuk distandarisasi...`);

      // Kita ambil semua ID dalam folder menggunakan endpoint get-brosur-ids dengan force=true
      const resIds = await fetch(`/api/get-brosur-ids?folder_id=${folderId}&force=true`);
      const dataIds = await resIds.json();

      if (!resIds.ok) throw new Error(dataIds.error || 'Gagal mengambil ID brosur');

      const ids = dataIds.ids;
      
      if (ids.length === 0) {
          alert('Tidak ada brosur dalam koleksi ini.');
          setIsStandardizing(false);
          return;
      }
      
      if (!window.confirm(`Yakin ingin menstandarisasi font Arabic (menghapus format font MS Word) untuk ${ids.length} brosur di koleksi ini?`)) {
          setIsStandardizing(false);
          return;
      }

      setGenerateLabel(`Menstandarisasi ${ids.length} brosur...`);
      const chunkSize = 10;
      let processed = 0;

      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        
        const resProcess = await fetch('/api/standardize-arabic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: chunk })
        });
        
        if (!resProcess.ok) {
          const errData = await resProcess.json();
          console.error("Error chunk:", errData);
        }

        processed += chunk.length;
        setGenerateProgress(Math.min(100, Math.round((processed / ids.length) * 100)));
      }

      alert('Standarisasi Arabic berhasil dilakukan!');
      fetchBrosurs(); // Muat ulang data
    } catch (err: any) {
      alert(`Gagal standarisasi: ${err.message}`);
    } finally {
      setIsStandardizing(false);
    }
  };

  const handleVectorSync = async () => {
    try {
      if (!window.confirm('Proses ini akan membaca brosur terbaru dan mengubahnya menjadi vektor untuk AI. Lanjutkan?')) return;
      
      setIsVectorSyncing(true);
      
      const res = await fetch('/api/ai/generate-chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // tanpa ID berarti akan memproses batch (misal 5 terbaru)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan sinkronisasi');
      
      alert(data.message);
    } catch (err: any) {
      alert(`Gagal sinkronisasi vektor: ${err.message}`);
    } finally {
      setIsVectorSyncing(false);
      fetchSyncStatus(); // refresh status setelah proses
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-6 md:py-8 font-sans antialiased text-slate-800 select-none space-y-6">
      {/* Header Banner Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-medium mb-2">
            <Database size={12} className="text-emerald-600" />
            <span>Pustaka Data & Koleksi</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Data Brosur &{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 bg-clip-text text-transparent font-extrabold">
              Koleksi Arsip
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal leading-relaxed">
            Kelola data brosur, indeks pencarian, dan master koleksi kategori arsip Anda.
          </p>
        </div>
        
        {activeTab === 'brosur' ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleVectorSync}
              disabled={isVectorSyncing || syncStatus.unsynced === 0}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 shrink-0"
            >
              {isVectorSyncing ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
              <span>
                {isVectorSyncing 
                  ? 'Menyinkronkan...' 
                  : syncStatus.unsynced > 0 
                    ? `Sinkron AI (${syncStatus.unsynced} tertinggal)` 
                    : 'AI Tersinkron Penuh'}
              </span>
            </button>
            <Link 
              href="/dashboard/data/create" 
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shrink-0 active:scale-[0.98]"
            >
              <Plus size={14} /> <span>Tambah Brosur</span>
            </Link>
          </div>
        ) : (
          <Link 
            href="/dashboard/data/folder/create" 
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shrink-0 active:scale-[0.98]"
          >
            <Plus size={14} /> <span>Buat Koleksi Baru</span>
          </Link>
        )}
      </div>

      {/* Estimasi Kapasitas Database Widget */}
      {capacity && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 shadow-none">
          <div className="flex-1 w-full space-y-2">
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Database size={13} className="text-emerald-600" />
                  <span>Estimasi Kapasitas Basis Data</span>
                </div>
                <div className="text-base font-bold text-slate-800 mt-1">
                  {(capacity.estimatedBytesUsed / (1024 * 1024)).toFixed(2)} MB{' '}
                  <span className="text-slate-400 text-xs font-normal">
                    dari {capacity.limitBytes / (1024 * 1024)} MB (Free Tier)
                  </span>
                </div>
              </div>
              <div className="text-emerald-600 font-extrabold text-lg">
                {capacity.percentageUsed.toFixed(2)}%
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  capacity.percentageUsed > 90 ? 'bg-rose-500' : capacity.percentageUsed > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, capacity.percentageUsed)}%` }}
              />
            </div>
          </div>
          
          <div className="flex gap-4 md:border-l md:border-slate-100 md:pl-6 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button 
              onClick={() => changeTab('brosur')} 
              className="flex flex-col text-center min-w-[76px] hover:bg-slate-50 p-2 rounded-xl transition cursor-pointer"
            >
              <span className="text-base font-bold text-slate-800">{capacity.tables.brosur}</span>
              <span className="text-xs text-slate-500 font-medium">Brosur</span>
              <span className="text-[10px] text-slate-400">Tab di bawah</span>
            </button>
            <Link 
              href="/dashboard/hadist-api" 
              className="flex flex-col text-center min-w-[76px] hover:bg-slate-50 p-2 rounded-xl transition cursor-pointer"
            >
              <span className="text-base font-bold text-slate-800">{capacity.tables.hadist}</span>
              <span className="text-xs text-slate-500 font-medium">Hadist</span>
              <span className="text-[10px] text-slate-400">Tarik API</span>
            </Link>
            <div className="flex flex-col text-center min-w-[76px] p-2">
              <span className="text-base font-bold text-slate-800">{capacity.totalRecords}</span>
              <span className="text-xs text-slate-500 font-medium">Total Baris</span>
              <span className="text-[10px] text-slate-400">Semua tabel</span>
            </div>
          </div>
        </div>
      )}

      {/* Segmented Control Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200/80 pb-2.5">
        <button 
          onClick={() => changeTab('brosur')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'brosur' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-none' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <FileText size={14} className={activeTab === 'brosur' ? 'text-emerald-600' : 'text-slate-400'} />
          <span>Brosur Terisi ({activeTab === 'brosur' ? totalBrosurs : '...'})</span>
        </button>

        <button 
          onClick={() => changeTab('folder')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'folder' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-none' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <FolderArchive size={14} className={activeTab === 'folder' ? 'text-emerald-600' : 'text-slate-400'} />
          <span>Master Koleksi ({folders.length})</span>
        </button>

        <button 
          onClick={() => changeTab('vektor')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'vektor' 
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-none' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <Database size={14} className={activeTab === 'vektor' ? 'text-emerald-600' : 'text-slate-400'} />
          <span>Vektor AI ({syncStatus.synced})</span>
        </button>
      </div>

      {/* Main Content Container */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-none space-y-5">
        
        {/* Toolbar & Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input 
              type="text" 
              placeholder={activeTab === 'brosur' ? "Cari judul atau tahun brosur..." : "Cari nama koleksi..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>
          
          {activeTab === 'brosur' && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterFolder}
                onChange={(e) => {
                  setFilterFolder(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none"
              >
                <option value="">Semua Koleksi</option>
                <option value="none">Tanpa Koleksi</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.stats?.total || 0} data)</option>
                ))}
              </select>
              
              <select
                value={filterTahun}
                onChange={(e) => {
                  setFilterTahun(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none"
              >
                <option value="">Semua Tahun</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none"
              >
                <option value="tahun_desc">Tahun (Terbaru)</option>
                <option value="tahun_asc">Tahun (Terlama)</option>
                <option value="judul_asc">Abjad (A - Z)</option>
                <option value="judul_desc">Abjad (Z - A)</option>
              </select>
              
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none"
              >
                <option value={10}>10 per hal</option>
                <option value={20}>20 per hal</option>
                <option value={50}>50 per hal</option>
                <option value={100}>100 per hal</option>
              </select>

              {totalBrosurs > 0 && (
                <button 
                  onClick={handleDeleteFiltered}
                  disabled={isEmptyingTable}
                  className="bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-50 transition shrink-0 flex items-center justify-center gap-1.5"
                >
                  {isEmptyingTable ? (
                    <Loader2 className="animate-spin" size={13} />
                  ) : (
                    <>
                      <Trash2 size={13} />
                      <span>{filterFolder ? (filterFolder === 'none' ? 'Hapus Tanpa Koleksi' : 'Hapus Koleksi') : 'Hapus Semua'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Bar Muncul Jika Ada Brosur Terpilih */}
        {activeTab === 'brosur' && selectedBrosurs.length > 0 && (
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
            <div className="font-semibold text-emerald-800 flex items-center gap-2">
              <CheckSquare className="text-emerald-600" size={16} />
              <span>{selectedBrosurs.length} Brosur Terpilih</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <select 
                value={bulkFolderId}
                onChange={(e) => setBulkFolderId(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none flex-1 md:w-48"
              >
                <option value="" disabled>-- Pindah ke Koleksi --</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.stats?.total || 0} data)</option>
                ))}
              </select>
              
              <button 
                onClick={handleBulkMove}
                disabled={isUpdatingBulk || !bulkFolderId}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg font-semibold text-xs transition disabled:opacity-50 shrink-0 flex items-center gap-1.5 active:scale-95"
              >
                {isUpdatingBulk ? <Loader2 className="animate-spin" size={13} /> : 'Terapkan'}
              </button>
              
              <button 
                onClick={handleBulkDelete}
                disabled={isUpdatingBulk}
                className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 px-3.5 py-1.5 rounded-lg font-semibold text-xs transition disabled:opacity-50 shrink-0 flex items-center gap-1.5"
              >
                {isUpdatingBulk ? <Loader2 className="animate-spin" size={13} /> : <><Trash2 size={13} /> Hapus Terpilih</>}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={28} />
            <p className="text-xs font-medium">Memuat data brosur...</p>
          </div>
        ) : activeTab === 'brosur' ? (
          /* TAB BROSUR */
          brosurs.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-1">
              <FileText size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Tidak ada brosur yang ditemukan</p>
              <p className="text-[11px] text-slate-400">Silakan sesuaikan filter pencarian atau tambah brosur baru.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4 w-10">
                        <input 
                          type="checkbox" 
                          className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          checked={brosurs.length > 0 && selectedBrosurs.length === brosurs.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th className="py-3 px-4">Judul Brosur</th>
                      <th className="py-3 px-4">Tahun</th>
                      <th className="py-3 px-4">Koleksi</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {brosurs.map((brosur) => (
                      <tr key={brosur.id} className={`hover:bg-slate-50/60 transition-colors ${selectedBrosurs.includes(brosur.id) ? 'bg-emerald-50/30' : ''}`}>
                        <td className="py-3 px-4">
                          <input 
                            type="checkbox" 
                            className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            checked={selectedBrosurs.includes(brosur.id)}
                            onChange={() => handleSelectOne(brosur.id)}
                          />
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs sm:max-w-md truncate" title={brosur.judul}>
                          {brosur.judul}
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium">
                            {brosur.tahun}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {brosur.folders ? (
                            <span className="flex items-center gap-1.5"><FolderArchive size={13} className="text-emerald-600"/> {brosur.folders.name}</span>
                          ) : (
                            <span className="italic text-slate-400">Tanpa koleksi</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleDownloadBrosur(brosur.id, brosur.judul)}
                              disabled={downloadingId === brosur.id}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition disabled:opacity-50"
                              title="Unduh Teks Brosur"
                            >
                              {downloadingId === brosur.id ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                            </button>
                            <Link 
                              href={`/dashboard/data/edit/${brosur.id}`}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                              title="Edit Brosur"
                            >
                              <Edit2 size={14} />
                            </Link>
                            <button 
                              onClick={() => handleDeleteBrosur(brosur.id, brosur.judul)}
                              disabled={deletingId === brosur.id}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                              title="Hapus Brosur"
                            >
                              {deletingId === brosur.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            
              {/* PAGINATION CONTROLS */}
              <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="text-slate-500">
                  Menampilkan <strong className="text-slate-900">{brosurs.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0}</strong> - <strong className="text-slate-900">{Math.min(currentPage * itemsPerPage, totalBrosurs)}</strong> dari <strong className="text-slate-900">{totalBrosurs}</strong> brosur
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    disabled={currentPage === 1 || loading}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition text-xs font-medium"
                  >
                    Sebelumnya
                  </button>
                  <span className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold text-xs">
                    {currentPage} / {Math.max(1, Math.ceil(totalBrosurs / itemsPerPage))}
                  </span>
                  <button 
                    disabled={currentPage * itemsPerPage >= totalBrosurs || loading}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition text-xs font-medium"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            </>
          )
        ) : activeTab === 'folder' ? (
          /* TAB FOLDER */
          filteredFolders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-1">
              <FolderArchive size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Tidak ada koleksi yang ditemukan</p>
              <p className="text-[11px] text-slate-400">Silakan buat koleksi baru menggunakan tombol Buat Koleksi Baru.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFolders.map((folder) => (
                <div key={folder.id} className="border border-slate-200/80 rounded-2xl p-5 flex flex-col hover:border-emerald-300 transition-colors bg-slate-50/40">
                  <div className="flex items-start justify-between mb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                        <FolderArchive size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                          <span>{folder.name}</span>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full font-mono">
                            {folder.stats?.total || 0} brosur
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono">/{folder.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link 
                        href={`/dashboard/data/folder/edit/${folder.id}`}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                        title="Edit Koleksi"
                      >
                        <Edit2 size={14} />
                      </Link>
                      <button 
                        onClick={() => handleDeleteFolder(folder.id, folder.name)}
                        disabled={deletingId === folder.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus Koleksi"
                      >
                        {deletingId === folder.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 flex-1 mb-3.5 leading-relaxed">
                    {folder.description || <span className="italic text-slate-400">Tidak ada deskripsi</span>}
                  </p>
                  
                  {folder.stats && (
                    <div className="mb-4 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-medium">
                        <span className="text-slate-500">Status Teks Bersih</span>
                        <span className={folder.stats.clean === folder.stats.total && folder.stats.total > 0 ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
                          {folder.stats.clean} / {folder.stats.total}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${folder.stats.clean === folder.stats.total && folder.stats.total > 0 ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${folder.stats.total > 0 ? (folder.stats.clean / folder.stats.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mt-auto flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200/50">
                    <button
                      onClick={() => handleGenerateTeks(folder.id, folder.name)}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                        folder.stats?.clean === folder.stats?.total && folder.stats?.total > 0 
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                          : 'bg-slate-900 hover:bg-black text-white'
                      }`}
                    >
                      <Settings size={13} /> 
                      <span>{folder.stats?.clean === folder.stats?.total && folder.stats?.total > 0 ? 'Regenerasi Teks' : 'Generate Teks Bersih'}</span>
                    </button>
                    
                    <button
                      onClick={() => handleStandardizeArabic(folder.id, folder.name)}
                      className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60 transition flex items-center justify-center gap-1.5"
                    >
                      <Settings size={13} /> <span>Standarisasi Arabic</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* TAB VEKTOR */
          <div className="space-y-3">
             {vektors.length === 0 && !loading ? (
                <div className="py-16 text-center text-slate-400 space-y-1">
                  <Database size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Belum ada brosur yang disinkronisasi menjadi Vektor</p>
                </div>
             ) : (
                vektors.map(v => (
                  <div key={v.id} className="p-4 border border-slate-200/80 rounded-xl bg-slate-50/40 space-y-2">
                    <h3 className="font-semibold text-xs text-slate-800 flex items-center gap-2">
                      <Database size={13} className="text-emerald-600" /> 
                      <span>{v.judul_brosur}</span>
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{v.content}</p>
                    <div className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200/60 p-2 rounded-lg truncate">
                       Vektor: [ {v.embedding?.slice(0, 8).join(', ')} ... ] (Total 768 dimensi vektor tersimpan)
                    </div>
                  </div>
                ))
             )}
          </div>
        )}
      </div>

      {/* FULL SCREEN LOADER GENERATOR TEKS & STANDARISASI */}
      {(isGeneratingTeks || isStandardizing) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-white  p-10 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
            <h2 className="text-2xl font-black mb-2">Memproses Teks</h2>
            <p className="text-zinc-500 mb-6 font-medium leading-relaxed">
              {generateLabel}
            </p>
            <div className="w-full bg-zinc-100  rounded-full h-4 mb-2 overflow-hidden border border-black/5 ">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${generateProgress}%` }}
              ></div>
            </div>
            <p className="font-bold text-blue-500">{generateProgress}% Selesai</p>
          </div>
        </div>
      )}
    </div>
  );
}
