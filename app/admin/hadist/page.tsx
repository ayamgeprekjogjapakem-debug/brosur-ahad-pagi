'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Search, BookOpen, Layers, ShieldCheck, ChevronLeft, ChevronRight,
  Filter, Check, Eye, X, ScrollText, ArrowUpRight, Loader2, Sparkles,
  Edit2, Save, History, User, Clock, CheckCircle2, ChevronDown,
  Columns2, List, FileText, ExternalLink, RefreshCw, Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface HadistEditLog {
  id: string;
  hadist_id: string;
  hadist_title: string;
  rawi_kitab: string;
  editor_name: string;
  editor_email: string;
  field_changes: string;
  created_at: string;
}

function AdminHadistBrosurContent() {
  const [hadistItems, setHadistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const searchParams = useSearchParams();

  // Filters
  const [itemSearch, setItemSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSumberJenis, setFilterSumberJenis] = useState<'all' | 'hadist' | 'quran'>('all');
  const [filterRawiItem, setFilterRawiItem] = useState('all');
  const [filterTahun, setFilterTahun] = useState('all');
  const [filterBrosurId, setFilterBrosurId] = useState('all');

  // Split View & Active Brosur States (Kiri: Brosur Asli | Kanan: Hasil Parsing)
  const [isSplitView, setIsSplitView] = useState(true);
  const [activeBrosur, setActiveBrosur] = useState<any | null>(null);
  const [loadingBrosur, setLoadingBrosur] = useState(false);
  const [brosurViewMode, setBrosurViewMode] = useState<'html' | 'text'>('html');
  const [brosurSearchQuery, setBrosurSearchQuery] = useState('');
  const [mobileActiveTab, setMobileActiveTab] = useState<'brosur' | 'hadist'>('hadist');

  // Sinkronisasi filter dari URL (misal diarahkan dari Data Brosur)
  useEffect(() => {
    const pBrosur = searchParams.get('brosur_id');
    const pTahun = searchParams.get('tahun');
    if (pBrosur) {
      setFilterBrosurId(pBrosur);
      setIsSplitView(true);
    }
    if (pTahun) setFilterTahun(pTahun);
  }, [searchParams]);

  // Master Options
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [brosurList, setBrosurList] = useState<{ id: string; judul: string; tahun: number; slug?: string }[]>([]);
  
  // Pagination & Modal
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const itemsPerPage = 10;

  // Sidebar Audit Log States
  const [showLogSidebar, setShowLogSidebar] = useState(false);
  const [editLogs, setEditLogs] = useState<HadistEditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Edit States
  const [formArab, setFormArab] = useState('');
  const [formTerjemahan, setFormTerjemahan] = useState('');
  const [formRawiKitab, setFormRawiKitab] = useState('');
  const [formNoHadist, setFormNoHadist] = useState('');
  const [formPerawiSumber, setFormPerawiSumber] = useState('');
  const [formJuz, setFormJuz] = useState('');
  const [formHalaman, setFormHalaman] = useState('');
  const [formStatus, setFormStatus] = useState('terverifikasi');
  
  const supabase = createClient();

  // Load master tahun dan brosur
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const { data: bList } = await supabase
          .from('brosur')
          .select('id, judul, tahun, slug')
          .order('tahun', { ascending: false })
          .order('judul', { ascending: true });

        if (bList) {
          setBrosurList(bList);
          const years = Array.from(new Set(bList.map(b => b.tahun).filter(Boolean))).sort((a, b) => b - a);
          setAvailableYears(years);
        }
      } catch (e) {
        console.error('Error fetching brosur options:', e);
      }
    };

    fetchOptions();
  }, []);

  // Fetch detail lengkap naskah brosur asli (konten & teks_bersih) saat brosur dipilih
  const fetchActiveBrosur = async (idOrSlug: string) => {
    if (!idOrSlug || idOrSlug === 'all') {
      setActiveBrosur(null);
      return;
    }
    setLoadingBrosur(true);
    try {
      const { data, error } = await supabase
        .from('brosur')
        .select('id, judul, tahun, slug, konten, teks_bersih, created_at, folders(name)')
        .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
        .maybeSingle();

      if (!error && data) {
        setActiveBrosur(data);
      } else {
        setActiveBrosur(null);
      }
    } catch (err) {
      console.error('Error fetching active brosur:', err);
      setActiveBrosur(null);
    } finally {
      setLoadingBrosur(false);
    }
  };

  useEffect(() => {
    if (filterBrosurId && filterBrosurId !== 'all') {
      fetchActiveBrosur(filterBrosurId);
    } else {
      setActiveBrosur(null);
    }
  }, [filterBrosurId]);

  // Filtered brosur options based on selected year
  const filteredBrosurOptions = useMemo(() => {
    if (filterTahun === 'all') return brosurList;
    return brosurList.filter(b => b.tahun.toString() === filterTahun);
  }, [brosurList, filterTahun]);

  // Highlight & Sanitized HTML Brosur Asli
  const sanitizedBrosurHtml = useMemo(() => {
    if (!activeBrosur?.konten) return '';
    let html = activeBrosur.konten
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/html,body\s*\{[\s\S]*?\}/gi, '');
    
    if (brosurSearchQuery.trim() && brosurSearchQuery.trim().length >= 2) {
      try {
        const q = brosurSearchQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?![^<]*>)(${q})`, 'gi');
        html = html.replace(regex, '<mark class="bg-amber-300 text-amber-950 font-bold px-1 rounded shadow-xs">$1</mark>');
      } catch (e) {
        // ignore regex error
      }
    }
    return html;
  }, [activeBrosur?.konten, brosurSearchQuery]);

  // Load audit logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/hadist/logs?limit=30');
      const data = await res.json();
      if (data.logs) {
        setEditLogs(data.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(itemSearch);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [itemSearch]);

  const fetchHadistItems = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filterRawiItem !== 'all') queryParams.set('rawi_kitab', filterRawiItem);
      if (filterSumberJenis !== 'all') queryParams.set('sumber_jenis', filterSumberJenis);
      if (filterTahun !== 'all') queryParams.set('tahun', filterTahun);
      if (filterBrosurId !== 'all') queryParams.set('brosur_id', filterBrosurId);
      if (searchTerm.trim()) queryParams.set('search', searchTerm.trim());

      const res = await fetch(`/api/hadist/items?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok) setHadistItems(data.items || []);
    } catch (e) {
      console.error('Error fetching hadist items:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHadistItems();
  }, [filterSumberJenis, filterRawiItem, filterTahun, filterBrosurId, searchTerm]);

  // Open Edit Modal
  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormArab(item.kutipan_arab || '');
    setFormTerjemahan(item.terjemahan || '');
    setFormRawiKitab(item.rawi_kitab || '');
    setFormNoHadist(item.no_hadist || '');
    setFormPerawiSumber(item.perawi_sumber || '');
    setFormJuz(item.juz || '');
    setFormHalaman(item.halaman || '');
    setFormStatus(item.status_hadist || 'terverifikasi');
  };

  // Cocokkan kutipan hadits pada naskah brosur sebelah kiri
  const handleFindInBrosur = (item: any) => {
    let query = '';
    if (item.kutipan_arab) {
      query = item.kutipan_arab.slice(0, 30).trim();
    } else if (item.terjemahan) {
      query = item.terjemahan.split(' ').slice(0, 4).join(' ');
    } else if (item.rawi_kitab) {
      query = item.rawi_kitab;
    }
    setBrosurSearchQuery(query);
    setIsSplitView(true);
    setMobileActiveTab('brosur');
    setToastMessage(`Menyorot kata kunci "${query.slice(0, 25)}..." pada naskah brosur di sebelah kiri.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handle Save Edit
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingEdit(true);

    try {
      const payload = {
        id: editingItem.id,
        kutipan_arab: formArab.trim(),
        terjemahan: formTerjemahan.trim(),
        rawi_kitab: formRawiKitab.trim(),
        no_hadist: formNoHadist.trim(),
        perawi_sumber: formPerawiSumber.trim(),
        juz: formJuz.trim(),
        halaman: formHalaman.trim(),
        status_hadist: formStatus,
      };

      const res = await fetch('/api/hadist/items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Gagal menyimpan hadist');
      }

      // Catat ke log audit
      const { data: { user } } = await supabase.auth.getUser();
      const editorEmail = user?.email || 'admin@brosur.mta';
      const editorName = user?.user_metadata?.name || editorEmail.split('@')[0];

      await fetch('/api/hadist/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hadist_id: editingItem.id,
          hadist_title: editingItem.brosur?.judul || `Hadist ${formRawiKitab || ''}`,
          rawi_kitab: formRawiKitab || 'Hadist',
          editor_name: editorName,
          editor_email: editorEmail,
          field_changes: `Menyunting matan teks, terjemahan, dan no. hadist (${formRawiKitab} No. ${formNoHadist || '-'})`
        })
      });

      // Update state lokal
      setHadistItems(prev => prev.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            ...payload
          };
        }
        return item;
      }));

      setToastMessage(`Perubahan pada hadist ${formRawiKitab || ''} berhasil disimpan dan dicatat ke log.`);
      setTimeout(() => setToastMessage(null), 4000);
      setEditingItem(null);
      fetchLogs(); // refresh log list
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setSavingEdit(false);
    }
  };

  // Pagination calculation
  const totalItems = hadistItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const from = (currentPage - 1) * itemsPerPage;
    return hadistItems.slice(from, from + itemsPerPage);
  }, [hadistItems, currentPage]);

  const rawiList = ['Bukhari', 'Muslim', 'Abu Daud', 'Tirmidzi', 'Nasai', 'Ibnu Majah', 'Ahmad', 'Malik', 'Ad-Darimi'];

  return (
    <div className={`mx-auto space-y-6 animate-in fade-in duration-300 pb-16 font-sans ${isSplitView ? 'max-w-[1600px] w-full px-2 sm:px-4' : 'max-w-6xl'}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900 text-white px-4 py-3.5 rounded-2xl shadow-lg border border-zinc-800 animate-in slide-in-from-bottom-5 duration-200 max-w-md">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <p className="text-xs font-semibold leading-snug">{toastMessage}</p>
        </div>
      )}

      {/* Header Utama Bersih */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/data-brosur"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline underline-offset-2"
            >
              <ChevronLeft size={14} />
              <span>Database Brosur</span>
            </Link>
            <span className="text-zinc-300">/</span>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900">
              Verifikasi Dalil Hadits & Naskah Brosur
            </h1>
          </div>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Perbandingan dua sisi: <strong className="text-zinc-800 font-semibold">Kiri Naskah Brosur Asli</strong> dan <strong className="text-emerald-700 font-semibold">Kanan Hasil Parsing Hadits</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
          {/* Toggle Mode Split View */}
          <div className="flex items-center p-1 bg-zinc-100/80 rounded-xl border border-zinc-200/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => setIsSplitView(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${isSplitView ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
              title="Tampilkan split screen (Kiri Brosur, Kanan Hadits)"
            >
              <Columns2 size={14} />
              <span>Perbandingan (Split)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsSplitView(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${!isSplitView ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
              title="Tampilkan daftar hadits penuh"
            >
              <List size={14} />
              <span>Daftar Penuh</span>
            </button>
          </div>

          {/* Toggle Drawer Audit Log */}
          <button
            type="button"
            onClick={() => setShowLogSidebar(prev => !prev)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition border ${
              showLogSidebar 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70' 
                : 'bg-white text-zinc-600 border-zinc-200/70 hover:bg-zinc-50'
            }`}
          >
            <History size={14} className={showLogSidebar ? 'text-emerald-600' : ''} />
            <span>Log Editor ({editLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar Bersih: Pilih Brosur & Filter */}
      <div className="bg-[#FAFAFA] p-3 rounded-2xl border border-zinc-200/60 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          {/* Filter Tahun */}
          <div className="sm:col-span-3">
            <select
              value={filterTahun}
              onChange={(e) => {
                const newYear = e.target.value;
                setFilterTahun(newYear);
                setFilterBrosurId('all');
                setCurrentPage(1);
              }}
              className="bg-white rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 outline-none w-full border border-zinc-200/80"
            >
              <option value="all">Semua Tahun ({availableYears.length})</option>
              {availableYears.map(year => (
                <option key={year} value={year.toString()}>Tahun {year}</option>
              ))}
            </select>
          </div>

          {/* Filter Brosur Spesifik */}
          <div className="sm:col-span-9">
            <select
              value={filterBrosurId}
              onChange={(e) => { setFilterBrosurId(e.target.value); setCurrentPage(1); }}
              className="bg-white rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 outline-none w-full truncate border border-zinc-200/80"
            >
              <option value="all">
                {filterTahun !== 'all' 
                  ? `-- Pilih Brosur di Tahun ${filterTahun} (${filteredBrosurOptions.length} edisi) --` 
                  : `-- Pilih Brosur Sumber (${brosurList.length} edisi) --`}
              </option>
              {filteredBrosurOptions.map(b => (
                <option key={b.id} value={b.id}>
                  {b.tahun ? `[${b.tahun}] ` : ''}{b.judul}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Banner Filter Aktif */}
        {filterBrosurId !== 'all' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-zinc-200/50">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></span>
              <p className="text-xs text-zinc-600 truncate">
                Naskah Aktif: <strong className="text-zinc-900 font-bold">{activeBrosur?.judul || filterBrosurId}</strong> ({hadistItems.length} hadits ditemukan)
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setFilterBrosurId('all')}
                className="text-xs text-zinc-500 hover:text-red-600 font-medium transition"
              >
                Reset Pilihan (Lihat Semua)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Switcher Tab Mobile untuk Layar Kecil */}
      {isSplitView && (
        <div className="flex lg:hidden items-center p-1 bg-zinc-100 rounded-2xl w-full">
          <button
            type="button"
            onClick={() => setMobileActiveTab('brosur')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${mobileActiveTab === 'brosur' ? 'bg-white text-emerald-800 shadow-xs' : 'text-zinc-600'}`}
          >
            Naskah Brosur Asli
          </button>
          <button
            type="button"
            onClick={() => setMobileActiveTab('hadist')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${mobileActiveTab === 'hadist' ? 'bg-white text-emerald-800 shadow-xs' : 'text-zinc-600'}`}
          >
            Hasil Parsing Hadits ({hadistItems.length})
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAMPILAN SPLIT VIEW (KIRI: BROSUR ASLI | KANAN: PARSING) */}
      {/* ======================================================== */}
      {isSplitView ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          
          {/* ---------------------------------------------------- */}
          {/* PANEL KIRI: BROSUR ASLI (6 COLS) */}
          {/* ---------------------------------------------------- */}
          <div className={`lg:col-span-6 flex flex-col h-[820px] bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden ${mobileActiveTab === 'hadist' ? 'hidden lg:flex' : 'flex'}`}>
            {/* Header Panel Kiri */}
            <div className="p-3.5 sm:p-4 bg-zinc-50/90 border-b border-zinc-200/70 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileText size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      Naskah Brosur Asli
                    </span>
                    {activeBrosur?.tahun && (
                      <span className="text-[10px] font-bold text-zinc-600 bg-white border border-zinc-200 px-1.5 py-0.2 rounded-md">
                        {activeBrosur.tahun}
                      </span>
                    )}
                    {activeBrosur?.folders?.name && (
                      <span className="text-[10px] text-zinc-500 bg-white border border-zinc-200 px-1.5 py-0.2 rounded-md truncate max-w-[120px]">
                        {activeBrosur.folders.name}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xs sm:text-sm font-bold text-zinc-900 truncate leading-snug" title={activeBrosur?.judul || 'Pilih Brosur'}>
                    {activeBrosur?.judul || (filterBrosurId !== 'all' ? `Brosur: ${filterBrosurId}` : 'Belum Memilih Brosur')}
                  </h2>
                </div>
              </div>

              {/* Aksi di Header Kiri: Mode Teks & Link Reader */}
              <div className="flex items-center gap-1.5 shrink-0">
                {activeBrosur && (
                  <>
                    <div className="flex items-center p-0.5 bg-zinc-200/70 rounded-xl text-[11px] font-medium">
                      <button
                        type="button"
                        onClick={() => setBrosurViewMode('html')}
                        className={`px-2.5 py-1 rounded-lg transition ${brosurViewMode === 'html' ? 'bg-white text-zinc-900 font-semibold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
                        title="Tampilkan format dokumen HTML asli"
                      >
                        HTML
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrosurViewMode('text')}
                        className={`px-2.5 py-1 rounded-lg transition ${brosurViewMode === 'text' ? 'bg-white text-zinc-900 font-semibold shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
                        title="Tampilkan teks bersih"
                      >
                        Teks Bersih
                      </button>
                    </div>

                    <Link
                      href={`/bap/${activeBrosur.tahun || '2026'}/${activeBrosur.slug || activeBrosur.id}`}
                      target="_blank"
                      className="p-1.5 sm:px-2.5 sm:py-1.5 text-zinc-600 hover:text-emerald-700 bg-white hover:bg-zinc-100 rounded-xl border border-zinc-200 text-xs font-medium transition flex items-center gap-1"
                      title="Buka pratinjau brosur di tab baru"
                    >
                      <span className="hidden sm:inline text-[11px]">Buka Reader</span>
                      <ExternalLink size={13} />
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Search & Sorot Bar di Naskah Brosur */}
            {activeBrosur && (
              <div className="px-3.5 py-2 bg-zinc-50/50 border-b border-zinc-200/50 flex items-center gap-2 shrink-0">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={brosurSearchQuery}
                    onChange={(e) => setBrosurSearchQuery(e.target.value)}
                    placeholder="Cari atau sorot frasa kata di dalam teks brosur..."
                    className="w-full bg-white border border-zinc-200 rounded-xl pl-8 pr-7 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  />
                  {brosurSearchQuery && (
                    <button
                      onClick={() => setBrosurSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                      title="Bersihkan pencarian"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
                {brosurSearchQuery && (
                  <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg shrink-0">
                    Sorotan Aktif
                  </span>
                )}
              </div>
            )}

            {/* Viewport Konten Brosur */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white selection:bg-amber-100 selection:text-amber-900">
              {loadingBrosur ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2 className="animate-spin text-emerald-600" size={26} />
                  <p className="text-xs text-zinc-400 font-medium">Memuat naskah brosur...</p>
                </div>
              ) : !activeBrosur ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                    <BookOpen size={24} />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-800">Pilih Brosur untuk Melihat Naskah Asli</h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
                    Pilih edisi brosur dari dropdown filter di atas untuk membandingkan naskah asli (kiri) dengan hadits hasil parsing (kanan).
                  </p>
                  <div className="mt-4 w-full max-w-sm">
                    <select
                      value={filterBrosurId}
                      onChange={(e) => setFilterBrosurId(e.target.value)}
                      className="w-full bg-[#FAFAFA] border border-zinc-200 rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="all">-- Pilih Brosur Sumber --</option>
                      {brosurList.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.tahun ? `[${b.tahun}] ` : ''}{b.judul}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : brosurViewMode === 'html' && activeBrosur.konten ? (
                <div 
                  className="prose max-w-none text-zinc-800 text-sm leading-relaxed font-sans [&_p]:mb-3 [&_table]:my-3 [&_img]:max-w-full [&_img]:rounded-lg [&_[dir=rtl]]:font-serif [&_[dir=rtl]]:text-lg [&_[dir=rtl]]:leading-loose"
                  dangerouslySetInnerHTML={{ __html: sanitizedBrosurHtml }}
                />
              ) : (
                <div className="text-xs sm:text-sm text-zinc-800 leading-relaxed font-sans whitespace-pre-wrap">
                  {activeBrosur.teks_bersih || (
                    <p className="text-zinc-400 italic">Tidak ada teks bersih tersedia. Silakan gunakan mode HTML.</p>
                  )}
                </div>
              )}
            </div>

            {/* Footer Bar Panel Kiri */}
            {activeBrosur && (
              <div className="p-2.5 sm:px-4 sm:py-2.5 bg-zinc-50 border-t border-zinc-200/60 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
                <span className="font-mono text-[10px]">
                  ID: {activeBrosur.id}
                </span>
                <Link
                  href={`/admin/data-brosur/edit/${activeBrosur.id}`}
                  className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 transition"
                >
                  <Edit2 size={12} />
                  <span>Sunting Naskah Brosur</span>
                </Link>
              </div>
            )}
          </div>

          {/* ---------------------------------------------------- */}
          {/* PANEL KANAN: HASIL PARSING HADITS (6 COLS) */}
          {/* ---------------------------------------------------- */}
          <div className={`lg:col-span-6 flex flex-col h-[820px] bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden ${mobileActiveTab === 'brosur' ? 'hidden lg:flex' : 'flex'}`}>
            {/* Header Bar Panel Kanan */}
            <div className="p-3.5 sm:p-4 bg-zinc-50/90 border-b border-zinc-200/70 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <ScrollText size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      Hasil Parsing Hadits
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.2 rounded-full">
                      {hadistItems.length} Dalil
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {filterBrosurId !== 'all' ? 'Kutipan hadits khusus brosur terpilih' : 'Seluruh kutipan hadits brosur'}
                  </p>
                </div>
              </div>

              {/* Tombol Ekstraksi / Generator AI */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Link
                  href="/dashboard/hadist/generate"
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                  title="Buka Generator AI untuk mengekstrak dalil hadits"
                >
                  <Sparkles size={13} />
                  <span className="hidden sm:inline text-[11px]">Ekstrak AI</span>
                </Link>
              </div>
            </div>

            {/* Search & Filter Bar di Hadits */}
            <div className="p-2.5 sm:p-3 bg-zinc-50/50 border-b border-zinc-200/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Cari matan Arab, terjemahan, atau perawi..."
                  className="w-full bg-white border border-zinc-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-800 placeholder-zinc-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-medium"
                />
              </div>

              <select
                value={filterRawiItem}
                onChange={(e) => { setFilterRawiItem(e.target.value); setCurrentPage(1); }}
                className="bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-zinc-700 outline-none"
              >
                <option value="all">Semua Perawi</option>
                {rawiList.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Viewport Daftar Hadits */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 bg-[#FAFAFA]">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 py-20">
                  <Loader2 className="animate-spin text-emerald-600" size={24} />
                  <p className="text-xs text-zinc-400 font-medium">Memuat kutipan hadist...</p>
                </div>
              ) : hadistItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-zinc-200/60">
                  <ScrollText className="text-zinc-300 mb-2" size={32} />
                  <h4 className="text-xs font-bold text-zinc-800">Belum Ada Hadits Terparsing</h4>
                  <p className="text-[11px] text-zinc-400 mt-1 max-w-xs leading-relaxed">
                    Brosur ini belum memiliki dalil hadits yang diparsing ke dalam database.
                  </p>
                  <Link
                    href="/dashboard/hadist/generate"
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition"
                  >
                    <Sparkles size={14} />
                    <span>Ekstrak Hadits dengan AI Sekarang</span>
                  </Link>
                </div>
              ) : (
                paginatedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 sm:p-4 rounded-2xl bg-white border border-zinc-200/70 hover:border-emerald-300 shadow-xs hover:shadow-sm transition space-y-2.5 group"
                  >
                    {/* Top row: Badges & No. Hadist */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                          {item.rawi_kitab || item.rawi_teratas || 'Hadist'}
                        </span>
                        {item.no_hadist && (
                          <span className="text-[10px] font-mono text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md font-semibold">
                            No. {item.no_hadist}
                          </span>
                        )}
                        {item.status_hadist && (
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            item.status_hadist === 'terverifikasi'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          }`}>
                            {item.status_hadist}
                          </span>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1">
                        {/* Tombol Temukan di Naskah Brosur */}
                        <button
                          type="button"
                          onClick={() => handleFindInBrosur(item)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition"
                          title="Sorot teks hadits ini pada naskah brosur di sebelah kiri"
                        >
                          <Search size={11} />
                          <span>Cocokkan di Teks</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="p-1.5 text-zinc-400 hover:text-emerald-700 hover:bg-zinc-100 rounded-lg transition"
                          title="Sunting Hadist Ini"
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewItem(item)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition"
                          title="Lihat Detail Lengkap"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Matan Arab */}
                    {item.kutipan_arab && (
                      <div className="text-right text-base sm:text-lg font-serif text-zinc-900 leading-loose bg-zinc-50/70 p-3 rounded-xl border border-zinc-100" dir="rtl">
                        {item.kutipan_arab}
                      </div>
                    )}

                    {/* Terjemahan */}
                    {item.terjemahan && (
                      <p className="text-xs text-zinc-700 leading-relaxed italic bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100/50">
                        "{item.terjemahan}"
                      </p>
                    )}

                    {/* Footer Card */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1.5 border-t border-zinc-100">
                      <span className="truncate max-w-[200px]">{item.perawi_sumber || 'Riwayat Kitab Hadist'}</span>
                      <span className="font-mono">Dalil #{idx + 1 + (currentPage - 1) * itemsPerPage}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div className="p-3 bg-zinc-50 border-t border-zinc-200/60 flex items-center justify-between shrink-0 text-xs">
                <span className="text-[11px] text-zinc-500">
                  Hal. <strong className="text-zinc-900">{currentPage}</strong> / {totalPages} ({totalItems} data)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-600 disabled:opacity-40 transition"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-600 disabled:opacity-40 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ======================================================== */
        /* TAMPILAN STANDAR (FULL-WIDTH DAFTAR HADITS) */
        /* ======================================================== */
        <div className="space-y-4">
          {/* List Hadist Items */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-emerald-600" size={24} />
              <p className="text-xs text-zinc-400 font-medium">Memuat kutipan hadist brosur...</p>
            </div>
          ) : hadistItems.length === 0 ? (
            <div className="py-16 text-center bg-[#FAFAFA] rounded-2xl">
              <ScrollText className="mx-auto text-zinc-300 mb-2" size={32} />
              <p className="text-xs font-semibold text-zinc-600">Tidak ada hadist ditemukan</p>
              <p className="text-[11px] text-zinc-400 mt-1">Coba sesuaikan kata kunci pencarian atau perawi.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#FAFAFA] hover:bg-zinc-100/70 transition space-y-3 group border border-transparent hover:border-zinc-200/60"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                        {item.rawi_kitab || item.rawi_teratas || 'Hadist'}
                      </span>
                      {item.no_hadist && (
                        <span className="text-[10px] font-mono text-zinc-600 bg-white px-2 py-0.5 rounded-md font-semibold">
                          No. {item.no_hadist}
                        </span>
                      )}
                      {item.brosur?.judul && (
                        <span className="text-[10px] font-medium text-zinc-500 truncate max-w-xs">
                          Brosur: {item.brosur.judul}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-600 hover:text-emerald-700 hover:bg-white transition"
                        title="Sunting Hadist Ini"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => setViewItem(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-700 hover:bg-white transition"
                        title="Lihat Pratinjau Lengkap"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </div>

                  {item.kutipan_arab && (
                    <div className="text-right text-base sm:text-lg font-serif text-zinc-800 leading-loose" dir="rtl">
                      {item.kutipan_arab}
                    </div>
                  )}

                  {item.terjemahan && (
                    <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2 italic">
                      "{item.terjemahan}"
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-200/50">
                    <span>{item.perawi_sumber || 'Riwayat Kitab Hadist'}</span>
                    <span className="font-mono text-[10px]">ID: {item.id.slice(0, 8)}</span>
                  </div>
                </div>
              ))}

              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 sm:p-4 bg-[#FAFAFA] rounded-2xl">
                  <span className="text-xs text-zinc-500 font-medium text-center sm:text-left">
                    Halaman <span className="font-bold text-zinc-900">{currentPage}</span> dari <span className="font-bold text-zinc-900">{totalPages}</span> ({totalItems} hadist)
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
      )}

      {/* ======================================================== */}
      {/* DRAWER OFF-CANVAS: AUDIT LOG RIWAYAT EDITOR */}
      {/* ======================================================== */}
      {showLogSidebar && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={16} className="text-emerald-600" />
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Log Audit Editor Hadist
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={fetchLogs}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-white transition"
                  title="Segarkan Log"
                >
                  <RefreshCw size={13} className={loadingLogs ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setShowLogSidebar(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-white transition"
                  title="Tutup Log"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Catatan riwayat audit siapa saja admin yang melakukan perubahan data hadist brosur.
              </p>

              {loadingLogs ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 size={18} className="animate-spin text-emerald-600" />
                  <span className="text-[11px] text-zinc-400">Memuat log audit...</span>
                </div>
              ) : editLogs.length === 0 ? (
                <div className="py-12 text-center text-zinc-400">
                  <History size={24} className="mx-auto mb-2 text-zinc-300" />
                  <p className="text-xs font-semibold text-zinc-600">Belum ada riwayat suntingan</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Setiap perubahan hadist akan dicatat di sini.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {editLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span className="font-semibold text-zinc-700 flex items-center gap-1">
                          <User size={10} className="text-emerald-600" />
                          {log.editor_name || log.editor_email}
                        </span>
                        <span>{new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <p className="font-semibold text-zinc-900 line-clamp-1">
                        {log.hadist_title || 'Hadist'} ({log.rawi_kitab})
                      </p>

                      <p className="text-[11px] text-zinc-600 leading-snug">
                        {log.field_changes}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL SUNTING HADIST */}
      {/* ======================================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-zinc-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  Sunting Dalil Hadist Brosur
                </h3>
                <p className="text-[11px] text-zinc-400">
                  {editingItem.brosur?.judul ? `Brosur: ${editingItem.brosur.judul}` : 'ID: ' + editingItem.id}
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-xl hover:bg-zinc-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">
                  Kutipan Matan Arab (RTL)
                </label>
                <textarea
                  value={formArab}
                  onChange={(e) => setFormArab(e.target.value)}
                  dir="rtl"
                  rows={4}
                  className="w-full bg-[#FAFAFA] rounded-xl p-3 text-base sm:text-lg font-serif text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition leading-loose"
                  placeholder="Kutipan teks hadits berbahasa Arab..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">
                  Terjemahan Bahasa Indonesia
                </label>
                <textarea
                  value={formTerjemahan}
                  onChange={(e) => setFormTerjemahan(e.target.value)}
                  rows={4}
                  className="w-full bg-[#FAFAFA] rounded-xl p-3 text-xs sm:text-sm text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition leading-relaxed"
                  placeholder="Terjemahan matan hadits dalam bahasa Indonesia..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">
                    Nama Kitab / Perawi Terkenal
                  </label>
                  <input
                    type="text"
                    value={formRawiKitab}
                    onChange={(e) => setFormRawiKitab(e.target.value)}
                    className="w-full bg-[#FAFAFA] rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder="Contoh: HR. Bukhari, Muslim, dll."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">
                    Nomor Hadist
                  </label>
                  <input
                    type="text"
                    value={formNoHadist}
                    onChange={(e) => setFormNoHadist(e.target.value)}
                    className="w-full bg-[#FAFAFA] rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition font-mono"
                    placeholder="Contoh: 1845"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">
                    Perawi Lengkap / Sanad
                  </label>
                  <input
                    type="text"
                    value={formPerawiSumber}
                    onChange={(e) => setFormPerawiSumber(e.target.value)}
                    className="w-full bg-[#FAFAFA] rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder="Contoh: Dari Abu Hurairah r.a."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">
                    Juz
                  </label>
                  <input
                    type="text"
                    value={formJuz}
                    onChange={(e) => setFormJuz(e.target.value)}
                    className="w-full bg-[#FAFAFA] rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder="Contoh: Juz 2"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700">
                    Halaman
                  </label>
                  <input
                    type="text"
                    value={formHalaman}
                    onChange={(e) => setFormHalaman(e.target.value)}
                    className="w-full bg-[#FAFAFA] rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition"
                    placeholder="Contoh: Hal. 135"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700">
                  Status Verifikasi Dalil
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full bg-[#FAFAFA] rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition"
                >
                  <option value="terverifikasi">Terverifikasi (Sudah Tervalidasi)</option>
                  <option value="perlu_tinjauan">Perlu Tinjauan (Butuh Cek Ulang)</option>
                  <option value="mentah">Draft Mentah</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
                >
                  {savingEdit ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL LIHAT DETAIL HADIST */}
      {/* ======================================================== */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-zinc-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md">
                  {viewItem.rawi_kitab || viewItem.rawi_teratas || 'Hadist'}
                </span>
                {viewItem.no_hadist && (
                  <span className="text-[10px] font-mono text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-md font-bold">
                    No. {viewItem.no_hadist}
                  </span>
                )}
              </div>
              <button
                onClick={() => setViewItem(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-xl hover:bg-zinc-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            {viewItem.brosur?.judul && (
              <p className="text-xs text-zinc-500">
                Sumber Brosur: <strong className="text-zinc-800">{viewItem.brosur.judul}</strong> ({viewItem.brosur.tahun})
              </p>
            )}

            {viewItem.kutipan_arab && (
              <div className="text-right text-lg sm:text-xl font-serif text-zinc-900 leading-loose bg-[#FAFAFA] p-4 sm:p-5 rounded-2xl" dir="rtl">
                {viewItem.kutipan_arab}
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Terjemahan / Makna Dalil
              </span>
              <p className="text-xs sm:text-sm text-zinc-800 leading-relaxed bg-[#FAFAFA] p-4 rounded-2xl">
                {viewItem.terjemahan || 'Tidak ada terjemahan.'}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                onClick={() => {
                  const it = viewItem;
                  setViewItem(null);
                  openEditModal(it);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition"
              >
                <Edit2 size={13} />
                <span>Sunting Hadist</span>
              </button>
              <button
                onClick={() => setViewItem(null)}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function AdminHadistBrosurPage() {
  return (
    <Suspense fallback={
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-emerald-600" size={24} />
        <p className="text-xs text-zinc-400 font-medium">Memuat data hadist...</p>
      </div>
    }>
      <AdminHadistBrosurContent />
    </Suspense>
  );
}
