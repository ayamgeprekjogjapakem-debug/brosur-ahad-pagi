'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Loader2, Plus, Edit2, Trash2, Search, Database, 
  FolderArchive, FileText, CheckSquare, Download,
  Sparkles, RefreshCw, ChevronLeft, ChevronRight, Filter, ArrowUpRight,
  CheckCircle2, X, BookOpen, Calendar, Eye, EyeOff
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface AdminDataBrosurViewProps {
  initialTab?: 'brosur' | 'koleksi' | 'tahun';
}

export default function AdminDataBrosurView({ initialTab = 'brosur' }: AdminDataBrosurViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Tab State: 'brosur' | 'koleksi' | 'tahun'
  const [activeTab, setActiveTab] = useState<'brosur' | 'koleksi' | 'tahun'>(initialTab);

  // Brosur List State
  const [brosurs, setBrosurs] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Count Maps (Jumlah brosur per koleksi & per tahun)
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [yearCounts, setYearCounts] = useState<Record<number, number>>({});

  // Pagination & Filters Brosur
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBrosurs, setTotalBrosurs] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterFolder, setFilterFolder] = useState<string>(searchParams?.get('folder') || '');
  const [filterTahun, setFilterTahun] = useState<string>(searchParams?.get('tahun') || '');
  const [filterParsing, setFilterParsing] = useState<'all' | 'sudah' | 'belum'>('all');
  const [sortBy, setSortBy] = useState<string>('terbaru');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pagination & Filter untuk Tab Koleksi
  const [searchKoleksi, setSearchKoleksi] = useState('');
  const [pageKoleksi, setPageKoleksi] = useState(1);
  const itemsPerKoleksiPage = 9;

  // Koleksi Modal & Action State (Tambah / Edit / Hapus)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<any | null>(null);
  const [folderName, setFolderName] = useState('');
  const [folderSlug, setFolderSlug] = useState('');
  const [folderDesc, setFolderDesc] = useState('');
  const [folderSlugTouched, setFolderSlugTouched] = useState(false);
  const [folderIsEnabled, setFolderIsEnabled] = useState(true);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [folderModalError, setFolderModalError] = useState('');
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);

  // Koleksi Enable/Disable State (Persisted in system_settings: disabled_folders)
  const [disabledFolders, setDisabledFolders] = useState<string[]>([]);
  const [isTogglingFolderId, setIsTogglingFolderId] = useState<string | null>(null);

  // Pagination & Filter untuk Tab Tahun
  const [searchTahun, setSearchTahun] = useState('');
  const [pageTahun, setPageTahun] = useState(1);
  const itemsPerTahunPage = 12;

  // Tahun Modal State (Tambah Tahun)
  const [isYearModalOpen, setIsYearModalOpen] = useState(false);
  const [newYearInput, setNewYearInput] = useState(new Date().getFullYear().toString());
  const [isSavingYear, setIsSavingYear] = useState(false);
  const [yearModalError, setYearModalError] = useState('');

  // Parsing Stats State (hadist_brosur)
  const [parsingStats, setParsingStats] = useState<{ totalHadist: number; parsedBrosurIds: Set<string> }>({
    totalHadist: 0,
    parsedBrosurIds: new Set(),
  });

  // Quick Assign Folder Modal State
  const [quickFolderBrosur, setQuickFolderBrosur] = useState<any | null>(null);
  const [quickSelectedFolderId, setQuickSelectedFolderId] = useState<string>('');
  const [isSavingQuickFolder, setIsSavingQuickFolder] = useState(false);

  // Single & Batch Parsing State
  const [parsingBrosurId, setParsingBrosurId] = useState<string | null>(null);
  const [isBatchParsing, setIsBatchParsing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; currentTitle: string }>({
    current: 0,
    total: 0,
    currentTitle: '',
  });

  // Snackbar Notification State
  const [snackbar, setSnackbar] = useState<{ show: boolean; message: string; sub?: string } | null>(null);

  // Sinkronkan tab dari prop atau search param 'tab'
  useEffect(() => {
    const qTab = searchParams?.get('tab');
    if (qTab === 'koleksi' || qTab === 'folder') {
      setActiveTab('koleksi');
    } else if (qTab === 'tahun') {
      setActiveTab('tahun');
    } else if (pathname.includes('/koleksi')) {
      setActiveTab('koleksi');
    } else if (pathname.includes('/tahun')) {
      setActiveTab('tahun');
    } else {
      setActiveTab(initialTab);
    }
  }, [searchParams, pathname, initialTab]);

  // Sinkronkan filter folder dan tahun dari URL search params
  useEffect(() => {
    const qFolder = searchParams?.get('folder');
    const qTahun = searchParams?.get('tahun');
    
    if (qFolder !== null && qFolder !== undefined) {
      setFilterFolder(qFolder);
      setActiveTab('brosur');
      setCurrentPage(1);
    }
    if (qTahun !== null && qTahun !== undefined) {
      setFilterTahun(qTahun);
      setActiveTab('brosur');
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Snackbar feedback dari action create/update/delete
  useEffect(() => {
    const success = searchParams?.get('success');
    const title = searchParams?.get('title');

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
      const timer = setTimeout(() => {
        router.replace('/admin/data-brosur');
      }, 500);

      const hideTimer = setTimeout(() => {
        setSnackbar(null);
      }, 5000);

      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    }
  }, [searchParams, router]);

  // Debounce search input brosur
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearchTerm(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  // Fetch Metadata Folders & Years
  const fetchFolders = async () => {
    const { data } = await supabase.from('folders').select('id, name, slug, description, created_at').order('name');
    if (data) setFolders(data);

    try {
      const { data: settingData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'disabled_folders')
        .maybeSingle();

      if (settingData?.value) {
        const parsed = JSON.parse(settingData.value);
        if (Array.isArray(parsed)) setDisabledFolders(parsed);
      }
    } catch (e) {
      console.warn('Gagal membaca disabled_folders:', e);
    }
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

      // Ambil daftar custom_years yang tersimpan di system_settings jika ada
      try {
        const { data: customYearsSetting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'custom_years')
          .single();

        if (customYearsSetting && customYearsSetting.value) {
          const parsed = JSON.parse(customYearsSetting.value);
          if (Array.isArray(parsed)) {
            parsed.forEach((y: any) => {
              const num = parseInt(y, 10);
              if (!isNaN(num)) allYears.add(num);
            });
          }
        }
      } catch (err) {
        console.warn('Could not load custom_years setting:', err);
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

  // Hitung jumlah brosur per folder dan per tahun secara efisien
  const fetchCounts = async () => {
    try {
      const { data } = await supabase.from('brosur').select('folder_id, tahun');
      if (data) {
        const fCounts: Record<string, number> = {};
        const yCounts: Record<number, number> = {};
        data.forEach((b: any) => {
          if (b.folder_id) {
            fCounts[b.folder_id] = (fCounts[b.folder_id] || 0) + 1;
          }
          if (b.tahun) {
            yCounts[b.tahun] = (yCounts[b.tahun] || 0) + 1;
          }
        });
        setFolderCounts(fCounts);
        setYearCounts(yCounts);
      }
    } catch (e) {
      console.error('Error fetching counts:', e);
    }
  };

  const fetchParsingStats = async () => {
    try {
      const idSet = new Set<string>();
      let from = 0;
      const step = 1000;
      let hasMore = true;
      let total = 0;

      while (hasMore) {
        const { data, count, error } = await supabase
          .from('hadist_brosur')
          .select('brosur_id', { count: 'exact' })
          .not('brosur_id', 'is', null)
          .range(from, from + step - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          if (count !== null && total === 0) total = count;
          data.forEach((item: any) => {
            if (item.brosur_id) idSet.add(item.brosur_id);
          });
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        }
      }

      setParsingStats({
        totalHadist: total || idSet.size,
        parsedBrosurIds: idSet,
      });
    } catch (e) {
      console.error('Error fetching parsing stats:', e);
    }
  };

  useEffect(() => {
    fetchFolders();
    fetchYears();
    fetchCounts();
    fetchParsingStats();
  }, []);

  // Fetch Brosur Data
  const fetchBrosurs = async () => {
    setLoading(true);

    // Jika filter parsing "sudah", gunakan !inner join agar native SQL inner join tanpa URL overhead
    const selectClause = filterParsing === 'sudah'
      ? 'id, judul, tahun, slug, created_at, folder_id, folders(name), hadist_brosur!inner(id)'
      : 'id, judul, tahun, slug, created_at, folder_id, folders(name), hadist_brosur(id)';

    let query = supabase
      .from('brosur')
      .select(selectClause, { count: 'exact' });

    if (sortBy === 'terbaru') {
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

    if (filterParsing === 'belum') {
      let currentSet = parsingStats.parsedBrosurIds;
      if (currentSet.size === 0) {
        const { data: hData } = await supabase.from('hadist_brosur').select('brosur_id');
        if (hData) {
          currentSet = new Set(hData.map((h: any) => h.brosur_id).filter(Boolean));
        }
      }

      const parsedIds = Array.from(currentSet);
      if (parsedIds.length > 0 && parsedIds.length <= 150) {
        query = query.not('id', 'in', `(${parsedIds.map(id => `"${id}"`).join(',')})`);
      }
    }

    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    const { data, count, error } = await query.range(from, to);
    if (!error && data) {
      let filteredData = data;
      if (filterParsing === 'belum' && parsingStats.parsedBrosurIds.size > 150) {
        filteredData = data.filter((b: any) => !b.hadist_brosur || b.hadist_brosur.length === 0);
      }
      setBrosurs(filteredData);
      if (count !== null) setTotalBrosurs(count);
    } else if (error) {
      console.error('Error fetching brosurs:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'brosur') {
      fetchBrosurs();
    }
  }, [activeTab, searchTerm, filterFolder, filterTahun, filterParsing, sortBy, currentPage, itemsPerPage]);

  // Handler Parsing Hadits Tunggal (Realtime)
  const handleParseSingleBrosur = async (brosurId: string, judul: string, isReparse = false) => {
    setParsingBrosurId(brosurId);
    try {
      if (isReparse) {
        // Bersihkan hadits lama brosur ini agar tidak terduplikasi
        await supabase.from('hadist_brosur').delete().eq('brosur_id', brosurId);
      }

      const res = await fetch('/api/hadist/generate-from-brosur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brosur_id: brosurId,
          auto_save: true,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Gagal memproses parsing brosur');
      }

      const count = result.count || result.items?.length || 0;

      // Perbarui state brosurs di tabel secara realtime
      setBrosurs(prev => prev.map(b => {
        if (b.id === brosurId) {
          return {
            ...b,
            hadist_brosur: count > 0 ? Array(count).fill({ id: 'parsed' }) : [],
          };
        }
        return b;
      }));

      // Perbarui statistik
      setParsingStats(prev => {
        const newSet = new Set(prev.parsedBrosurIds);
        if (count > 0) {
          newSet.add(brosurId);
        } else {
          newSet.delete(brosurId);
        }
        return {
          totalHadist: Math.max(0, prev.totalHadist + count),
          parsedBrosurIds: newSet,
        };
      });

      if (count > 0) {
        setSnackbar({
          show: true,
          message: isReparse ? 'Parsing Ulang Berhasil!' : 'Parsing Hadits Berhasil!',
          sub: `Ditemukan & disimpan ${count} hadits dari brosur "${judul}".`
        });
      } else {
        setSnackbar({
          show: true,
          message: 'Parsing Selesai',
          sub: `Tidak ditemukan kutipan hadits/matan Arab pada brosur "${judul}".`
        });
      }
      setTimeout(() => setSnackbar(null), 5000);
    } catch (err: any) {
      console.error('Error parsing single brosur:', err);
      alert(`Gagal memparsing brosur "${judul}": ${err.message}`);
    } finally {
      setParsingBrosurId(null);
    }
  };

  // Handler Batch Parsing untuk semua brosur yang belum diparsing di halaman aktif
  const handleBatchParseCurrentPage = async () => {
    const unparsedOnPage = brosurs.filter(b => !b.hadist_brosur || b.hadist_brosur.length === 0);

    if (unparsedOnPage.length === 0) {
      alert('Semua brosur yang tampil pada halaman ini sudah diparsing.');
      return;
    }

    if (!confirm(`Mulai parsing otomatis ${unparsedOnPage.length} brosur yang belum diparsing pada halaman ini?`)) {
      return;
    }

    setIsBatchParsing(true);
    let totalFound = 0;
    let successCount = 0;

    for (let i = 0; i < unparsedOnPage.length; i++) {
      const bro = unparsedOnPage[i];
      setBatchProgress({
        current: i + 1,
        total: unparsedOnPage.length,
        currentTitle: bro.judul || 'Brosur',
      });

      try {
        const res = await fetch('/api/hadist/generate-from-brosur', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brosur_id: bro.id,
            auto_save: true,
          }),
        });

        if (res.ok) {
          const result = await res.json();
          const count = result.count || result.items?.length || 0;
          totalFound += count;
          successCount++;

          setBrosurs(prev => prev.map(b => {
            if (b.id === bro.id) {
              return {
                ...b,
                hadist_brosur: count > 0 ? Array(count).fill({ id: 'parsed' }) : [],
              };
            }
            return b;
          }));

          if (count > 0) {
            setParsingStats(prev => {
              const newSet = new Set(prev.parsedBrosurIds);
              newSet.add(bro.id);
              return {
                totalHadist: prev.totalHadist + count,
                parsedBrosurIds: newSet,
              };
            });
          }
        }
      } catch (e) {
        console.error(`Error batch parsing ${bro.id}:`, e);
      }
    }

    setIsBatchParsing(false);
    setBatchProgress({ current: 0, total: 0, currentTitle: '' });

    setSnackbar({
      show: true,
      message: 'Batch Parsing Selesai!',
      sub: `Berhasil memproses ${successCount} brosur. Total ${totalFound} hadits berhasil diekstrak.`
    });
    setTimeout(() => setSnackbar(null), 6000);
    fetchParsingStats();
  };

  const handleDeleteBrosur = async (id: string, judul: string) => {
    if (!confirm(`Hapus brosur "${judul}"?`)) return;
    setDeletingId(id);
    try {
      await supabase.from('brosur_chunks').delete().eq('brosur_id', id);
      const { error } = await supabase.from('brosur').delete().eq('id', id);
      if (error) throw error;
      setBrosurs(prev => prev.filter(b => b.id !== id));
      setTotalBrosurs(prev => Math.max(0, prev - 1));
      
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

  // Helper & Handlers untuk Manajemen Koleksi Tematik
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleFolderNameChange = (val: string) => {
    setFolderName(val);
    if (!folderSlugTouched) {
      setFolderSlug(generateSlug(val));
    }
  };

  const handleOpenCreateFolder = () => {
    setEditingFolder(null);
    setFolderName('');
    setFolderSlug('');
    setFolderDesc('');
    setFolderSlugTouched(false);
    setFolderIsEnabled(true);
    setFolderModalError('');
    setIsFolderModalOpen(true);
  };

  const handleOpenEditFolder = (f: any) => {
    setEditingFolder(f);
    setFolderName(f.name || '');
    setFolderSlug(f.slug || '');
    setFolderDesc(f.description || '');
    setFolderSlugTouched(true);
    const isCurrentlyDisabled = disabledFolders.includes(f.slug) || disabledFolders.includes(f.id);
    setFolderIsEnabled(!isCurrentlyDisabled);
    setFolderModalError('');
    setIsFolderModalOpen(true);
  };

  const handleToggleFolderVisibility = async (f: any) => {
    const isCurrentlyDisabled = disabledFolders.includes(f.slug) || disabledFolders.includes(f.id);
    const identifier = f.slug || f.id;

    const updated = isCurrentlyDisabled
      ? disabledFolders.filter((item) => item !== f.slug && item !== f.id && item !== identifier)
      : Array.from(new Set([...disabledFolders, f.slug, f.id].filter(Boolean)));

    setDisabledFolders(updated);
    setIsTogglingFolderId(f.id);

    try {
      await supabase.from('system_settings').upsert({
        key: 'disabled_folders',
        value: JSON.stringify(updated),
      });

      setSnackbar({
        show: true,
        message: isCurrentlyDisabled ? 'Koleksi Diaktifkan' : 'Koleksi Dinonaktifkan',
        sub: isCurrentlyDisabled
          ? `Koleksi "${f.name}" kini aktif dan muncul di publik (/koleksi/${f.slug} & Sidebar).`
          : `Koleksi "${f.name}" disembunyikan dari publik (hanya terlihat oleh admin).`
      });
      setTimeout(() => setSnackbar(null), 4000);
    } catch (err: any) {
      console.error('Error toggling visibility:', err);
      alert(`Gagal mengubah status: ${err.message}`);
    } finally {
      setIsTogglingFolderId(null);
    }
  };

  const handleSaveFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFolderModalError('');

    const trimmedName = folderName.trim();
    const trimmedSlug = (folderSlug || generateSlug(trimmedName)).trim();
    const trimmedDesc = folderDesc.trim();

    if (!trimmedName) {
      setFolderModalError('Nama koleksi wajib diisi.');
      return;
    }
    if (!trimmedSlug) {
      setFolderModalError('Slug koleksi wajib diisi.');
      return;
    }

    setIsSavingFolder(true);

    try {
      let savedFolderId = editingFolder?.id;

      if (editingFolder) {
        const { error } = await supabase
          .from('folders')
          .update({
            name: trimmedName,
            slug: trimmedSlug,
            description: trimmedDesc || null,
          })
          .eq('id', editingFolder.id);

        if (error) throw error;

        setSnackbar({
          show: true,
          message: 'Koleksi Berhasil Diperbarui',
          sub: `Perubahan "${trimmedName}" telah disimpan.`
        });
      } else {
        const { data: newF, error } = await supabase
          .from('folders')
          .insert({
            name: trimmedName,
            slug: trimmedSlug,
            description: trimmedDesc || null,
          })
          .select('id')
          .single();

        if (error) throw error;
        savedFolderId = newF?.id;

        setSnackbar({
          show: true,
          message: 'Koleksi Berhasil Ditambahkan',
          sub: `Koleksi "${trimmedName}" siap digunakan untuk mengelompokkan brosur.`
        });
      }

      // Sinkronkan status enable/disable ke system_settings
      const updatedDisabled = folderIsEnabled
        ? disabledFolders.filter((item) => item !== trimmedSlug && item !== savedFolderId)
        : Array.from(new Set([...disabledFolders, trimmedSlug, savedFolderId].filter(Boolean)));

      setDisabledFolders(updatedDisabled);
      await supabase.from('system_settings').upsert({
        key: 'disabled_folders',
        value: JSON.stringify(updatedDisabled),
      });

      setTimeout(() => setSnackbar(null), 4000);
      setIsFolderModalOpen(false);
      await fetchFolders();
      await fetchCounts();
    } catch (err: any) {
      console.error('Error saving folder:', err);
      setFolderModalError(err.message || 'Gagal menyimpan koleksi. Pastikan slug unik.');
    } finally {
      setIsSavingFolder(false);
    }
  };

  const handleDeleteFolder = async (id: string, name: string, count: number) => {
    if (count > 0) {
      const confirmMsg = `Perhatian: Koleksi "${name}" memiliki ${count} brosur.\n\nApakah Anda yakin ingin menghapus koleksi ini? Brosur di dalamnya akan tetap tersimpan tapi tidak lagi terhubung ke koleksi ini.`;
      if (!confirm(confirmMsg)) return;
    } else {
      if (!confirm(`Hapus koleksi "${name}"?`)) return;
    }

    setDeletingFolderId(id);
    try {
      if (count > 0) {
        await supabase.from('brosur').update({ folder_id: null }).eq('folder_id', id);
      }
      const { error } = await supabase.from('folders').delete().eq('id', id);
      if (error) throw error;

      setSnackbar({
        show: true,
        message: 'Koleksi Berhasil Dihapus',
        sub: `Koleksi "${name}" telah dihapus.`
      });
      setTimeout(() => setSnackbar(null), 4000);

      await fetchFolders();
      await fetchCounts();
    } catch (err: any) {
      alert(`Gagal menghapus koleksi: ${err.message}`);
    } finally {
      setDeletingFolderId(null);
    }
  };

  // Helper & Handlers untuk Manajemen Kategori Tahun
  const handleOpenCreateYear = () => {
    const currentYear = new Date().getFullYear();
    const nextPossibleYear = availableYears.length > 0 ? Math.max(...availableYears) + 1 : currentYear;
    setNewYearInput(nextPossibleYear.toString());
    setYearModalError('');
    setIsYearModalOpen(true);
  };

  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    setYearModalError('');

    const numYear = parseInt(newYearInput.trim(), 10);
    if (isNaN(numYear) || numYear < 1950 || numYear > 2100) {
      setYearModalError('Tahun harus berupa 4 angka yang valid antara 1950 - 2100.');
      return;
    }

    if (availableYears.includes(numYear)) {
      setYearModalError(`Kategori tahun ${numYear} sudah ada dalam daftar.`);
      return;
    }

    setIsSavingYear(true);
    try {
      let existingCustom: number[] = [];
      try {
        const { data: curSetting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'custom_years')
          .single();
        if (curSetting?.value) {
          const parsed = JSON.parse(curSetting.value);
          if (Array.isArray(parsed)) existingCustom = parsed;
        }
      } catch (e) {
        // Abaikan jika belum ada
      }

      const updatedCustom = Array.from(new Set([...existingCustom, numYear])).sort((a, b) => b - a);

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'custom_years',
          value: JSON.stringify(updatedCustom),
        });

      if (error) {
        console.warn('Gagal menyimpan ke system_settings, tetap perbarui local state:', error);
      }

      setAvailableYears(prev => Array.from(new Set([...prev, numYear])).sort((a, b) => b - a));
      setIsYearModalOpen(false);

      setSnackbar({
        show: true,
        message: 'Kategori Tahun Berhasil Ditambahkan',
        sub: `Tahun ${numYear} kini tersedia dalam daftar kategori.`
      });
      setTimeout(() => setSnackbar(null), 4000);
    } catch (err: any) {
      setYearModalError(err.message || 'Gagal menambahkan tahun.');
    } finally {
      setIsSavingYear(false);
    }
  };

  const handleDeleteYear = async (year: number) => {
    const count = yearCounts[year] || 0;
    if (count > 0) {
      alert(`Tahun ${year} memiliki ${count} brosur yang masih tersimpan. Pindahkan atau hapus brosur terlebih dahulu untuk menghapus kategori tahun ini.`);
      return;
    }

    if (!confirm(`Hapus kategori tahun ${year}?`)) return;

    try {
      let existingCustom: number[] = [];
      try {
        const { data: curSetting } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'custom_years')
          .single();
        if (curSetting?.value) {
          const parsed = JSON.parse(curSetting.value);
          if (Array.isArray(parsed)) existingCustom = parsed;
        }
      } catch (e) {}

      const updatedCustom = existingCustom.filter(y => y !== year);

      await supabase
        .from('system_settings')
        .upsert({
          key: 'custom_years',
          value: JSON.stringify(updatedCustom),
        });

      setAvailableYears(prev => prev.filter(y => y !== year));

      setSnackbar({
        show: true,
        message: 'Kategori Tahun Dihapus',
        sub: `Tahun ${year} telah dihapus dari daftar kategori.`
      });
      setTimeout(() => setSnackbar(null), 4000);
    } catch (err: any) {
      alert(`Gagal menghapus tahun: ${err.message}`);
    }
  };

  // Handler Quick Assign Folder (Mengubah/menetapkan koleksi brosur secara langsung)
  const handleOpenQuickFolder = (brosur: any) => {
    setQuickFolderBrosur(brosur);
    setQuickSelectedFolderId(brosur.folder_id || '');
  };

  const handleSaveQuickFolder = async () => {
    if (!quickFolderBrosur) return;
    setIsSavingQuickFolder(true);
    try {
      const targetFolderId = quickSelectedFolderId || null;
      const { error } = await supabase
        .from('brosur')
        .update({ folder_id: targetFolderId })
        .eq('id', quickFolderBrosur.id);

      if (error) throw error;

      const selectedFolder = folders.find(f => f.id === targetFolderId);

      setBrosurs(prev => prev.map(b => {
        if (b.id === quickFolderBrosur.id) {
          return {
            ...b,
            folder_id: targetFolderId,
            folders: selectedFolder ? { name: selectedFolder.name } : null,
          };
        }
        return b;
      }));

      setSnackbar({
        show: true,
        message: 'Koleksi Berhasil Diperbarui',
        sub: targetFolderId 
          ? `Brosur ditautkan ke koleksi "${selectedFolder?.name}".`
          : `Brosur dilepas dari koleksi.`
      });
      setTimeout(() => setSnackbar(null), 4000);
      setQuickFolderBrosur(null);
      await fetchCounts();
    } catch (err: any) {
      alert(`Gagal memperbarui koleksi brosur: ${err.message}`);
    } finally {
      setIsSavingQuickFolder(false);
    }
  };

  // Paginasi & Filtering untuk Tab Koleksi
  const filteredKoleksi = useMemo(() => {
    if (!searchKoleksi.trim()) return folders;
    return folders.filter(f => f.name.toLowerCase().includes(searchKoleksi.toLowerCase()));
  }, [folders, searchKoleksi]);

  const totalKoleksiPages = Math.ceil(filteredKoleksi.length / itemsPerKoleksiPage) || 1;
  const paginatedKoleksi = useMemo(() => {
    const start = (pageKoleksi - 1) * itemsPerKoleksiPage;
    return filteredKoleksi.slice(start, start + itemsPerKoleksiPage);
  }, [filteredKoleksi, pageKoleksi]);

  // Paginasi & Filtering untuk Tab Tahun
  const filteredTahun = useMemo(() => {
    if (!searchTahun.trim()) return availableYears;
    return availableYears.filter(y => y.toString().includes(searchTahun.trim()));
  }, [availableYears, searchTahun]);

  const totalTahunPages = Math.ceil(filteredTahun.length / itemsPerTahunPage) || 1;
  const paginatedTahun = useMemo(() => {
    const start = (pageTahun - 1) * itemsPerTahunPage;
    return filteredTahun.slice(start, start + itemsPerTahunPage);
  }, [filteredTahun, pageTahun]);

  const totalBrosurPages = Math.ceil(totalBrosurs / itemsPerPage) || 1;

  // Handle Switch Tab
  const handleTabChange = (tab: 'brosur' | 'koleksi' | 'tahun') => {
    setActiveTab(tab);
    if (tab === 'brosur') {
      router.push('/admin/data-brosur');
    } else if (tab === 'koleksi') {
      router.push('/admin/data-brosur/koleksi');
    } else if (tab === 'tahun') {
      router.push('/admin/data-brosur/tahun');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16 relative">
      
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
            className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Clean Gemini */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 mb-1">
            Database Brosur Ahad Pagi
          </h1>
          <p className="text-zinc-500 text-sm max-w-2xl leading-relaxed">
            Kelola arsip edisi brosur, kategori koleksi tematik, serta edisi tahunan dalam tampilan tabular terstruktur.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <Link
            href="/admin/data-brosur/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-medium transition shadow-sm"
          >
            <Plus size={15} />
            <span>Tambah Brosur</span>
          </Link>
        </div>
      </div>

      {/* TABULAT NAVIGASI UTAMA (Daftar Brosur, Koleksi Tematik, Kategori Tahun) */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100/80 rounded-2xl w-fit flex-wrap border border-zinc-200/50">
        {/* Tab 1: Daftar Brosur */}
        <button
          onClick={() => handleTabChange('brosur')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'brosur'
              ? 'bg-white text-emerald-800 font-bold shadow-2xs'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <FileText size={14} className={activeTab === 'brosur' ? 'text-emerald-600' : 'text-zinc-400'} />
          <span>Daftar Brosur ({totalBrosurs.toLocaleString('id-ID')})</span>
        </button>

        {/* Tab 2: Koleksi Tematik */}
        <button
          onClick={() => handleTabChange('koleksi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'koleksi'
              ? 'bg-white text-emerald-800 font-bold shadow-2xs'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <FolderArchive size={14} className={activeTab === 'koleksi' ? 'text-emerald-600' : 'text-zinc-400'} />
          <span>Koleksi Tematik ({folders.length})</span>
        </button>

        {/* Tab 3: Kategori Tahun */}
        <button
          onClick={() => handleTabChange('tahun')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === 'tahun'
              ? 'bg-white text-emerald-800 font-bold shadow-2xs'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Calendar size={14} className={activeTab === 'tahun' ? 'text-emerald-600' : 'text-zinc-400'} />
          <span>Kategori Tahun ({availableYears.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAFTAR BROSUR (LENGKAP DENGAN FILTER & PAGINASI) */}
      {/* ========================================================================= */}
      {activeTab === 'brosur' && (
        <div className="space-y-4">
          {/* Summary Metric Cards: Status Parsing Hadist */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            <div className="p-3 sm:p-3.5 bg-[#FAFAFA] rounded-2xl flex items-center justify-between border border-zinc-100">
              <div>
                <p className="text-[11px] text-zinc-500 font-medium">Total Brosur</p>
                <p className="text-base sm:text-lg font-bold text-zinc-900 mt-0.5">
                  {totalBrosurs.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-zinc-200/60 text-zinc-700 flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
            </div>

            <div 
              onClick={() => { setFilterParsing(filterParsing === 'sudah' ? 'all' : 'sudah'); setCurrentPage(1); }}
              className={`p-3 sm:p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition border ${
                filterParsing === 'sudah' 
                  ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400' 
                  : 'bg-[#FAFAFA] border-zinc-100 hover:bg-emerald-50/40'
              }`}
              title="Klik untuk memfilter brosur yang sudah diparsing"
            >
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-[11px] text-emerald-700 font-semibold">Sudah Diparsing</p>
                  {filterParsing === 'sudah' && (
                    <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded-full">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-base sm:text-lg font-bold text-emerald-800 mt-0.5">
                  {parsingStats.parsedBrosurIds.size.toLocaleString('id-ID')}{' '}
                  <span className="text-[11px] font-normal text-emerald-600">
                    ({parsingStats.totalHadist} hadits)
                  </span>
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
                <BookOpen size={16} />
              </div>
            </div>

            <div 
              onClick={() => { setFilterParsing(filterParsing === 'belum' ? 'all' : 'belum'); setCurrentPage(1); }}
              className={`col-span-2 sm:col-span-1 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition border ${
                filterParsing === 'belum' 
                  ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-400' 
                  : 'bg-[#FAFAFA] border-zinc-100 hover:bg-amber-50/40'
              }`}
              title="Klik untuk memfilter brosur yang belum diparsing"
            >
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-[11px] text-amber-700 font-semibold">Belum Diparsing</p>
                  {filterParsing === 'belum' && (
                    <span className="text-[9px] font-bold bg-amber-600 text-white px-1.5 py-0.5 rounded-full">
                      Aktif
                    </span>
                  )}
                </div>
                <p className="text-base sm:text-lg font-bold text-amber-800 mt-0.5">
                  {Math.max(0, totalBrosurs - parsingStats.parsedBrosurIds.size).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
            </div>
          </div>

          {/* Quick Action: Batch Parsing Baris Halaman Ini */}
          {brosurs.some(b => !b.hadist_brosur || b.hadist_brosur.length === 0) && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Sparkles size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-950">
                    Terdapat {brosurs.filter(b => !b.hadist_brosur || b.hadist_brosur.length === 0).length} brosur di halaman ini yang belum memiliki data hadits.
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Ekstrak dalil matan hadits secara otomatis dengan mesin parser AI & Takhrij internal.
                  </p>
                </div>
              </div>
              <button
                onClick={handleBatchParseCurrentPage}
                disabled={isBatchParsing}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs transition disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isBatchParsing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Memproses ({batchProgress.current}/{batchProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>⚡ Parsing Otomatis Halaman Ini</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* BAR FILTER BROSUR (Pencarian, Koleksi, Tahun, Status Parsing, Sort) */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 bg-[#FAFAFA] p-2.5 sm:p-3 rounded-2xl border border-zinc-200/50">
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari judul edisi atau nomor brosur..."
                className="w-full bg-white rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium border border-zinc-200/70"
              />
            </div>

            {/* Dropdown Filters Responsif */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex items-center gap-2 w-full lg:w-auto">
              <select
                value={filterFolder}
                onChange={(e) => { setFilterFolder(e.target.value); setCurrentPage(1); }}
                className="bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-700 outline-none border border-zinc-200/70 w-full"
              >
                <option value="">Semua Koleksi ({folders.length})</option>
                <option value="none">Tanpa Koleksi</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              <select
                value={filterTahun}
                onChange={(e) => { setFilterTahun(e.target.value); setCurrentPage(1); }}
                className="bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-700 outline-none border border-zinc-200/70 w-full"
              >
                <option value="">Semua Tahun ({availableYears.length})</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select
                value={filterParsing}
                onChange={(e) => { setFilterParsing(e.target.value as any); setCurrentPage(1); }}
                className="bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-700 outline-none border border-zinc-200/70 w-full"
              >
                <option value="all">Semua Status</option>
                <option value="sudah">Sudah Diparsing</option>
                <option value="belum">Belum Diparsing</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                className="bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-700 outline-none border border-zinc-200/70 w-full"
              >
                <option value="terbaru">Terbaru Diupload</option>
                <option value="tahun_desc">Tahun (Terbaru)</option>
                <option value="tahun_asc">Tahun (Terlama)</option>
                <option value="judul_asc">Judul (A-Z)</option>
                <option value="judul_desc">Judul (Z-A)</option>
              </select>

              {/* Tampilkan Jumlah Brosur per Halaman */}
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white rounded-xl px-3 py-2.5 text-xs font-bold text-emerald-800 outline-none border border-zinc-200/70 w-full lg:w-auto cursor-pointer"
                title="Pilih jumlah brosur yang ditampilkan per halaman"
              >
                <option value={10}>10 Brosur / hal</option>
                <option value={20}>20 Brosur / hal</option>
                <option value={50}>50 Brosur / hal</option>
                <option value={100}>100 Brosur / hal</option>
              </select>
            </div>
          </div>

          {/* Active Filter Chips jika sedang disaring */}
          {(filterFolder || filterTahun || filterParsing !== 'all' || searchTerm) && (
            <div className="flex items-center gap-2 flex-wrap text-xs pt-1">
              <span className="text-zinc-400 font-medium text-[11px]">Filter Aktif:</span>
              {filterFolder && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                  <span>Koleksi: {folders.find(f => f.id === filterFolder)?.name || 'Tanpa Koleksi'}</span>
                  <button onClick={() => { setFilterFolder(''); setCurrentPage(1); }} className="hover:text-emerald-950 font-bold ml-0.5">×</button>
                </span>
              )}
              {filterTahun && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                  <span>Tahun: {filterTahun}</span>
                  <button onClick={() => { setFilterTahun(''); setCurrentPage(1); }} className="hover:text-emerald-950 font-bold ml-0.5">×</button>
                </span>
              )}
              {filterParsing !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                  <span>Status: {filterParsing === 'sudah' ? 'Sudah Diparsing' : 'Belum Diparsing'}</span>
                  <button onClick={() => { setFilterParsing('all'); setCurrentPage(1); }} className="hover:text-emerald-950 font-bold ml-0.5">×</button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-200 text-zinc-800 text-[11px] font-semibold">
                  <span>Kata Kunci: "{searchTerm}"</span>
                  <button onClick={() => { setSearch(''); setSearchTerm(''); }} className="hover:text-black font-bold ml-0.5">×</button>
                </span>
              )}
              <button
                onClick={() => {
                  setFilterFolder('');
                  setFilterTahun('');
                  setFilterParsing('all');
                  setSearch('');
                  setSearchTerm('');
                  setCurrentPage(1);
                  router.push('/admin/data-brosur');
                }}
                className="text-xs text-red-600 hover:underline font-semibold ml-1 cursor-pointer"
              >
                Reset Semua
              </button>
            </div>
          )}

          {/* LIST DATA BROSUR */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-emerald-600" size={24} />
              <p className="text-xs text-zinc-400 font-medium">Memuat data brosur...</p>
            </div>
          ) : brosurs.length === 0 ? (
            <div className="text-center py-20 bg-[#FAFAFA] rounded-2xl border border-dashed border-zinc-200 p-6">
              <FileText size={32} className="mx-auto text-zinc-300 mb-3" />
              <h3 className="text-sm font-semibold text-zinc-800">Tidak ada brosur yang cocok</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Silakan sesuaikan filter pencarian atau buat edisi brosur baru.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {brosurs.map((b) => {
                const hadistCount = b.hadist_brosur?.length || 0;
                const isParsed = hadistCount > 0;
                const isDeleting = deletingId === b.id;

                return (
                  <div
                    key={b.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-[#FAFAFA] hover:bg-white hover:border-zinc-200 border border-transparent transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group shadow-2xs"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Badge Tahun Terbit (Klik untuk filter tahun) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (b.tahun) {
                              setFilterTahun(b.tahun.toString());
                              setCurrentPage(1);
                              router.push(`/admin/data-brosur?tahun=${b.tahun}`);
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-600 hover:text-emerald-800 bg-white hover:bg-emerald-50 border border-zinc-200/80 hover:border-emerald-300 px-2 py-0.5 rounded-md shrink-0 transition cursor-pointer"
                          title={b.tahun ? `Tahun ${b.tahun}. Klik untuk memfilter tahun ini.` : 'Tahun belum ditentukan'}
                        >
                          <Calendar size={10} className="text-zinc-400 shrink-0" />
                          <span>{b.tahun || '—'}</span>
                        </button>

                        {/* Badge Koleksi Tematik (Klik nama untuk filter, klik edit untuk ubah koleksi) */}
                        {b.folders?.name ? (
                          <div className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (b.folder_id) {
                                  setFilterFolder(b.folder_id);
                                  setCurrentPage(1);
                                  router.push(`/admin/data-brosur?folder=${b.folder_id}`);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 hover:text-emerald-950 transition cursor-pointer"
                              title={`Koleksi: ${b.folders.name}. Klik untuk memfilter koleksi ini.`}
                            >
                              <FolderArchive size={11} className="text-emerald-700 shrink-0" />
                              <span>{b.folders.name}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenQuickFolder(b);
                              }}
                              className="text-emerald-600 hover:text-emerald-900 p-0.5 rounded transition cursor-pointer"
                              title="Ubah koleksi brosur ini"
                            >
                              <Edit2 size={9} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenQuickFolder(b);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-400 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-dashed border-zinc-300 hover:border-emerald-400 px-2 py-0.5 rounded-md shrink-0 transition cursor-pointer"
                            title="Brosur ini belum memiliki koleksi. Klik untuk memilih koleksi."
                          >
                            <Plus size={10} />
                            <span>Pilih Koleksi</span>
                          </button>
                        )}

                        {isParsed ? (
                          <Link
                            href={`/admin/hadist?brosur_id=${b.id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200/90 border border-emerald-300/70 px-2 py-0.5 rounded-md transition group/badge"
                            title={`Sudah diparsing menjadi ${hadistCount} hadits di /admin/hadist. Klik untuk buka di Admin Hadist.`}
                          >
                            <CheckCircle2 size={11} className="text-emerald-700 shrink-0" />
                            <span>Sudah Diparsing ({hadistCount} Hadits)</span>
                            <ArrowUpRight size={10} className="text-emerald-600 opacity-60 group-hover/badge:opacity-100 transition" />
                          </Link>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md"
                            title="Brosur ini belum memiliki data hadits yang diparsing di /admin/hadist"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                            <span>Belum Diparsing (0 Hadits)</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 group-hover:text-emerald-700 transition leading-snug line-clamp-2 sm:line-clamp-1">
                        {b.judul || 'Tanpa Judul'}
                      </h3>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-200/50">
                      {isParsed ? (
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/admin/hadist?brosur_id=${b.id}`}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 transition flex items-center gap-1.5 border border-emerald-200/60"
                            title={`Buka & kelola ${hadistCount} hadits brosur ini di /admin/hadist`}
                          >
                            <BookOpen size={13} className="text-emerald-600 shrink-0" />
                            <span className="text-[11px] font-bold">{hadistCount} Hadits</span>
                          </Link>
                          <button
                            onClick={() => handleParseSingleBrosur(b.id, b.judul, true)}
                            disabled={parsingBrosurId === b.id || isBatchParsing}
                            className="p-1.5 rounded-xl text-zinc-400 hover:text-amber-700 hover:bg-amber-50 transition cursor-pointer"
                            title="Parsing Ulang Hadits Brosur Ini"
                          >
                            {parsingBrosurId === b.id ? (
                              <Loader2 size={13} className="animate-spin text-amber-600" />
                            ) : (
                              <RefreshCw size={13} />
                            )}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleParseSingleBrosur(b.id, b.judul, false)}
                          disabled={parsingBrosurId === b.id || isBatchParsing}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
                          title="Ekstrak & parsing otomatis hadits dari naskah brosur ini"
                        >
                          {parsingBrosurId === b.id ? (
                            <>
                              <Loader2 size={13} className="animate-spin text-amber-700" />
                              <span className="text-[11px] font-bold">Memparsing...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={13} className="text-amber-600 shrink-0" />
                              <span className="text-[11px] font-bold">Parsing Hadits</span>
                            </>
                          )}
                        </button>
                      )}

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
                        className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-white transition disabled:opacity-50 cursor-pointer"
                        title="Hapus Brosur"
                      >
                        {isDeleting ? <Loader2 size={14} className="animate-spin text-red-500" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* PAGINASI BROSUR */}
              {(totalBrosurPages > 1 || totalBrosurs > 10) && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 bg-[#FAFAFA] rounded-2xl border border-zinc-200/50">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-zinc-500 font-medium text-center sm:text-left">
                      Halaman <span className="font-bold text-zinc-900">{currentPage}</span> dari <span className="font-bold text-zinc-900">{totalBrosurPages}</span> ({totalBrosurs} data)
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium sm:border-l sm:border-zinc-200 sm:pl-3">
                      <span>Tampilkan:</span>
                      <select
                        value={itemsPerPage}
                        onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="bg-white border border-zinc-200/80 rounded-lg px-2 py-1 text-xs font-bold text-emerald-800 outline-none cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-[11px] text-zinc-400">brosur</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 sm:px-3 py-1.5 bg-white border border-zinc-200/70 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                      <span>Sebelumnya</span>
                    </button>

                    <div className="px-2.5 text-xs font-bold text-zinc-800">
                      {currentPage}
                    </div>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalBrosurPages, p + 1))}
                      disabled={currentPage === totalBrosurPages}
                      className="px-2.5 sm:px-3 py-1.5 bg-white border border-zinc-200/70 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: KOLEKSI TEMATIK (TABULAR LISTVIEW + FILTER + PAGINASI) */}
      {/* ========================================================================= */}
      {activeTab === 'koleksi' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Header Filter Koleksi & Tambah Koleksi */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FAFAFA] p-3 rounded-2xl border border-zinc-200/50">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchKoleksi}
                  onChange={(e) => { setSearchKoleksi(e.target.value); setPageKoleksi(1); }}
                  placeholder="Cari nama koleksi tematik..."
                  className="w-full bg-white rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium border border-zinc-200/70"
                />
              </div>

              <div className="hidden sm:block text-xs text-zinc-500 font-medium whitespace-nowrap">
                Total <span className="font-bold text-zinc-800">{filteredKoleksi.length}</span> koleksi
              </div>
            </div>

            <button
              onClick={handleOpenCreateFolder}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus size={15} />
              <span>Tambah Koleksi</span>
            </button>
          </div>

          {/* Grid Koleksi Tematik */}
          {paginatedKoleksi.length === 0 ? (
            <div className="text-center py-20 bg-[#FAFAFA] rounded-2xl border border-dashed border-zinc-200 p-6">
              <FolderArchive size={32} className="mx-auto text-zinc-300 mb-3" />
              <h3 className="text-sm font-semibold text-zinc-800">Koleksi tidak ditemukan</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto mb-4">
                {searchKoleksi 
                  ? `Tidak ada koleksi yang cocok dengan pencarian "${searchKoleksi}".` 
                  : 'Belum ada koleksi tematik. Buat koleksi pertama Anda sekarang.'}
              </p>
              <button
                onClick={handleOpenCreateFolder}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition"
              >
                <Plus size={14} />
                <span>Tambah Koleksi Baru</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {paginatedKoleksi.map((f) => {
                const count = folderCounts[f.id] || 0;
                const isDeleting = deletingFolderId === f.id;
                const isCurrentlyDisabled = disabledFolders.includes(f.slug) || disabledFolders.includes(f.id);
                const isToggling = isTogglingFolderId === f.id;

                return (
                  <div
                    key={f.id}
                    className={`p-5 rounded-2xl bg-[#FAFAFA] hover:bg-white border transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between group relative ${
                      isCurrentlyDisabled ? 'border-zinc-200/50 opacity-90' : 'hover:border-emerald-300 border-zinc-200/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-white border border-zinc-200/60 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <FolderArchive size={17} />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {/* Toggle Switch Status Enable / Disable */}
                          <button
                            type="button"
                            onClick={() => handleToggleFolderVisibility(f)}
                            disabled={isToggling}
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition cursor-pointer border ${
                              isCurrentlyDisabled
                                ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                            }`}
                            title={
                              isCurrentlyDisabled
                                ? `Status: Nonaktif (Koleksi ${f.name} disembunyikan dari publik). Klik untuk mengaktifkan.`
                                : `Status: Aktif (Muncul di /koleksi/${f.slug} & Sidebar). Klik untuk menyembunyikan.`
                            }
                          >
                            {isToggling ? (
                              <Loader2 size={10} className="animate-spin text-zinc-500" />
                            ) : isCurrentlyDisabled ? (
                              <EyeOff size={11} className="text-rose-600" />
                            ) : (
                              <Eye size={11} className="text-emerald-700" />
                            )}
                            <span>{isCurrentlyDisabled ? 'Nonaktif' : 'Aktif'}</span>
                          </button>

                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-200/70 text-zinc-700">
                            {count} Brosur
                          </span>

                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => handleOpenEditFolder(f)}
                              title="Edit Koleksi"
                              className="p-1 text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteFolder(f.id, f.name, count)}
                              disabled={isDeleting}
                              title="Hapus Koleksi"
                              className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-40 cursor-pointer"
                            >
                              {isDeleting ? <Loader2 size={13} className="animate-spin text-rose-600" /> : <Trash2 size={13} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-sm text-zinc-900 group-hover:text-emerald-700 transition truncate">
                          {f.name}
                        </h4>
                        {isCurrentlyDisabled && (
                          <span className="text-[9px] font-semibold text-rose-600 bg-rose-50 border border-rose-200/60 px-1.5 py-0.2 rounded shrink-0">
                            Hidden
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-2 min-h-[2rem]">
                        {f.description || 'Koleksi Arsip Tematik Brosur Ahad Pagi'}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-zinc-200/50 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterFolder(f.id);
                          setFilterTahun('');
                          setActiveTab('brosur');
                          setCurrentPage(1);
                          router.push(`/admin/data-brosur?folder=${f.id}`);
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition cursor-pointer"
                        title={`Buka daftar ${count} brosur dalam koleksi ${f.name}`}
                      >
                        <span>Lihat Brosur ({count})</span>
                        <ArrowUpRight size={13} />
                      </button>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/data-brosur/new?folder=${f.id}`}
                          title={`Tambah brosur baru ke koleksi ${f.name}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded-md transition"
                        >
                          <Plus size={11} />
                          <span>Brosur</span>
                        </Link>

                        <Link
                          href={`/koleksi/${f.slug || f.id}`}
                          target="_blank"
                          className={`text-[10px] font-mono truncate max-w-[100px] flex items-center gap-0.5 hover:underline ${
                            isCurrentlyDisabled ? 'text-zinc-400 line-through' : 'text-emerald-700'
                          }`}
                          title={
                            isCurrentlyDisabled
                              ? `URL: /koleksi/${f.slug} (Sedang Nonaktif / Disembunyikan)`
                              : `Buka URL publik: /koleksi/${f.slug}`
                          }
                        >
                          <span>/{f.slug || f.id.slice(0, 8)}</span>
                          <ArrowUpRight size={10} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAGINASI KOLEKSI */}
          {totalKoleksiPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 bg-[#FAFAFA] rounded-2xl border border-zinc-200/50">
              <span className="text-xs text-zinc-500 font-medium">
                Halaman <span className="font-bold text-zinc-900">{pageKoleksi}</span> dari <span className="font-bold text-zinc-900">{totalKoleksiPages}</span> ({filteredKoleksi.length} koleksi)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPageKoleksi(p => Math.max(1, p - 1))}
                  disabled={pageKoleksi === 1}
                  className="px-3 py-1.5 bg-white border border-zinc-200/70 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>Sebelumnya</span>
                </button>

                <div className="px-2.5 text-xs font-bold text-zinc-800">
                  {pageKoleksi}
                </div>

                <button
                  onClick={() => setPageKoleksi(p => Math.min(totalKoleksiPages, p + 1))}
                  disabled={pageKoleksi === totalKoleksiPages}
                  className="px-3 py-1.5 bg-white border border-zinc-200/70 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Berikutnya</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KATEGORI TAHUN (TABULAR LISTVIEW + FILTER + PAGINASI) */}
      {/* ========================================================================= */}
      {activeTab === 'tahun' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Header Filter Tahun & Tambah Tahun */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#FAFAFA] p-3 rounded-2xl border border-zinc-200/50">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchTahun}
                  onChange={(e) => { setSearchTahun(e.target.value); setPageTahun(1); }}
                  placeholder="Cari tahun edisi brosur (misal: 2026, 2025)..."
                  className="w-full bg-white rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium border border-zinc-200/70"
                />
              </div>

              <div className="hidden sm:block text-xs text-zinc-500 font-medium whitespace-nowrap">
                Total <span className="font-bold text-zinc-800">{filteredTahun.length}</span> kategori tahun
              </div>
            </div>

            <button
              onClick={handleOpenCreateYear}
              className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus size={15} />
              <span>Tambah Tahun</span>
            </button>
          </div>

          {/* Grid Kategori Tahun */}
          {paginatedTahun.length === 0 ? (
            <div className="text-center py-20 bg-[#FAFAFA] rounded-2xl border border-dashed border-zinc-200 p-6">
              <Calendar size={32} className="mx-auto text-zinc-300 mb-3" />
              <h3 className="text-sm font-semibold text-zinc-800">Tahun tidak ditemukan</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto mb-4">
                {searchTahun 
                  ? `Tidak ada edisi yang cocok dengan pencarian "${searchTahun}".`
                  : 'Belum ada kategori tahun terdaftar.'}
              </p>
              <button
                onClick={handleOpenCreateYear}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Plus size={14} />
                <span>Tambah Tahun Baru</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {paginatedTahun.map((year) => {
                const count = yearCounts[year] || 0;
                return (
                  <div
                    key={year}
                    className="p-4 sm:p-5 rounded-2xl bg-[#FAFAFA] hover:bg-white hover:border-emerald-300 border border-zinc-200/50 transition-all shadow-2xs hover:shadow-xs flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-zinc-200/60 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <Calendar size={15} />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            count > 0 ? 'bg-emerald-100/80 text-emerald-800' : 'bg-zinc-200/70 text-zinc-600'
                          }`}>
                            {count} Edisi
                          </span>
                          {count === 0 && (
                            <button
                              onClick={() => handleDeleteYear(year)}
                              title="Hapus Kategori Tahun Kosong"
                              className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <h4 className="font-bold text-base text-zinc-900 group-hover:text-emerald-700 transition truncate mb-0.5">
                        Tahun {year}
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Arsip Brosur Ahad Pagi
                      </p>
                    </div>

                    <div className="pt-3.5 mt-3.5 border-t border-zinc-200/50 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterTahun(year.toString());
                          setFilterFolder('');
                          setActiveTab('brosur');
                          setCurrentPage(1);
                          router.push(`/admin/data-brosur?tahun=${year}`);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition cursor-pointer"
                        title={`Buka daftar ${count} brosur tahun ${year}`}
                      >
                        <span>Lihat Brosur ({count})</span>
                        <ArrowUpRight size={13} />
                      </button>

                      <Link
                        href={`/admin/data-brosur/new?tahun=${year}`}
                        title={`Tambah brosur baru tahun ${year}`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-0.5 rounded-md transition"
                      >
                        <Plus size={11} />
                        <span>Brosur</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PAGINASI TAHUN */}
          {totalTahunPages > 1 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 bg-[#FAFAFA] rounded-2xl border border-zinc-200/50">
              <span className="text-xs text-zinc-500 font-medium">
                Halaman <span className="font-bold text-zinc-900">{pageTahun}</span> dari <span className="font-bold text-zinc-900">{totalTahunPages}</span> ({filteredTahun.length} tahun)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPageTahun(p => Math.max(1, p - 1))}
                  disabled={pageTahun === 1}
                  className="px-3 py-1.5 bg-white border border-zinc-200/70 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                  <span>Sebelumnya</span>
                </button>

                <div className="px-2.5 text-xs font-bold text-zinc-800">
                  {pageTahun}
                </div>

                <button
                  onClick={() => setPageTahun(p => Math.min(totalTahunPages, p + 1))}
                  disabled={pageTahun === totalTahunPages}
                  className="px-3 py-1.5 bg-white border border-zinc-200/70 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 cursor-pointer"
                >
                  <span>Berikutnya</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DIALOG: TAMBAH / EDIT KOLEKSI TEMATIK */}
      {/* ========================================================================= */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-zinc-200/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center">
                  <FolderArchive size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    {editingFolder ? 'Edit Koleksi Tematik' : 'Tambah Koleksi Baru'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {editingFolder ? 'Perbarui informasi kategori koleksi' : 'Buat kategori arsip untuk mengelompokkan brosur'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveFolder} className="p-6 space-y-4">
              {folderModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium">
                  {folderModalError}
                </div>
              )}

              {/* Input Nama Koleksi */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Nama Koleksi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={folderName}
                  onChange={(e) => handleFolderNameChange(e.target.value)}
                  placeholder="Contoh: Kajian Ramadhan, Muamalah, Fiqih..."
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
              </div>

              {/* Input Slug URL */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Slug URL <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400">
                    koleksi/
                  </span>
                  <input
                    type="text"
                    required
                    value={folderSlug}
                    onChange={(e) => {
                      setFolderSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      setFolderSlugTouched(true);
                    }}
                    placeholder="kajian-ramadhan"
                    className="w-full pl-18 pr-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">
                  Digunakan untuk URL filter brosur. Hanya huruf kecil, angka, dan strip (-).
                </p>
              </div>

              {/* Input Deskripsi */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Deskripsi <span className="text-zinc-400 font-normal">(Opsional)</span>
                </label>
                <textarea
                  rows={3}
                  value={folderDesc}
                  onChange={(e) => setFolderDesc(e.target.value)}
                  placeholder="Ringkasan topik atau tema brosur dalam koleksi ini..."
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition resize-none"
                />
              </div>

              {/* Opsi Enable / Disable Visibilitas Koleksi di Publik */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/70 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-zinc-800 block">
                    Visibilitas Publik (Aktifkan Koleksi)
                  </span>
                  <span className="text-[11px] text-zinc-500 block leading-tight mt-0.5">
                    Jika diaktifkan, koleksi akan muncul di halaman publik (/koleksi/{folderSlug || 'slug'}), Sidebar Web, & Flutter.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={folderIsEnabled}
                    onChange={(e) => setFolderIsEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFolderModalOpen(false)}
                  disabled={isSavingFolder}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingFolder}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSavingFolder ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingFolder ? 'Simpan Perubahan' : 'Tambah Koleksi'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DIALOG: TAMBAH KATEGORI TAHUN */}
      {/* ========================================================================= */}
      {isYearModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-zinc-200/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center">
                  <Calendar size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    Tambah Kategori Tahun
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Edisi tahun baru untuk pengarsipan brosur
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsYearModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveYear} className="p-6 space-y-4">
              {yearModalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium">
                  {yearModalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Tahun Edisi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1950}
                  max={2100}
                  value={newYearInput}
                  onChange={(e) => setNewYearInput(e.target.value)}
                  placeholder="Misal: 2027"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition font-mono font-medium"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Masukkan 4 digit tahun (contoh: 2026, 2027). Tahun ini akan muncul sebagai kategori brosur.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsYearModalOpen(false)}
                  disabled={isSavingYear}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingYear}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSavingYear ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Tahun</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DIALOG: QUICK SET/UBAH KOLEKSI TEMATIK BROSUR */}
      {/* ========================================================================= */}
      {quickFolderBrosur && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full border border-zinc-200/80 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100/70 text-emerald-800 flex items-center justify-center">
                  <FolderArchive size={17} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900">
                    Atur Koleksi Tematik
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    Tautkan brosur ke dalam tema koleksi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setQuickFolderBrosur(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Info Brosur */}
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/60">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Brosur Terpilih (Tahun {quickFolderBrosur.tahun || '—'})
                </span>
                <p className="text-xs font-semibold text-zinc-900 leading-snug line-clamp-2">
                  {quickFolderBrosur.judul}
                </p>
              </div>

              {/* Pilihan Koleksi */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                  Pilih Koleksi Tematik
                </label>
                <select
                  value={quickSelectedFolderId}
                  onChange={(e) => setQuickSelectedFolderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
                >
                  <option value="">-- Tanpa Koleksi (Lepaskan) --</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.description ? `— ${f.description}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-400 mt-1.5">
                  Brosur akan dikelompokkan ke dalam tema yang Anda pilih dan langsung terlihat di Sidebar Web & Aplikasi Flutter.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setQuickFolderBrosur(null)}
                  disabled={isSavingQuickFolder}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickFolder}
                  disabled={isSavingQuickFolder}
                  className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSavingQuickFolder ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Koleksi</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Batch Parsing Progress Notification */}
      {isBatchParsing && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-amber-200 rounded-3xl p-4 shadow-2xl max-w-sm w-full animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Loader2 size={18} className="animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-zinc-900 truncate">
                Memproses {batchProgress.current} dari {batchProgress.total} Brosur...
              </h4>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                {batchProgress.currentTitle}
              </p>
            </div>
          </div>
          <div className="mt-3 w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-amber-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(batchProgress.current / Math.max(1, batchProgress.total)) * 100}%` }}
            />
          </div>
        </div>
      )}

    </div>
  );
}

