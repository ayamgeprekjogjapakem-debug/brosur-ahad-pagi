'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Plus, Search, Database, FolderArchive, FileText, ChevronRight, ChevronLeft, BookOpen, Eye, FolderPlus, X, Trash2, Cpu, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';
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
  
  // Folder Creation State
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [folderActionStatus, setFolderActionStatus] = useState<string | null>(null);

  // Daftar 9 Imam / Kitab Hadits (Kategori Sesuai Nama Kitab/Imam)
  const NINE_BOOKS = [
    { key: 'ALL', slug: 'semua', label: 'Semua Kitab (9 Imam)', short: 'Semua Kitab', name: 'Semua', desc: 'Seluruh riwayat hadits 9 imam', compiler: '9 Perawi Utama' },
    { key: 'H1', slug: 'shahih-bukhari', label: 'Shahih Bukhari', short: 'Shahih Bukhari', name: 'Shahih Bukhari', bookNo: 1, desc: 'Imam Abu Abdillah Muhammad bin Ismail al-Bukhari', compiler: 'Imam Bukhari (194 - 256 H)' },
    { key: 'H2', slug: 'shahih-muslim', label: 'Shahih Muslim', short: 'Shahih Muslim', name: 'Shahih Muslim', bookNo: 2, desc: 'Imam Abul Husain Muslim bin al-Hajjaj an-Naisaburi', compiler: 'Imam Muslim (204 - 261 H)' },
    { key: 'H3', slug: 'sunan-abu-daud', label: 'Sunan Abu Daud', short: 'Sunan Abu Daud', name: 'Sunan Abu Daud', bookNo: 3, desc: 'Imam Abu Daud Sulaiman bin al-Asy\'ats as-Sijistani', compiler: 'Imam Abu Daud (202 - 275 H)' },
    { key: 'H4', slug: 'sunan-tirmidzi', label: 'Sunan Tirmidzi', short: 'Sunan Tirmidzi', name: 'Sunan Tirmidzi', bookNo: 4, desc: 'Imam Abu Isa Muhammad bin Isa at-Tirmidzi', compiler: 'Imam Tirmidzi (209 - 279 H)' },
    { key: 'H5', slug: 'sunan-nasai', label: 'Sunan Nasa\'i', short: 'Sunan Nasa\'i', name: 'Sunan Nasa\'i', bookNo: 5, desc: 'Imam Abu Abdirrahman Ahmad bin Syu\'aib an-Nasa\'i', compiler: 'Imam Nasa\'i (215 - 303 H)' },
    { key: 'H6', slug: 'sunan-ibnu-majah', label: 'Sunan Ibnu Majah', short: 'Sunan Ibnu Majah', name: 'Sunan Ibnu Majah', bookNo: 6, desc: 'Imam Abu Abdillah Muhammad bin Yazid Ibnu Majah', compiler: 'Imam Ibnu Majah (209 - 273 H)' },
    { key: 'H7', slug: 'musnad-ahmad', label: 'Musnad Ahmad', short: 'Musnad Ahmad', name: 'Musnad Ahmad', bookNo: 7, desc: 'Imam Ahmad bin Muhammad bin Hanbal', compiler: 'Imam Ahmad (164 - 241 H)' },
    { key: 'H8', label: 'Muwatha\' Malik', slug: 'muwatha-malik', short: 'Muwatha\' Malik', name: 'Muwatha\' Malik', bookNo: 8, desc: 'Imam Malik bin Anas al-Ashbahi', compiler: 'Imam Malik (93 - 179 H)' },
    { key: 'H9', slug: 'sunan-darimi', label: 'Sunan Darimi', short: 'Sunan Darimi', name: 'Sunan Darimi', bookNo: 9, desc: 'Imam Abu Muhammad Abdullah bin Abdirrahman ad-Darimi', compiler: 'Imam Darimi (181 - 255 H)' },
  ];

  // Map slug / key helper
  const getBookFromParam = (param: string | null) => {
    if (!param) return NINE_BOOKS[0];
    const found = NINE_BOOKS.find(b => b.slug === param.toLowerCase() || b.key === param.toUpperCase());
    return found || NINE_BOOKS[0];
  };

  const initialBook = getBookFromParam(searchParams?.get('buku') || searchParams?.get('book'));
  const initialPage = parseInt(searchParams?.get('page') || '1', 10) || 1;

  // Filter & Pagination State
  const [selectedBook, setSelectedBook] = useState<string>(initialBook.key);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalHadists, setTotalHadists] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [bookStats, setBookStats] = useState<Record<string, { total: number, clean: number }>>({});
  
  const [syncStatus, setSyncStatus] = useState({ total: 0, synced: 0, unsynced: 0 });
  const [isVectorSyncing, setIsVectorSyncing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const bookParam = searchParams?.get('buku') || searchParams?.get('book');
    const matched = getBookFromParam(bookParam);
    setSelectedBook(matched.key);

    const pageParam = parseInt(searchParams?.get('page') || '1', 10) || 1;
    setCurrentPage(pageParam);
  }, [searchParams]);

  const updateUrlParams = (newTab?: string, newBookKey?: string, newPage?: number) => {
    const tabToUse = newTab || activeTab;
    const bookKeyToUse = newBookKey !== undefined ? newBookKey : selectedBook;
    const pageToUse = newPage !== undefined ? newPage : currentPage;

    const params = new URLSearchParams();
    if (tabToUse) params.set('tab', tabToUse);

    const bookObj = NINE_BOOKS.find(b => b.key === bookKeyToUse);
    if (bookObj && bookObj.slug !== 'semua') {
      params.set('buku', bookObj.slug);
    }
    if (pageToUse > 1) {
      params.set('page', String(pageToUse));
    }

    router.push(`?${params.toString()}`);
  };

  const changeTab = (tab: 'hadist_chm' | 'folder' | 'vektor') => {
    updateUrlParams(tab);
  };

  const handleSelectBook = (bookKey: string) => {
    setSelectedBook(bookKey);
    setCurrentPage(1);
    updateUrlParams('hadist_chm', bookKey, 1);
  };

  const handleSelectPage = (pageNum: number) => {
    setCurrentPage(pageNum);
    updateUrlParams(activeTab, selectedBook, pageNum);
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
      
    // Filter per Buku (misal H1 untuk BUKU 1, H2 untuk BUKU 2, dst)
    if (selectedBook !== 'ALL') {
      query = query.like('id', `${selectedBook}%`);
    }

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
      const res = await fetch('/api/folders-hadist-stats');
      if (res.ok) {
        const json = await res.json();
        if (json.folders) setFolders(json.folders);
        if (json.bookStats) setBookStats(json.bookStats);
        return;
      }
      const { data } = await supabase.from('folders_hadist').select('id, name, created_at, slug, description');
      if (data) setFolders(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateFolder = async (customName?: string) => {
    const targetName = (customName || newFolderName).trim();
    if (!targetName) return;

    setIsCreatingFolder(true);
    setFolderActionStatus(null);
    try {
      const res = await fetch('/api/folders-hadist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: targetName }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menambahkan kategori');
      }
      setFolderActionStatus(`Berhasil: ${data.message || 'Kategori dibuat'}`);
      setNewFolderName('');
      setIsFolderModalOpen(false);
      fetchFolders();
    } catch (err: any) {
      setFolderActionStatus(`Error: ${err.message}`);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"?`)) return;
    try {
      const res = await fetch(`/api/folders-hadist?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFolders();
      } else {
        const json = await res.json();
        alert(json.error || 'Gagal menghapus kategori');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menghapus');
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
  }, [activeTab, currentPage, searchTerm, selectedBook, itemsPerPage]);

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

  const IMAM_NAMES: Record<string, string> = {
    '1': 'Shahih Bukhari',
    '2': 'Shahih Muslim',
    '3': 'Sunan Abu Daud',
    '4': 'Sunan Tirmidzi',
    '5': 'Sunan Nasa\'i',
    '6': 'Sunan Ibnu Majah',
    '7': 'Musnad Ahmad',
    '8': 'Muwatha\' Malik',
    '9': 'Sunan Darimi',
  };

  const renderChmCode = (id: string) => {
    // Pola umum Kitab 9 Imam: H1K01B01
    const match = id.match(/^H(\d+)K(\d+)(?:B(\d+))?/i);
    if (match) {
      const bukuNo = match[1];
      const imamName = IMAM_NAMES[bukuNo] || `Buku ${bukuNo}`;
      const kitab = parseInt(match[2], 10);
      const hadistNo = match[3] ? parseInt(match[3], 10) : null;
      return (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md w-fit border border-emerald-200 uppercase tracking-wider">
            {imamName} • Bab {kitab}
          </span>
          {hadistNo && (
            <span className="text-[11px] font-bold text-zinc-700 bg-zinc-100/80 px-2 py-0.5 rounded-md w-fit border border-zinc-200">
              Hadist No. {hadistNo}
            </span>
          )}
        </div>
      );
    }
    // Fallback jika tidak sesuai skema
    return <span className="text-xs text-zinc-500 font-mono bg-zinc-50 px-2 py-1 rounded border border-zinc-100">{id}</span>;
  };

  // Helper Pagination Numbers
  const totalPages = Math.max(1, Math.ceil(totalHadists / itemsPerPage));
  const renderPaginationButtons = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return pages.map((page, idx) => {
      if (page === '...') {
        return (
          <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-zinc-400 select-none">
            •••
          </span>
        );
      }
      const pageNum = page as number;
      const isActive = currentPage === pageNum;
      return (
        <button
          key={pageNum}
          onClick={() => handleSelectPage(pageNum)}
          className={`min-w-[34px] h-[34px] px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center ${
            isActive
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-bold'
              : 'bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
          }`}
        >
          {pageNum}
        </button>
      );
    });
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
            {activeTab === 'folder' && (
              <button 
                onClick={() => {
                  setNewFolderName('Buku 1 • Kitab 2');
                  setIsFolderModalOpen(true);
                }}
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-full font-medium flex items-center gap-2 hover:bg-emerald-500 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
              >
                <FolderPlus size={16} /> Tambah Kategori
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
              className="bg-zinc-900 text-white px-6 py-2.5 rounded-full font-medium flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-md"
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
            <FileText size={16} /> Koleksi Hadist {activeTab === 'hadist_chm' && <span className="ml-1 bg-zinc-100 text-zinc-500 py-0.5 px-2 rounded-md text-xs">{totalHadists}</span>}
          </button>
          <button 
            onClick={() => changeTab('folder')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'folder' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <FolderArchive size={16} /> Kategori Kitab
          </button>
          <button 
            onClick={() => changeTab('vektor')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === 'vektor' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            <Cpu size={16} /> Sinkronisasi AI {syncStatus.unsynced > 0 ? (
              <span className="ml-1 bg-amber-100 text-amber-800 py-0.5 px-2 rounded-md text-xs font-bold">
                {syncStatus.unsynced} tertinggal
              </span>
            ) : (
              <span className="ml-1 bg-emerald-100 text-emerald-700 py-0.5 px-2 rounded-md text-xs">
                {syncStatus.synced}
              </span>
            )}
          </button>
        </div>

        {/* Content Area - Glassmorphism Card */}
        <div className="bg-white/80 backdrop-blur-xl border border-black/[0.04] rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
          
          {/* Kelompok Per Kategori Kitab 9 Imam (Shahih & Sunan) */}
          {activeTab === 'hadist_chm' && (
            <div className="px-6 pt-5 pb-3 border-b border-black/[0.04] bg-white/50">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700">
                    Kategori Kitab Hadits (Shahih & Sunan)
                  </span>
                </div>
                <span className="text-xs text-zinc-400">
                  {selectedBook === 'ALL' ? 'Menampilkan semua kitab' : NINE_BOOKS.find(b => b.key === selectedBook)?.label}
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {NINE_BOOKS.map((book) => {
                  const isSelected = selectedBook === book.key;
                  const queryParams = new URLSearchParams();
                  queryParams.set('tab', 'hadist_chm');
                  if (book.slug !== 'semua') {
                    queryParams.set('buku', book.slug);
                  }
                  return (
                    <Link
                      key={book.key}
                      href={`/dashboard/hadist9imam?${queryParams.toString()}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleSelectBook(book.key);
                      }}
                      className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        isSelected
                          ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm shadow-zinc-900/20'
                          : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200/80 hover:text-zinc-900'
                      }`}
                    >
                      {book.short}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {(activeTab === 'hadist_chm' || activeTab === 'vektor') && (
            <div className="p-4 border-b border-black/[0.03] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input 
                  type="text" 
                  placeholder={activeTab === 'hadist_chm' ? `Cari judul hadist ${selectedBook !== 'ALL' ? `di ${selectedBook}` : ''}...` : 'Cari hadist...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-50/50 border border-zinc-200 rounded-full py-2.5 pl-10 pr-4 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm"
                />
              </div>

              {activeTab === 'hadist_chm' && (
                <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-zinc-500">
                  <span className="whitespace-nowrap">Baris per hal:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-emerald-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
                <p className="text-sm font-medium">Memuat data hadist...</p>
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
                      <td colSpan={5} className="p-12 text-center text-zinc-400 text-sm">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                        Tidak ada data hadist ditemukan {selectedBook !== 'ALL' ? `untuk ${selectedBook}` : ''}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Modern Pagination Controls */}
              {totalHadists > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-black/[0.03] bg-zinc-50/40">
                  <span className="text-xs text-zinc-500">
                    Menampilkan <span className="font-semibold text-zinc-900">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-zinc-900">{Math.min(currentPage * itemsPerPage, totalHadists)}</span> dari <span className="font-semibold text-zinc-900">{totalHadists}</span> hadist
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSelectPage(1)}
                      disabled={currentPage === 1}
                      title="Halaman Pertama"
                      className="px-2.5 h-[34px] rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white text-xs font-medium"
                    >
                      Awal
                    </button>
                    <button
                      onClick={() => handleSelectPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      title="Sebelumnya"
                      className="w-[34px] h-[34px] rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white flex items-center justify-center"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="flex items-center gap-1 mx-1">
                      {renderPaginationButtons()}
                    </div>

                    <button
                      onClick={() => handleSelectPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      title="Berikutnya"
                      className="w-[34px] h-[34px] rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white flex items-center justify-center"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button
                      onClick={() => handleSelectPage(totalPages)}
                      disabled={currentPage === totalPages}
                      title="Halaman Terakhir"
                      className="px-2.5 h-[34px] rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors bg-white text-xs font-medium"
                    >
                      Akhir
                    </button>
                  </div>
                </div>
              )}
              </>
            ) : activeTab === 'folder' ? (
              <div className="p-6 md:p-8 bg-zinc-50/30 space-y-8">
                {/* 1. Kategori Utama: 9 Kitab Imam (Shahih & Sunan) */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-600" />
                        Kategori Kitab 9 Imam (Shahih & Sunan)
                      </h2>
                      <p className="text-xs text-zinc-500">
                        Pengelompokan resmi 9 Kitab Hadits Induk. Klik kartu untuk langsung memfilter daftar hadist per kitab.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedBook('ALL');
                        setCurrentPage(1);
                        changeTab('hadist_chm');
                      }}
                      className="text-xs font-semibold px-4 py-2 bg-white text-zinc-700 hover:text-emerald-700 hover:border-emerald-200 rounded-xl border border-zinc-200 transition-all shadow-sm w-fit flex items-center gap-1.5"
                    >
                      <Eye size={14} /> Lihat Semua Hadist ({totalHadists})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {NINE_BOOKS.filter(b => b.key !== 'ALL').map((book) => {
                      const stats = bookStats[book.key] || { total: 0, clean: 0 };
                      return (
                        <div 
                          key={book.key} 
                          className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between mb-3">
                              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 uppercase tracking-wider">
                                Buku {book.bookNo}
                              </span>
                              <button
                                onClick={() => handleSelectBook(book.key)}
                                title={`Buka ${book.name}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                              >
                                Buka <ChevronRight size={13} />
                              </button>
                            </div>
                            <h3 className="font-bold text-zinc-900 text-base group-hover:text-emerald-700 transition-colors">
                              {book.name}
                            </h3>
                            <p className="text-xs font-medium text-emerald-600/90 mt-0.5">
                              {book.compiler}
                            </p>
                            <p className="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
                              {book.desc}
                            </p>
                          </div>

                          <div className="mt-5 pt-3.5 border-t border-zinc-100 flex items-center justify-between text-xs">
                            <span className="font-medium text-zinc-600">
                              {stats.total > 0 ? (
                                <span className="text-zinc-900 font-bold">{stats.total.toLocaleString('id-ID')} Hadist</span>
                              ) : (
                                <span className="text-zinc-400 italic">Riwayat {book.key}</span>
                              )}
                            </span>
                            <button
                              onClick={() => handleSelectBook(book.key)}
                              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
                            >
                              Jelajahi &rarr;
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Kategori Tambahan / Bab Khusus */}
                <div className="pt-6 border-t border-zinc-200/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                        <FolderArchive className="w-4 h-4 text-zinc-600" />
                        Kategori & Bab Khusus Tambahan
                      </h3>
                      <p className="text-xs text-zinc-500">Kategori kustom atau folder khusus yang dibuat manual / hasil ekstraksi.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setNewFolderName('');
                          setIsFolderModalOpen(true);
                        }}
                        className="text-xs font-semibold px-3.5 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 rounded-full transition-colors flex items-center gap-1.5 shadow-sm"
                      >
                        <FolderPlus size={13} /> Tambah Kategori
                      </button>
                    </div>
                  </div>

                  {folderActionStatus && (
                    <div className="mb-4 text-xs font-medium px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
                      {folderActionStatus}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {folders.map(f => (
                      <div key={f.id} className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group relative flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                              <FolderArchive className="w-4 h-4 text-zinc-600" />
                            </div>
                            <button
                              onClick={() => handleDeleteFolder(f.id, f.name)}
                              title="Hapus Kategori"
                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                          <h3 className="font-semibold text-zinc-900 text-[15px]">{f.name}</h3>
                          {f.description && (
                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{f.description}</p>
                          )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                          <span>{f.stats?.total ? `${f.stats.total} Hadist` : 'Belum ada hadist'}</span>
                          <span>{new Date(f.created_at).toLocaleDateString('id-ID')}</span>
                        </div>
                      </div>
                    ))}
                    {folders.length === 0 && (
                      <div className="col-span-full py-8 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
                        <FolderArchive className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                        <p className="text-xs font-medium text-zinc-500">Belum ada folder/kategori kustom tambahan.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 md:p-8 bg-zinc-50/30 space-y-6">
                {/* Panel Kontrol Sinkronisasi AI */}
                <div className="bg-white border border-zinc-200/80 rounded-3xl p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-100">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Cpu className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                          Sinkronisasi AI Hadist 9 Imam
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                            AI Vector Search
                          </span>
                        </h2>
                        <p className="text-xs text-zinc-500 mt-1 max-w-2xl leading-relaxed">
                          Fungsi ini mengubah teks hadist menjadi potongan vektor (chunks) agar fitur pencarian semantik AI, asisten kajian, dan simulator tanya jawab hadist dapat menemukan hadist secara cerdas berdasarkan konteks makna (bukan hanya kecocokan kata kunci).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={fetchSyncStatus}
                        title="Perbarui Status"
                        className="p-2.5 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors bg-white"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={handleSyncAI}
                        disabled={isVectorSyncing || syncStatus.unsynced === 0}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isVectorSyncing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        {isVectorSyncing 
                          ? 'Sedang Memproses Sinkronisasi...' 
                          : syncStatus.unsynced > 0 
                            ? `Sinkronkan AI Sekarang (${syncStatus.unsynced.toLocaleString('id-ID')} Hadist)` 
                            : 'Semua Hadist Sudah Tersinkron AI'}
                      </button>
                    </div>
                  </div>

                  {/* Metrik Status Vektorisasi */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
                    <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/60">
                      <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-1">
                        Total Data Hadist
                      </span>
                      <span className="text-2xl font-bold text-zinc-900">
                        {syncStatus.total.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-zinc-400 block mt-0.5">Seluruh database CHM</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                      <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
                        Tersinkron AI (Vektor)
                      </span>
                      <span className="text-2xl font-bold text-emerald-700">
                        {syncStatus.synced.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-emerald-600 block mt-0.5">Siap digunakan AI Search</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                      <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block mb-1">
                        Belum Tersinkron
                      </span>
                      <span className="text-2xl font-bold text-amber-700">
                        {syncStatus.unsynced.toLocaleString('id-ID')}
                      </span>
                      <span className="text-xs text-amber-600 block mt-0.5">Perlu disinkronkan</span>
                    </div>
                  </div>
                </div>

                {/* Tabel Preview Cuplikan Vektor Terkini */}
                <div className="bg-white border border-zinc-200/80 rounded-3xl overflow-hidden shadow-sm">
                  <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">
                        Sampel Potongan Vektor AI (Chunks Terkini)
                      </h3>
                      <p className="text-xs text-zinc-500">Contoh data yang telah dipecah untuk pencarian vektor AI.</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600">
                      {vektors.length} Sampel Terakhir
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-50/60 border-b border-zinc-100">
                          <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider w-1/4">Judul Hadist</th>
                          <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Isi Cuplikan Vektor (Embedding Text)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {vektors.map((v, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/40 transition-colors">
                            <td className="p-4 text-xs font-semibold text-emerald-700 align-top">
                              {v.judul_hadist}
                            </td>
                            <td className="p-4 text-xs text-zinc-600 leading-relaxed">
                              <span className="line-clamp-3 font-normal">{v.content}</span>
                            </td>
                          </tr>
                        ))}
                        {vektors.length === 0 && (
                          <tr>
                            <td colSpan={2} className="p-12 text-center text-zinc-400 text-xs">
                              <Cpu className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                              Belum ada vektor AI yang dihasilkan. Klik tombol &quot;Sinkronkan AI Sekarang&quot; di atas untuk memulai.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Dialog Tambah Kategori */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-black/[0.06] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FolderPlus size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 text-base">Tambah Kategori Hadist</h3>
                  <p className="text-xs text-zinc-500">Buat jilid atau kelompok kitab baru</p>
                </div>
              </div>
              <button 
                onClick={() => setIsFolderModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Nama Kategori / Kitab
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Contoh: Buku 1 • Kitab 2"
                  className="w-full px-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Template Cepat
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Shahih Bukhari • Kitab Iman',
                    'Shahih Bukhari • Kitab Shalat',
                    'Shahih Muslim • Kitab Thaharah',
                    'Sunan Abu Daud • Kitab Shalat',
                    'Sunan Tirmidzi • Kitab Zakat',
                  ].map(tmpl => (
                    <button
                      key={tmpl}
                      type="button"
                      onClick={() => setNewFolderName(tmpl)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-emerald-50 hover:text-emerald-700 text-zinc-600 font-medium transition-colors border border-zinc-200/60"
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isCreatingFolder || !newFolderName.trim()}
                onClick={() => handleCreateFolder()}
                className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isCreatingFolder ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {isCreatingFolder ? 'Menyimpan...' : 'Simpan Kategori'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
