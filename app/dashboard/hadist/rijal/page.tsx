'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Search, Eye, Edit3, Trash2, ChevronLeft, ChevronRight,
  RefreshCw, Sparkles, Loader2, X, CheckCircle, BookOpen, ShieldCheck, FileText
} from 'lucide-react';

interface RawiItem {
  id: string;
  nama_rawi: string;
  nama_arab?: string | null;
  kategori_rawi?: string | null;
  thabaqat?: string | null;
  kredibilitas?: string | null;
  biografi?: string | null;
  total_hadist?: number;
}

const EMPTY_FORM = {
  id: '',
  nama_rawi: '',
  nama_arab: '',
  kategori_rawi: 'sahabat',
  thabaqat: 'Sahabat',
  kredibilitas: 'Shahabi / Adil',
  biografi: '',
};

export default function MasterPerawiPage() {
  const [rawiList, setRawiList] = useState<RawiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKategori, setFilterKategori] = useState<'all' | 'sahabat' | 'tabiin' | 'perawi' | 'no_bio'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Sync & AI Batch states
  const [syncing, setSyncing] = useState(false);
  const [batchEnriching, setBatchEnriching] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, label: '' });
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  // Detail Modal states
  const [detailItem, setDetailItem] = useState<RawiItem | null>(null);
  const [relatedHadists, setRelatedHadists] = useState<any[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Add / Edit Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [savingForm, setSavingForm] = useState(false);
  const [aiFillingForm, setAiFillingForm] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterKategori, itemsPerPage]);

  useEffect(() => {
    fetchRawiList();
  }, []);

  const fetchRawiList = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hadist/rawi', { cache: 'no-store' });
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

  // Sync perawi baru dari kolom rawi_teratas di hadist_brosur
  const handleSyncFromHadist = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/hadist/rawi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_from_hadist' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Gagal sinkronisasi: ' + (data.error || 'Server error'));
      } else {
        alert(data.message || 'Sinkronisasi selesai.');
        if (data.addedCount > 0) {
          fetchRawiList();
        }
      }
    } catch (e: any) {
      alert('Error sinkronisasi: ' + (e.message || e));
    } finally {
      setSyncing(false);
    }
  };

  // Enrich 1 perawi dengan DeepSeek AI
  const handleEnrichSingle = async (rw: RawiItem) => {
    try {
      setEnrichingId(rw.id);
      const res = await fetch('/api/hadist/rawi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enrich_ai',
          id: rw.id,
          nama_rawi: rw.nama_rawi,
          save_to_db: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Gagal melengkapi biografi AI: ' + (data.error || 'Server error'));
      } else if (data.rawi) {
        setRawiList(prev =>
          prev.map(item => (item.id === rw.id ? { ...item, ...data.rawi } : item))
        );
        if (detailItem?.id === rw.id) {
          setDetailItem(prev => (prev ? { ...prev, ...data.rawi } : null));
        }
      }
    } catch (e: any) {
      alert('Error AI: ' + (e.message || e));
    } finally {
      setEnrichingId(null);
    }
  };

  // Batch enrich semua perawi yang biografinya masih kosong
  const handleBatchEnrichMissingBio = async () => {
    const missing = rawiList.filter(r => !r.biografi || !r.biografi.trim());
    if (missing.length === 0) {
      alert('Semua perawi sudah memiliki biografi!');
      return;
    }

    if (!window.confirm(`Lengkapi otomatis biografi, nama Arab, thabaqat, dan kredibilitas untuk ${missing.length} perawi menggunakan DeepSeek AI?`)) {
      return;
    }

    setBatchEnriching(true);
    setBatchProgress({ current: 0, total: missing.length, label: 'Memulai...' });

    const concurrency = 3;
    let nextIdx = 0;
    let doneCount = 0;

    const workers = Array.from({ length: Math.min(concurrency, missing.length) }, async () => {
      while (true) {
        const idx = nextIdx++;
        if (idx >= missing.length) break;
        const rw = missing[idx];
        setBatchProgress({ current: doneCount, total: missing.length, label: `DeepSeek AI: ${rw.nama_rawi}` });
        try {
          const res = await fetch('/api/hadist/rawi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'enrich_ai',
              id: rw.id,
              nama_rawi: rw.nama_rawi,
              save_to_db: true,
            }),
          });
          const data = await res.json();
          if (res.ok && data.rawi) {
            setRawiList(prev =>
              prev.map(item => (item.id === rw.id ? { ...item, ...data.rawi } : item))
            );
          }
        } catch (err) {
          console.warn('Batch enrich error on', rw.nama_rawi, err);
        }
        doneCount++;
        setBatchProgress({ current: doneCount, total: missing.length, label: `Selesai ${doneCount}/${missing.length}` });
      }
    });

    await Promise.all(workers);
    setBatchEnriching(false);
    setBatchProgress({ current: 0, total: 0, label: '' });
  };

  // Buka Detail Modal & muat hadits terkait
  const handleOpenDetail = async (rw: RawiItem) => {
    setDetailItem(rw);
    setRelatedHadists([]);
    setLoadingRelated(true);
    try {
      const cleanName = rw.nama_rawi.replace(/\s+(ra\.?|r\.a\.?)$/i, '').trim();
      const res = await fetch(`/api/hadist/items?rawi_kitab=${encodeURIComponent(cleanName)}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.items)) {
        setRelatedHadists(data.items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingRelated(false);
    }
  };

  // Buka Form Tambah / Edit
  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData(EMPTY_FORM);
    setShowFormModal(true);
  };

  const handleOpenEdit = (rw: RawiItem) => {
    setIsEditMode(true);
    setFormData({
      id: rw.id,
      nama_rawi: rw.nama_rawi || '',
      nama_arab: rw.nama_arab || '',
      kategori_rawi: rw.kategori_rawi || 'sahabat',
      thabaqat: rw.thabaqat || '',
      kredibilitas: rw.kredibilitas || 'Thiqah',
      biografi: rw.biografi || '',
    });
    setShowFormModal(true);
  };

  const handleAutoFillFormAI = async () => {
    if (!formData.nama_rawi.trim()) {
      alert('Masukkan Nama Perawi terlebih dahulu.');
      return;
    }
    try {
      setAiFillingForm(true);
      const res = await fetch('/api/hadist/rawi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enrich_ai',
          nama_rawi: formData.nama_rawi.trim(),
          save_to_db: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Gagal memanggil DeepSeek AI: ' + (data.error || 'Server error'));
      } else if (data.enriched) {
        setFormData(prev => ({
          ...prev,
          nama_arab: data.enriched.nama_arab || prev.nama_arab,
          kategori_rawi: data.enriched.kategori_rawi || prev.kategori_rawi,
          thabaqat: data.enriched.thabaqat || prev.thabaqat,
          kredibilitas: data.enriched.kredibilitas || prev.kredibilitas,
          biografi: data.enriched.biografi || prev.biografi,
        }));
      }
    } catch (e: any) {
      alert('Error AI: ' + (e.message || e));
    } finally {
      setAiFillingForm(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_rawi.trim()) {
      alert('Nama Perawi wajib diisi.');
      return;
    }
    try {
      setSavingForm(true);
      const res = await fetch('/api/hadist/rawi', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Gagal menyimpan: ' + (data.error || 'Server error'));
      } else {
        setShowFormModal(false);
        fetchRawiList();
      }
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    } finally {
      setSavingForm(false);
    }
  };

  const handleDeleteRawi = async (rw: RawiItem) => {
    if (!window.confirm(`Hapus perawi "${rw.nama_rawi}" dari Rijalul Hadits?`)) return;
    try {
      const res = await fetch(`/api/hadist/rawi?id=${encodeURIComponent(rw.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Gagal menghapus: ' + (data.error || 'Server error'));
      } else {
        setRawiList(prev => prev.filter(item => item.id !== rw.id));
        if (detailItem?.id === rw.id) setDetailItem(null);
      }
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    }
  };

  // Stats
  const sahabatCount = rawiList.filter(r => r.kategori_rawi === 'sahabat').length;
  const tabiinPerawiCount = rawiList.filter(r => r.kategori_rawi !== 'sahabat').length;
  const missingBioCount = rawiList.filter(r => !r.biografi || !r.biografi.trim()).length;

  const filteredRawi = useMemo(() => {
    return rawiList.filter(rw => {
      if (filterKategori === 'sahabat' && rw.kategori_rawi !== 'sahabat') return false;
      if (filterKategori === 'tabiin' && rw.kategori_rawi !== 'tabiin') return false;
      if (filterKategori === 'perawi' && (rw.kategori_rawi === 'sahabat' || rw.kategori_rawi === 'tabiin')) return false;
      if (filterKategori === 'no_bio' && rw.biografi && rw.biografi.trim()) return false;

      if (!searchQuery.trim()) return true;
      const lowerQ = searchQuery.toLowerCase();
      return (
        rw.nama_rawi?.toLowerCase().includes(lowerQ) ||
        rw.nama_arab?.toLowerCase().includes(lowerQ) ||
        rw.kredibilitas?.toLowerCase().includes(lowerQ) ||
        rw.biografi?.toLowerCase().includes(lowerQ)
      );
    });
  }, [rawiList, searchQuery, filterKategori]);

  const totalPages = Math.max(1, Math.ceil(filteredRawi.length / itemsPerPage));
  const currentRows = filteredRawi.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Amiri:wght@400;700&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .arabic-text { font-family: 'Amiri', serif; direction: rtl; }
      `}} />

      <div className="p-4 sm:p-6 space-y-5 font-jakarta text-slate-800 bg-slate-50/70 min-h-full">

        {/* Header + Aksi Utama */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-purple-600 text-xs font-bold mb-1">
                <Users className="w-3.5 h-3.5" />
                <span>Master Data Referensi</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Rijalul Hadits (Sahabat &amp; Perawi Sanad)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola profil perawi (Al-Jarh wa At-Ta&apos;dil), tarik otomatis dari hasil ekstraksi hadits, dan lengkapi biografi via DeepSeek AI.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSyncFromHadist}
                disabled={syncing || batchEnriching}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-xl transition cursor-pointer"
                title="Tarik nama perawi (rawi_teratas) dari tabel hadist_brosur"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Menyinkronkan...' : 'Tarik dari Hadits'}
              </button>

              <button
                type="button"
                onClick={handleBatchEnrichMissingBio}
                disabled={batchEnriching || missingBioCount === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 rounded-xl transition cursor-pointer"
              >
                {batchEnriching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Lengkapi Biografi AI ({missingBioCount})
              </button>

              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Perawi
              </button>
            </div>
          </div>

          {/* 4 Kartu Statistik Interaktif */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setFilterKategori('all')}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                filterKategori === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
              }`}
            >
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${filterKategori === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Total Perawi
                </p>
                <p className="text-2xl font-black mt-0.5">{loading ? '—' : rawiList.length}</p>
              </div>
              <Users className={`w-6 h-6 ${filterKategori === 'all' ? 'text-slate-300' : 'text-purple-500'}`} />
            </button>

            <button
              type="button"
              onClick={() => setFilterKategori('sahabat')}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                filterKategori === 'sahabat'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-purple-50/60 border-purple-200/70 hover:bg-purple-100/60'
              }`}
            >
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${filterKategori === 'sahabat' ? 'text-purple-100' : 'text-purple-700'}`}>
                  Sahabat Nabi ﷺ
                </p>
                <p className={`text-2xl font-black mt-0.5 ${filterKategori === 'sahabat' ? 'text-white' : 'text-purple-900'}`}>
                  {loading ? '—' : sahabatCount}
                </p>
              </div>
              <ShieldCheck className={`w-6 h-6 ${filterKategori === 'sahabat' ? 'text-purple-100' : 'text-purple-600'}`} />
            </button>

            <button
              type="button"
              onClick={() => setFilterKategori('perawi')}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                filterKategori === 'perawi'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50/60 border-emerald-200/70 hover:bg-emerald-100/60'
              }`}
            >
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${filterKategori === 'perawi' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                  Tabi&apos;in &amp; Perawi
                </p>
                <p className={`text-2xl font-black mt-0.5 ${filterKategori === 'perawi' ? 'text-white' : 'text-emerald-900'}`}>
                  {loading ? '—' : tabiinPerawiCount}
                </p>
              </div>
              <BookOpen className={`w-6 h-6 ${filterKategori === 'perawi' ? 'text-emerald-100' : 'text-emerald-600'}`} />
            </button>

            <button
              type="button"
              onClick={() => setFilterKategori('no_bio')}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                filterKategori === 'no_bio'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-amber-50/60 border-amber-200/70 hover:bg-amber-100/60'
              }`}
            >
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${filterKategori === 'no_bio' ? 'text-amber-100' : 'text-amber-700'}`}>
                  Belum Ada Biografi
                </p>
                <p className={`text-2xl font-black mt-0.5 ${filterKategori === 'no_bio' ? 'text-white' : 'text-amber-900'}`}>
                  {loading ? '—' : missingBioCount}
                </p>
              </div>
              <FileText className={`w-6 h-6 ${filterKategori === 'no_bio' ? 'text-amber-100' : 'text-amber-600'}`} />
            </button>
          </div>
        </div>

        {/* Batch AI Progress Bar */}
        {batchEnriching && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 text-amber-900">
            <Loader2 className="w-5 h-5 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Melengkapi Biografi Rijalul Hadits dengan DeepSeek AI...</span>
                <span>{batchProgress.current} / {batchProgress.total}</span>
              </div>
              <p className="text-xs opacity-80 truncate mt-0.5">{batchProgress.label}</p>
              <div className="w-full h-2 bg-amber-200 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-amber-500 transition-all duration-300"
                  style={{ width: `${batchProgress.total > 0 ? Math.round((batchProgress.current / batchProgress.total) * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TABEL DATA RIJALUL HADITS */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <input
                  type="text"
                  placeholder="Cari nama perawi, Arab, kredibilitas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs py-2 pl-8 pr-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>

              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value as any)}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
              >
                <option value="all">Semua Kategori ({rawiList.length})</option>
                <option value="sahabat">Sahabat Nabi ({sahabatCount})</option>
                <option value="tabiin">Tabi&apos;in</option>
                <option value="perawi">Perawi Sanad</option>
                <option value="no_bio">Belum Ada Biografi ({missingBioCount})</option>
              </select>
            </div>

            <button
              type="button"
              onClick={fetchRawiList}
              disabled={loading}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 pl-4 pr-2 w-12 text-center">#</th>
                  <th className="py-3 px-3">Nama Perawi &amp; Arab</th>
                  <th className="py-3 px-3 w-44">Kategori &amp; Kredibilitas</th>
                  <th className="py-3 px-3">Biografi Singkat</th>
                  <th className="py-3 px-3 w-28 text-center">Total Hadits</th>
                  <th className="py-3 pl-3 pr-4 w-44 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                      Memuat data rijalul hadits...
                    </td>
                  </tr>
                ) : currentRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada perawi ditemukan. Klik <strong>Tarik dari Hadits</strong> atau <strong>Tambah Perawi</strong>.
                    </td>
                  </tr>
                ) : (
                  currentRows.map((rw, idx) => {
                    const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;
                    const isEnrichingThis = enrichingId === rw.id;
                    return (
                      <tr key={rw.id} className="hover:bg-slate-50/70 transition-colors align-middle">
                        <td className="py-3.5 pl-4 pr-2 text-center font-mono text-[11px] text-slate-400">
                          {rowNum}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-900 text-sm">{rw.nama_rawi}</div>
                          {rw.nama_arab && (
                            <div className="arabic-text text-slate-600 text-[15px] mt-0.5 font-semibold text-right sm:text-left">
                              {rw.nama_arab}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200/70">
                              {rw.kredibilitas || 'Thiqah'}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {rw.kategori_rawi === 'sahabat'
                                ? 'Sahabat Nabi ﷺ'
                                : rw.kategori_rawi === 'tabiin'
                                ? "Tabi'in"
                                : 'Perawi Sanad'}
                              {rw.thabaqat ? ` • ${rw.thabaqat}` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 max-w-md">
                          {rw.biografi ? (
                            <p className="text-slate-600 line-clamp-2 leading-relaxed">{rw.biografi}</p>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEnrichSingle(rw)}
                              disabled={isEnrichingThis}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition cursor-pointer"
                            >
                              {isEnrichingThis ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3" />
                              )}
                              {isEnrichingThis ? 'Mengisi...' : 'Isi Biografi AI'}
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(rw)}
                            className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px] hover:bg-blue-100 transition cursor-pointer"
                          >
                            {rw.total_hadist || 0} hadits
                          </button>
                        </td>
                        <td className="py-3.5 pl-3 pr-4 text-right">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(rw)}
                              className="p-1.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition cursor-pointer"
                              title="Lihat Detail & Hadits Terkait"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEnrichSingle(rw)}
                              disabled={isEnrichingThis}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer disabled:opacity-50"
                              title="Sempurnakan Profil via DeepSeek AI"
                            >
                              {isEnrichingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(rw)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                              title="Edit Data"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRawi(rw)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Hapus Perawi"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                Menampilkan <strong className="text-slate-700">
                  {filteredRawi.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredRawi.length)}
                </strong> dari <strong className="text-slate-700">{filteredRawi.length}</strong> perawi
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-700"
              >
                <option value={15}>15 / hal</option>
                <option value={25}>25 / hal</option>
                <option value={50}>50 / hal</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-3 py-1.5 font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 font-semibold cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL DETAIL PERAWI + DAFTAR HADITS TERKAIT               */}
      {/* ========================================================= */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 font-jakarta">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                    {detailItem.kredibilitas || 'Thiqah'}
                  </span>
                  {detailItem.thabaqat && (
                    <span className="text-[11px] font-semibold text-slate-500">{detailItem.thabaqat}</span>
                  )}
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 mt-1">{detailItem.nama_rawi}</h2>
                {detailItem.nama_arab && (
                  <p className="arabic-text text-lg text-slate-700 font-bold mt-0.5 text-left">{detailItem.nama_arab}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-800">Biografi Ringkas</h3>
                  <button
                    type="button"
                    onClick={() => handleEnrichSingle(detailItem)}
                    disabled={enrichingId === detailItem.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 transition cursor-pointer"
                  >
                    {enrichingId === detailItem.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Sempurnakan AI
                  </button>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {detailItem.biografi || 'Belum ada catatan biografi. Klik "Sempurnakan AI" untuk melengkapi otomatis.'}
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                  Riwayat Hadits Terkait ({relatedHadists.length})
                </h3>
                {loadingRelated ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                    Memuat hadits terkait...
                  </div>
                ) : relatedHadists.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                    Belum ada hadits di database yang terhubung dengan perawi ini.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {relatedHadists.slice(0, 20).map((h, i) => (
                      <div key={h.id || i} className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            {h.perawi_sumber || h.rawi_kitab || 'Hadits'}
                          </span>
                          {h.brosur?.judul && (
                            <span className="text-slate-400 truncate max-w-[260px]">{h.brosur.judul}</span>
                          )}
                        </div>
                        {h.kutipan_arab && h.kutipan_arab !== '-' && (
                          <p className="arabic-text text-sm text-slate-900 font-semibold leading-loose text-right">
                            {h.kutipan_arab}
                          </p>
                        )}
                        {h.terjemahan && (
                          <p className="text-xs text-slate-600 leading-relaxed">{h.terjemahan}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = detailItem;
                  setDetailItem(null);
                  handleOpenEdit(target);
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Profil
              </button>
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL TAMBAH / EDIT PERAWI                                */}
      {/* ========================================================= */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 font-jakarta">
          <form
            onSubmit={handleSubmitForm}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">
                {isEditMode ? 'Edit Profil Perawi' : 'Tambah Perawi Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Nama Perawi *</label>
                  <button
                    type="button"
                    onClick={handleAutoFillFormAI}
                    disabled={aiFillingForm || !formData.nama_rawi.trim()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition cursor-pointer"
                  >
                    {aiFillingForm ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {aiFillingForm ? 'Mengisi...' : 'Isi Otomatis via DeepSeek AI'}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.nama_rawi}
                  onChange={(e) => setFormData({ ...formData, nama_rawi: e.target.value })}
                  placeholder="Contoh: Abu Hurairah RA"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Arab</label>
                <input
                  type="text"
                  dir="rtl"
                  value={formData.nama_arab}
                  onChange={(e) => setFormData({ ...formData, nama_arab: e.target.value })}
                  placeholder="أبو هريرة رضي الله عنه"
                  className="arabic-text w-full px-3 py-2 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={formData.kategori_rawi}
                    onChange={(e) => setFormData({ ...formData, kategori_rawi: e.target.value })}
                    className="w-full px-2.5 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="sahabat">Sahabat Nabi</option>
                    <option value="tabiin">Tabi&apos;in</option>
                    <option value="perawi">Perawi Sanad</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Thabaqat</label>
                  <input
                    type="text"
                    value={formData.thabaqat}
                    onChange={(e) => setFormData({ ...formData, thabaqat: e.target.value })}
                    placeholder="Sahabat / Tabi'in Kubra"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kredibilitas</label>
                  <input
                    type="text"
                    value={formData.kredibilitas}
                    onChange={(e) => setFormData({ ...formData, kredibilitas: e.target.value })}
                    placeholder="Shahabi / Thiqah"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Biografi Singkat</label>
                <textarea
                  rows={4}
                  value={formData.biografi}
                  onChange={(e) => setFormData({ ...formData, biografi: e.target.value })}
                  placeholder="Biografi singkat perawi, tahun wafat, dan peran periwayatan haditsnya..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingForm}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                {savingForm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {isEditMode ? 'Simpan Perubahan' : 'Simpan Perawi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
