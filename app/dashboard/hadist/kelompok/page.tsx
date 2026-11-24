'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Tags, Plus, Search, Eye, Edit3, Trash2, ChevronLeft, ChevronRight,
  Sparkles, RefreshCw, Loader2, X, CheckCircle, BookOpen, Layers, FileText, Wand2
} from 'lucide-react';

interface KelompokItem {
  id: string;
  nama_kelompok: string;
  deskripsi?: string | null;
  warna_badge?: string | null;
  stats?: {
    totalHadist: number;
    totalBrosur: number;
  };
}

interface GlobalStats {
  totalKelompok: number;
  totalHadist: number;
  categorizedCount: number;
  uncategorizedCount: number;
  totalBrosur: number;
}

const BADGE_COLORS = [
  { key: 'emerald', label: 'Emerald', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { key: 'blue', label: 'Biru', cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { key: 'amber', label: 'Amber', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { key: 'purple', label: 'Ungu', cls: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  { key: 'rose', label: 'Merah', cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  { key: 'indigo', label: 'Indigo', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  { key: 'teal', label: 'Teal', cls: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
  { key: 'slate', label: 'Netral', cls: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-500' },
];

const EMPTY_FORM = {
  id: '',
  nama_kelompok: '',
  deskripsi: '',
  warna_badge: 'emerald',
};

export default function TemaKelompokPage() {
  const [kelompokList, setKelompokList] = useState<KelompokItem[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    totalKelompok: 0,
    totalHadist: 0,
    categorizedCount: 0,
    uncategorizedCount: 0,
    totalBrosur: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Action loading states
  const [seeding, setSeeding] = useState(false);
  const [classifying, setClassifying] = useState(false);

  // Add / Edit Modal
  const [showFormModal, setShowFormModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [savingForm, setSavingForm] = useState(false);

  // Detail Modal (Daftar Hadits dalam Tema)
  const [detailTheme, setDetailTheme] = useState<KelompokItem | null>(null);
  const [themeHadists, setThemeHadists] = useState<any[]>([]);
  const [loadingThemeHadists, setLoadingThemeHadists] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage]);

  useEffect(() => {
    fetchKelompok();
  }, []);

  const fetchKelompok = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hadist/kelompok', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) {
        setKelompokList(data.kelompok || []);
        if (data.globalStats) setGlobalStats(data.globalStats);
      }
    } catch (e) {
      console.error('Error fetching kelompok:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm('Tambahkan 12 tema standar Islami (Aqidah, Thaharah, Shalat, Puasa, Zakat, Haji, Akhlak, dll)? Tema yang sudah ada tidak akan diduplikasi.')) {
      return;
    }
    try {
      setSeeding(true);
      const res = await fetch('/api/hadist/kelompok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_defaults' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Gagal menambah tema standar: ' + (data.error || 'Server error'));
      } else {
        alert(data.message || 'Tema standar berhasil ditambahkan.');
        fetchKelompok();
      }
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    } finally {
      setSeeding(false);
    }
  };

  const handleAutoClassify = async () => {
    if (kelompokList.length === 0) {
      alert('Buat tema atau klik "Seed Tema Standar" terlebih dahulu sebelum mengelompokkan otomatis.');
      return;
    }
    if (!window.confirm(`Kelompokkan otomatis ${globalStats.uncategorizedCount} dalil yang belum memiliki tema berdasarkan judul brosur & terjemahan?`)) {
      return;
    }
    try {
      setClassifying(true);
      const res = await fetch('/api/hadist/kelompok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_classify' }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Gagal mengelompokkan: ' + (data.error || 'Server error'));
      } else {
        alert(data.message || 'Klasifikasi otomatis selesai.');
        fetchKelompok();
      }
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    } finally {
      setClassifying(false);
    }
  };

  const handleResetAllKelompok = async () => {
    const confirmMsg = 'PERINGATAN!\n\nApakah Anda YAKIN ingin menghapus SELURUH data Kelompok/Tema dari database?\n\nSemua tema akan terhapus (dalil tetap aman, hanya label temanya dilepas).';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/hadist/kelompok/reset', { method: 'DELETE' });
      if (res.ok) {
        alert('Seluruh data Kelompok/Tema berhasil dikosongkan.');
        fetchKelompok();
      } else {
        const data = await res.json();
        alert(`Gagal reset data: ${data.error}`);
      }
    } catch (e) {
      console.error('Error reset kelompok:', e);
    }
  };

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormData(EMPTY_FORM);
    setShowFormModal(true);
  };

  const handleOpenEdit = (k: KelompokItem) => {
    setIsEditMode(true);
    setFormData({
      id: k.id,
      nama_kelompok: k.nama_kelompok || '',
      deskripsi: k.deskripsi || '',
      warna_badge: k.warna_badge || 'emerald',
    });
    setShowFormModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama_kelompok.trim()) {
      alert('Nama tema wajib diisi.');
      return;
    }
    try {
      setSavingForm(true);
      const res = await fetch('/api/hadist/kelompok', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Gagal menyimpan tema: ' + (data.error || 'Server error'));
      } else {
        setShowFormModal(false);
        fetchKelompok();
      }
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    } finally {
      setSavingForm(false);
    }
  };

  const handleDeleteOne = async (k: KelompokItem) => {
    if (!window.confirm(`Hapus tema "${k.nama_kelompok}"? Dalil yang terhubung tidak akan terhapus.`)) return;
    try {
      const res = await fetch(`/api/hadist/kelompok?id=${encodeURIComponent(k.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert('Gagal menghapus: ' + (data.error || 'Server error'));
      } else {
        setKelompokList(prev => prev.filter(item => item.id !== k.id));
        if (detailTheme?.id === k.id) setDetailTheme(null);
      }
    } catch (e: any) {
      alert('Error: ' + (e.message || e));
    }
  };

  const handleOpenDetail = async (k: KelompokItem) => {
    setDetailTheme(k);
    setThemeHadists([]);
    setLoadingThemeHadists(true);
    try {
      const res = await fetch(`/api/hadist/items?kelompok_id=${encodeURIComponent(k.id)}`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.items)) {
        setThemeHadists(data.items);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingThemeHadists(false);
    }
  };

  const getBadgeColors = (colorStr?: string | null) => {
    const found = BADGE_COLORS.find(c => c.key === colorStr);
    return found ? found.cls : 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const filteredKelompok = useMemo(() => {
    if (!searchQuery.trim()) return kelompokList;
    const lowerQ = searchQuery.toLowerCase();
    return kelompokList.filter(k =>
      k.nama_kelompok?.toLowerCase().includes(lowerQ) ||
      k.deskripsi?.toLowerCase().includes(lowerQ)
    );
  }, [kelompokList, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredKelompok.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedKelompok = filteredKelompok.slice(startIndex, startIndex + itemsPerPage);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Amiri:wght@400;700&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .arabic-text { font-family: 'Amiri', serif; direction: rtl; }
      `}} />

      <div className="p-4 sm:p-6 space-y-5 font-jakarta text-slate-800 bg-slate-50/70 min-h-full">

        {/* Header + Aksi */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-amber-600 text-xs font-bold mb-1">
                <Tags className="w-3.5 h-3.5" />
                <span>Manajemen Label &amp; Kategori Tematik</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Kelompok / Tema Dalil
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola kategori tematik hadits &amp; ayat Al-Qur&apos;an, dan kelompokkan dalil secara otomatis.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSeedDefaults}
                disabled={seeding || classifying}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-xl transition cursor-pointer"
              >
                {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                Seed Tema Standar
              </button>

              <button
                type="button"
                onClick={handleAutoClassify}
                disabled={classifying || seeding || globalStats.uncategorizedCount === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 rounded-xl transition cursor-pointer"
              >
                {classifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                Kelompokkan Otomatis ({globalStats.uncategorizedCount})
              </button>

              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Buat Tema Baru
              </button>

              <button
                type="button"
                onClick={handleResetAllKelompok}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                title="Hapus semua tema"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          </div>

          {/* 4 Kartu Statistik */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border bg-slate-50/70 border-slate-200/80 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-slate-500">Total Tema</p>
                <p className="text-2xl font-black text-slate-900 mt-0.5">{loading ? '—' : globalStats.totalKelompok}</p>
              </div>
              <Tags className="w-6 h-6 text-amber-500" />
            </div>

            <div className="p-3.5 rounded-xl border bg-emerald-50/60 border-emerald-200/70 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-emerald-700">Dalil Terkelompok</p>
                <p className="text-2xl font-black text-emerald-900 mt-0.5">{loading ? '—' : globalStats.categorizedCount}</p>
              </div>
              <Layers className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="p-3.5 rounded-xl border bg-amber-50/60 border-amber-200/70 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-amber-700">Belum Bertema</p>
                <p className="text-2xl font-black text-amber-900 mt-0.5">{loading ? '—' : globalStats.uncategorizedCount}</p>
              </div>
              <FileText className="w-6 h-6 text-amber-600" />
            </div>

            <div className="p-3.5 rounded-xl border bg-blue-50/60 border-blue-200/70 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-blue-700">Brosur Terkait</p>
                <p className="text-2xl font-black text-blue-900 mt-0.5">{loading ? '—' : globalStats.totalBrosur}</p>
              </div>
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* TABEL TEMA / KELOMPOK */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <input
                type="text"
                placeholder="Cari nama tema atau deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs py-2 pl-8 pr-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <button
              type="button"
              onClick={fetchKelompok}
              disabled={loading}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer w-fit"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 pl-4 pr-2 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Nama Kelompok / Tema</th>
                  <th className="py-3.5 px-4">Deskripsi</th>
                  <th className="py-3.5 px-4 text-center w-44">Preview Label</th>
                  <th className="py-3.5 px-4 text-center w-32">Dalil / Brosur</th>
                  <th className="py-3.5 pl-3 pr-4 text-right w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-medium">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                      Memuat daftar kelompok...
                    </td>
                  </tr>
                ) : paginatedKelompok.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Belum ada tema ditemukan. Klik <strong>Seed Tema Standar</strong> atau <strong>Buat Tema Baru</strong>.
                    </td>
                  </tr>
                ) : (
                  paginatedKelompok.map((k, idx) => (
                    <tr key={k.id} className="hover:bg-slate-50/70 transition-colors align-middle">
                      <td className="py-3.5 pl-4 pr-2 text-center font-mono text-[11px] text-slate-400">
                        {startIndex + idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {k.nama_kelompok}
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <p className="text-slate-500 line-clamp-2">{k.deskripsi || '-'}</p>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full font-bold text-[11px] border ${getBadgeColors(k.warna_badge)}`}>
                          {k.nama_kelompok}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(k)}
                          className="inline-flex flex-col items-center px-2.5 py-1 rounded-lg bg-blue-50/70 hover:bg-blue-100 border border-blue-200/70 transition cursor-pointer"
                          title="Lihat daftar dalil pada tema ini"
                        >
                          <span className="font-extrabold text-blue-800">{k.stats?.totalHadist || 0} dalil</span>
                          <span className="text-[10px] text-blue-600">{k.stats?.totalBrosur || 0} brosur</span>
                        </button>
                      </td>
                      <td className="py-3.5 pl-3 pr-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(k)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Lihat Dalil Terkait"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(k)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title="Edit Tema"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOne(k)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Hapus Tema"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3.5 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-3">
              <span>
                Menampilkan{' '}
                <strong className="text-slate-700">
                  {filteredKelompok.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredKelompok.length)}
                </strong>{' '}
                dari <strong className="text-slate-700">{filteredKelompok.length}</strong> tema
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                <option value={10}>10 / hal</option>
                <option value={15}>15 / hal</option>
                <option value={25}>25 / hal</option>
                <option value={50}>50 / hal</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 font-semibold cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <span className="px-3 py-1.5 font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 font-semibold cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL TAMBAH / EDIT TEMA                                  */}
      {/* ========================================================= */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 font-jakarta">
          <form
            onSubmit={handleSubmitForm}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">
                {isEditMode ? 'Edit Kelompok / Tema' : 'Buat Tema Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Kelompok / Tema *</label>
                <input
                  type="text"
                  required
                  value={formData.nama_kelompok}
                  onChange={(e) => setFormData({ ...formData, nama_kelompok: e.target.value })}
                  placeholder="Contoh: Shalat, Thaharah & Wudhu, Puasa Ramadhan"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={3}
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Penjelasan cakupan dalil dalam tema ini..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-2">Warna Badge</label>
                <div className="grid grid-cols-4 gap-2">
                  {BADGE_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c.key}
                      onClick={() => setFormData({ ...formData, warna_badge: c.key })}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                        formData.warna_badge === c.key
                          ? 'ring-2 ring-amber-500 border-amber-400 bg-amber-50/40'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.dot}`} />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-semibold">Preview Label:</span>
                <span className={`px-3 py-1 rounded-full font-bold text-xs border ${getBadgeColors(formData.warna_badge)}`}>
                  {formData.nama_kelompok || 'Nama Tema'}
                </span>
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
                className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                {savingForm ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {isEditMode ? 'Simpan Perubahan' : 'Buat Tema'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DETAIL DALIL DALAM TEMA                             */}
      {/* ========================================================= */}
      {detailTheme && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 font-jakarta">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between gap-4">
              <div>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getBadgeColors(detailTheme.warna_badge)}`}>
                  {detailTheme.nama_kelompok}
                </span>
                <p className="text-xs text-slate-500 mt-1.5">{detailTheme.deskripsi || 'Daftar dalil dalam tema ini.'}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailTheme(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Dalil Terhubung ({themeHadists.length})
              </p>

              {loadingThemeHadists ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
                  Memuat dalil...
                </div>
              ) : themeHadists.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                  Belum ada dalil di tema ini. Klik <strong>Kelompokkan Otomatis</strong> di halaman utama untuk mengisi otomatis.
                </div>
              ) : (
                themeHadists.slice(0, 30).map((h, i) => (
                  <div key={h.id || i} className="p-3.5 rounded-xl border border-slate-200/80 bg-white space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {h.perawi_sumber || h.rawi_kitab || 'Dalil'}
                      </span>
                      {h.brosur && (
                        <Link
                          href={`/bap/${h.brosur.tahun || 2026}/${encodeURIComponent(h.brosur.slug || h.brosur_id)}`}
                          className="text-emerald-600 hover:underline font-semibold truncate max-w-[260px]"
                        >
                          {h.brosur.judul}
                        </Link>
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
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const target = detailTheme;
                  setDetailTheme(null);
                  handleOpenEdit(target);
                }}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Tema
              </button>
              <button
                type="button"
                onClick={() => setDetailTheme(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
