'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Loader2, Plus, Edit2, Trash2, Search, Database, 
  FolderArchive, FileText, CheckSquare, Download,
  Sparkles, RefreshCw, ChevronLeft, ChevronRight, Filter, ArrowUpRight,
  CheckCircle2, X
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

function AdminDataBrosurContent() {
  const [activeTab, setActiveTab] = useState<'brosur' | 'folder'>('brosur');
  const [brosurs, setBrosurs] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination & Filter (Default urutan: Terbaru / Baru Upload Teratas)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBrosurs, setTotalBrosurs] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterFolder, setFilterFolder] = useState<string>('');
  const [filterTahun, setFilterTahun] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('terbaru');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Snackbar Notification State
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; sub?: string } | null>(null);

  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Deteksi jika baru selesai upload / create dari parameter URL
  useEffect(() => {
    const success = searchParams.get('success');
    const title = searchParams.get('title');

    if (success === 'created') {
      setSnackbar({
        show: true,
        message: 'Brosur Berhasil Ditambahkan',
        sub: title ? `"${decodeURIComponent(title)}" kini ada di posisi paling atas.` : 'Data telah tersimpan di urutan teratas.'
      });
    } else if (success === 'updated') {
      setSnackbar({
        show: true,
        message: 'Brosur Berhasil Diperbarui',
        sub: title ? `Perubahan pada "${decodeURIComponent(title)}" telah disimpan.` : 'Perubahan data telah disimpan.'
      });
    } else if (success === 'deleted') {
      setSnackbar({
        show: true,
        message: 'Brosur Berhasil Dihapus',
        sub: title ? `"${decodeURIComponent(title)}" telah dihapus dari sistem.` : 'Data telah dihapus.'
      });
    }

    if (success) {
      // Bersihkan search params dari URL tanpa reload
      const timer = setTimeout(() => {
        router.replace('/admin/data-brosur');
      }, 500);

      // Otomatis hilangkan snackbar setelah 5 detik
      const hideTimer = setTimeout(() => {
        setSnackbar(null);
      }, 5000);

      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, [searchParams, router]);

  // Debounce search input
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  // Fetch Folders & Seluruh Tahun dari Database
  const fetchFolders = async () => {
    const { data } = await supabase.from('folders').select('id, name').order('name');
    if (data) setFolders(data);
  };

  const fetchYears = async () => {
    try {
      let allYears = new Set<number>();
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('brosur')
          .select('tahun')
          .not('tahun', 'is', null)
          .range(from, from + step - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          data.forEach(d => {
            if (d.tahun) allYears.add(d.tahun);
          });
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        }
      }

      const sortedYears = Array.from(allYears).sort((a, b) => b - a);
      setAvailableYears(sortedYears);
    } catch (e) {
      console.error('Error fetching available years:', e);
      const currentYear = new Date().getFullYear();
      const fallbackYears: number[] = [];
      for (let y = currentYear; y >= 1995; y--) {
        fallbackYears.push(y);
      }
      setAvailableYears(fallbackYears);
    }
  };

  useEffect(() => {
    fetchFolders();
    fetchYears();
  }, []);

  // Fetch Brosur Data (Urutan Terbaru menjadi default)
  const fetchBrosurs = async () => {
    setLoading(true);
    let query = supabase
      .from('brosur')
      .select('id, judul, tahun, slug, created_at, folder_id, folders(name)', { count: 'exact' });

    if (sortBy === 'terbaru') {
      // Prioritaskan yang baru saja diupload/dibuat teratas
      query = query.order('created_at', { ascending: false, nullsFirst: false });
    } else if (sortBy === 'tahun_desc') {
      query = query.order('tahun', { ascending: false }).order('judul', { ascending: true });
    } else if (sortBy === 'tahun_asc') {
      query = query.order('tahun', { ascending: true }).order('judul', { ascending: true });
    } else if (sortBy === 'judul_asc') {
      query = query.order('judul', { ascending: true });
    } else if (sortBy === 'judul_desc') {
      query = query.order('judul', { ascending: false });
    }

    if (searchTerm.trim()) {
      query = query.ilike('judul', `%${searchTerm.trim()}%`);
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

    const { data, count, error } = await query.range(from, to);
    if (!error && data) {
      setBrosurs(data);
      if (count !== null) setTotalBrosurs(count);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'brosur') {
      fetchBrosurs();
    }
  }, [activeTab, searchTerm, filterFolder, filterTahun, sortBy, currentPage, itemsPerPage]);

  const handleDeleteBrosur = async (id: string, judul: string) => {
    if (!confirm(`Hapus brosur "${judul}"?`)) return;
    setDeletingId(id);
    try {
      await supabase.from('brosur_chunks').delete().eq('brosur_id', id);
      const { error } = await supabase.from('brosur').delete().eq('id', id);
      if (error) throw error;
      setBrosurs(prev => prev.filter(b => b.id !== id));
      setTotalBrosurs(prev => Math.max(0, prev - 1));
      
      // Tampilkan snackbar konfirmasi hapus
      setSnackbar({
        show: true,
        message: 'Brosur Berhasil Dihapus',
        sub: `"${judul}" telah dihapus dari sistem.`
      });
      setTimeout(() => setSnackbar(null), 4000);
    } catch (err: any) {
      alert(`Gagal menghapus brosur: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(totalBrosurs / itemsPerPage) || 1;

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-300 pb-16 relative">
      
      {/* Floating Modern Clean Snackbar Notification */}
      {snackbar?.show && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900 text-white px-4 py-3.5 rounded-2xl shadow-lg border border-zinc-800 animate-in slide-in-from-bottom-5 duration-200 max-w-md">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white leading-tight">
              {snackbar.message}
            </p>
            {snackbar.sub && (
              <p className="text-[11px] text-zinc-400 mt-0.5 truncate leading-tight">
                {snackbar.sub}
              </p>
            )}
          </div>
          <button
            onClick={() => setSnackbar(null)}
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Clean Gemini */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 mb-1">
            Database Brosur
          </h1>
          <p className="text-zinc-500 text-sm max-w-2xl leading-relaxed">
            Kelola arsip edisi brosur Ahad Pagi dan kategori koleksi tematik dalam tampilan bersih dan terstruktur.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <Link
            href="/admin/data-brosur/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition"
          >
            <Plus size={15} />
            <span>Tambah Brosur</span>
          </Link>
        </div>
      </div>

      {/* Tab Navigasi Bersih Gemini Pill (Selected Soft Green) */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100/70 rounded-2xl w-fit">
        <button
          onClick={() => { setActiveTab('brosur'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'brosur'
              ? 'bg-white text-emerald-700 font-bold'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <FileText size={14} className={activeTab === 'brosur' ? 'text-emerald-600' : ''} />
          <span>Daftar Brosur ({totalBrosurs.toLocaleString('id-ID')})</span>
        </button>

        <button
          onClick={() => { setActiveTab('folder'); setCurrentPage(1); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'folder'
              ? 'bg-white text-emerald-700 font-bold'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <FolderArchive size={14} className={activeTab === 'folder' ? 'text-emerald-600' : ''} />
          <span>Koleksi Tematik ({folders.length})</span>
        </button>
      </div>

      {activeTab === 'brosur' ? (
        <div className="space-y-4">
          {/* Bar Filter Bersih Ala AI Agent Search (Responsif) */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 bg-[#FAFAFA] p-2.5 sm:p-3 rounded-2xl">
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari judul edisi atau nomor brosur..."
                className="w-full bg-white rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium"
              />
            </div>

            {/* Dropdown Filters Responsif */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex items-center gap-2 w-full lg:w-auto">
              <select
                value={filterFolder}
                onChange={(e) => { setFilterFolder(e.target.value); setCurrentPage(1); }}
                className="col-span-2 sm:col-span-1 bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-700 outline-none w-full"
              >
                <option value="">Semua Koleksi</option>
                <option value="none">Tanpa Koleksi</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              <select
                value={filterTahun}
                onChange={(e) => { setFilterTahun(e.target.value); setCurrentPage(1); }}
                className="bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-700 outline-none w-full"
              >
                <option value="">Semua Tahun ({availableYears.length})</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                className="bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-700 outline-none w-full"
              >
                <option value="terbaru">Baru Diupload (Teratas)</option>
                <option value="tahun_desc">Tahun Baru</option>
                <option value="tahun_asc">Tahun Lama</option>
                <option value="judul_asc">Judul A-Z</option>
                <option value="judul_desc">Judul Z-A</option>
              </select>

              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-700 outline-none w-full lg:w-28"
              >
                <option value={10}>10 data</option>
                <option value={20}>20 data</option>
                <option value={50}>50 data</option>
                <option value={100}>100 data</option>
              </select>
            </div>
          </div>

          {/* List Content Clean Flat Tanpa Shadow */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-emerald-600" size={24} />
              <p className="text-xs text-zinc-400 font-medium">Memuat data brosur...</p>
            </div>
          ) : brosurs.length === 0 ? (
            <div className="py-16 text-center bg-[#FAFAFA] rounded-2xl">
              <FileText className="mx-auto text-zinc-300 mb-2" size={32} />
              <p className="text-xs font-semibold text-zinc-600">Tidak ada brosur ditemukan</p>
              <p className="text-[11px] text-zinc-400 mt-1">Coba gunakan kata kunci pencarian atau filter yang lain.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {brosurs.map((b) => {
                const isDeleting = deletingId === b.id;

                return (
                  <div
                    key={b.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[#FAFAFA] hover:bg-zinc-100/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {b.tahun && (
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                            Tahun {b.tahun}
                          </span>
                        )}
                        {b.folders?.name && (
                          <span className="text-[10px] font-medium text-zinc-500 bg-white px-2 py-0.5 rounded-md truncate max-w-[150px]">
                            {b.folders.name}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-400 font-mono">
                          ID: {b.id.slice(0, 8)}
                        </span>
                      </div>

                      <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 group-hover:text-emerald-700 transition leading-snug line-clamp-2 sm:line-clamp-1">
                        {b.judul || 'Tanpa Judul'}
                      </h3>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-200/50">
                      <Link
                        href={`/bap/${b.tahun || '2026'}/${b.slug || b.id}`}
                        target="_blank"
                        className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-emerald-600 hover:bg-white transition flex items-center gap-1"
                        title="Lihat Pratinjau Brosur"
                      >
                        <span className="text-[11px] sm:hidden">Buka</span>
                        <ArrowUpRight size={14} />
                      </Link>

                      <Link
                        href={`/admin/data-brosur/edit/${b.id}`}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-500 hover:text-emerald-700 hover:bg-white transition flex items-center gap-1"
                        title="Sunting Brosur"
                      >
                        <span className="text-[11px] sm:hidden">Edit</span>
                        <Edit2 size={13} />
                      </Link>

                      <button
                        onClick={() => handleDeleteBrosur(b.id, b.judul)}
                        disabled={isDeleting}
                        className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-white transition disabled:opacity-50"
                        title="Hapus Brosur"
                      >
                        {isDeleting ? <Loader2 size={14} className="animate-spin text-red-500" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Paginasi Bersih Responsif Tanpa Shadow */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 bg-[#FAFAFA] rounded-2xl">
                  <span className="text-xs text-zinc-500 font-medium text-center sm:text-left">
                    Halaman <span className="font-bold text-zinc-900">{currentPage}</span> dari <span className="font-bold text-zinc-900">{totalPages}</span> ({totalBrosurs} data)
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 sm:px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                    >
                      <ChevronLeft size={14} />
                      <span>Sebelumnya</span>
                    </button>

                    <div className="px-2 text-xs font-bold text-zinc-800">
                      {currentPage}
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 sm:px-3 py-1.5 bg-white rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                    >
                      <span>Berikutnya</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Tab Koleksi Tematik */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {folders.map((f) => (
            <div
              key={f.id}
              className="p-5 rounded-2xl bg-[#FAFAFA] hover:bg-emerald-50/40 transition flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-white text-emerald-600 flex items-center justify-center">
                  <FolderArchive size={16} />
                </div>
                <h4 className="font-semibold text-xs text-zinc-900 truncate">
                  {f.name}
                </h4>
              </div>
              <p className="text-[11px] text-zinc-400">
                Koleksi Brosur Tematik
              </p>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default function AdminDataBrosurPage() {
  return (
    <Suspense fallback={
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-emerald-600" size={24} />
        <p className="text-xs text-zinc-400 font-medium">Memuat...</p>
      </div>
    }>
      <AdminDataBrosurContent />
    </Suspense>
  );
}
