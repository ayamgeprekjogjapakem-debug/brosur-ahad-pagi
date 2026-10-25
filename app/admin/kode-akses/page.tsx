'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  KeyRound, Plus, Trash2, CheckCircle2, XCircle, Loader2, 
  Copy, Edit2, X, Search, RefreshCw, Sparkles, Check, 
  BookOpen, ScrollText, Calendar, Library, Bot, Bookmark,
  ChevronLeft, ChevronRight, Layers, ShieldCheck
} from 'lucide-react';

interface AccessCode {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
  notes?: string | null;
  description?: string | null;
  allowed_features?: string[];
  has_ai_access?: boolean;
}

const AVAILABLE_FEATURES = [
  { id: 'bap', label: 'Brosur (BAP)', icon: BookOpen, default: true, description: 'Kajian & edisi brosur dakwah' },
  { id: 'quran', label: "Al-Qur'an Digital", icon: BookOpen, default: true, description: 'Teks ayat dan terjemahan' },
  { id: 'kalender', label: 'Kalender Hijriah', icon: Calendar, default: true, description: 'Kalender dan jadwal kajian' },
  { id: 'tersimpan', label: 'Dalil Tersimpan', icon: Bookmark, default: true, description: 'Bookmark dalil & hadits' },
  { id: 'hadist', label: 'Pustaka Hadist', icon: ScrollText, default: false, description: 'Akses hadits sumber brosur' },
  { id: 'perawi', label: 'Master Perawi', icon: Library, default: false, description: 'Sanad & biografi 9 imam' },
  { id: 'ai-pustaka', label: 'AI Pustaka', icon: Bot, default: false, description: 'Pencarian dalil cerdas AI' },
];

export default function AdminKodeAksesPage() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal Create State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(
    AVAILABLE_FEATURES.filter((f) => f.default).map((f) => f.id)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Edit State
  const [editingCode, setEditingCode] = useState<AccessCode | null>(null);
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const supabase = createClient();

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCodes(data);
      }
    } catch (err) {
      console.error('Error fetching access codes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Generator kode unik otomatis
  const handleRandomizeCode = () => {
    const random = 'MTA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setCustomCode(random);
  };

  const handleOpenCreateModal = () => {
    handleRandomizeCode();
    setNewNotes('');
    setSelectedFeatures(AVAILABLE_FEATURES.filter((f) => f.default).map((f) => f.id));
    setIsCreateOpen(true);
  };

  const toggleCreateFeature = (id: string) => {
    if (selectedFeatures.includes(id)) {
      setSelectedFeatures((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedFeatures((prev) => [...prev, id]);
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCode = (customCode || 'MTA-' + Math.random().toString(36).substring(2, 8)).trim().toUpperCase();

    setIsSubmitting(true);
    try {
      const payload: any = {
        code: finalCode,
        is_active: true,
        notes: newNotes.trim() || 'Reguler Akses',
        description: newNotes.trim() || 'Reguler Akses',
        allowed_features: selectedFeatures,
        has_ai_access: selectedFeatures.includes('ai-pustaka'),
      };

      const { data, error } = await supabase
        .from('access_codes')
        .insert([payload])
        .select();

      if (!error && data && data.length > 0) {
        setCodes((prev) => [data[0], ...prev]);
        setIsCreateOpen(false);
      } else {
        // Fallback jika skema belum ada allowed_features
        const fallbackPayload: any = {
          code: finalCode,
          is_active: true,
          description: newNotes.trim() || 'Reguler Akses',
          has_ai_access: selectedFeatures.includes('ai-pustaka'),
        };
        const fallbackRes = await supabase.from('access_codes').insert([fallbackPayload]).select();
        if (!fallbackRes.error && fallbackRes.data) {
          setCodes((prev) => [fallbackRes.data[0], ...prev]);
          setIsCreateOpen(false);
        } else {
          alert('Gagal membuat kode: ' + (error?.message || fallbackRes.error?.message));
        }
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('access_codes')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (!error) {
        setCodes((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_active: !currentStatus } : c))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCode = async (id: string, codeString: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kode akses "${codeString}"?`)) return;
    try {
      const { error } = await supabase
        .from('access_codes')
        .delete()
        .eq('id', id);

      if (!error) {
        setCodes((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleOpenEdit = (code: AccessCode) => {
    setEditingCode(code);
    setEditNotes(code.notes || code.description || '');
    setEditFeatures(
      code.allowed_features && code.allowed_features.length > 0
        ? code.allowed_features
        : AVAILABLE_FEATURES.filter((f) => f.default).map((f) => f.id)
    );
  };

  const toggleEditFeature = (id: string) => {
    if (editFeatures.includes(id)) {
      setEditFeatures((prev) => prev.filter((item) => item !== id));
    } else {
      setEditFeatures((prev) => [...prev, id]);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCode) return;

    setIsSavingEdit(true);
    try {
      const payload: any = {
        notes: editNotes.trim() || null,
        description: editNotes.trim() || null,
        allowed_features: editFeatures,
        has_ai_access: editFeatures.includes('ai-pustaka'),
      };

      const { error } = await supabase
        .from('access_codes')
        .update(payload)
        .eq('id', editingCode.id);

      if (!error) {
        setCodes((prev) =>
          prev.map((c) =>
            c.id === editingCode.id
              ? {
                  ...c,
                  notes: editNotes,
                  description: editNotes,
                  allowed_features: editFeatures,
                  has_ai_access: editFeatures.includes('ai-pustaka'),
                }
              : c
          )
        );
        setEditingCode(null);
      } else {
        alert('Gagal menyimpan: ' + error.message);
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filter Data
  const filteredCodes = codes.filter((c) => {
    const query = searchQuery.toLowerCase();
    const codeMatch = c.code.toLowerCase().includes(query);
    const noteMatch =
      (c.notes && c.notes.toLowerCase().includes(query)) ||
      (c.description && c.description.toLowerCase().includes(query));
    const matchesSearch = codeMatch || noteMatch;

    if (statusFilter === 'active') return matchesSearch && c.is_active;
    if (statusFilter === 'inactive') return matchesSearch && !c.is_active;
    return matchesSearch;
  });

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredCodes.length / itemsPerPage));
  const paginatedCodes = filteredCodes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeCount = codes.filter((c) => c.is_active).length;
  const inactiveCount = codes.filter((c) => !c.is_active).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200 pb-16">
      {/* 1. Header Konsol Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-100">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
            <KeyRound size={12} className="text-emerald-600" />
            <span>Manajemen Akses Aplikasi</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
            Pembuatan & Kelola Kode Akses
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 max-w-2xl leading-relaxed">
            Generate kode akses eksklusif untuk jamaah, santri, atau pengurus guna membuka fitur aplikasi mobile dan web.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs sm:text-sm shadow-xs transition shrink-0"
        >
          <Plus size={16} />
          <span>Buat Kode Akses Baru</span>
        </button>
      </div>

      {/* 2. Ringkasan Metrik / Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-zinc-500">Total Kode Dibuat</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-zinc-900">{codes.length}</span>
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-600">
              <KeyRound size={16} />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-zinc-500">Kode Aktif (Siap Pakai)</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-emerald-600">{activeCount}</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-1">
          <span className="text-[11px] font-medium text-zinc-500">Kode Dinonaktifkan</span>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-zinc-500">{inactiveCount}</span>
            <div className="p-2 rounded-xl bg-zinc-100 text-zinc-400">
              <XCircle size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Toolbar & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-zinc-200/80 rounded-2xl shadow-2xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Semua Status' },
            { id: 'active', label: 'Aktif' },
            { id: 'inactive', label: 'Nonaktif' },
          ].map((tab) => {
            const isSelected = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  isSelected
                    ? 'bg-zinc-900 text-white font-semibold'
                    : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kode atau nama pemegang..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 4. Tabel Kode Akses */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <RefreshCw size={24} className="animate-spin text-emerald-600" />
            <span className="text-xs font-medium">Memuat daftar kode akses...</span>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
              <KeyRound size={22} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800">Tidak Ada Kode Akses Ditemukan</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              {searchQuery
                ? 'Tidak ada kode akses yang sesuai dengan kata kunci pencarian Anda.'
                : 'Belum ada kode akses yang dibuat. Klik tombol "Buat Kode Akses Baru" di atas untuk memulai.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Kode Akses</th>
                  <th className="px-5 py-3.5">Catatan / Pemegang</th>
                  <th className="px-5 py-3.5">Hak Akses Fitur</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {paginatedCodes.map((c) => {
                  const features = c.allowed_features || [];
                  const isFull = features.length >= AVAILABLE_FEATURES.length;
                  const isCopied = copiedId === c.id;

                  return (
                    <tr key={c.id} className="hover:bg-zinc-50/60 transition-colors">
                      {/* Kolom Kode */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 select-all tracking-wider">
                            {c.code}
                          </span>
                          <button
                            onClick={() => handleCopyCode(c.id, c.code)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
                            title="Salin Kode"
                          >
                            {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          </button>
                          {isCopied && (
                            <span className="text-[10px] font-semibold text-emerald-600 animate-in fade-in">
                              Tersalin!
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 block mt-1">
                          Dibuat: {new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>

                      {/* Kolom Catatan */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-zinc-800 text-xs">
                          {c.notes || c.description || 'Reguler Akses'}
                        </p>
                      </td>

                      {/* Kolom Fitur */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {features.length === 0 ? (
                            <span className="text-[11px] text-zinc-400 italic">Standar</span>
                          ) : isFull ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                              Full Akses (Semua Fitur)
                            </span>
                          ) : (
                            features.map((fId) => {
                              const featureObj = AVAILABLE_FEATURES.find((f) => f.id === fId);
                              return (
                                <span
                                  key={fId}
                                  className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[10px] font-medium border border-zinc-200/60 whitespace-nowrap"
                                >
                                  {featureObj?.label || fId}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      {/* Kolom Status */}
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(c.id, c.is_active)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition border ${
                            c.is_active
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                          <span>{c.is_active ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </td>

                      {/* Kolom Aksi */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Edit Hak Akses & Catatan"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCode(c.id, c.code)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-600 hover:bg-red-50 transition"
                            title="Hapus Kode"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Kontrol Paginasi */}
        {filteredCodes.length > 0 && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-zinc-200/80 text-xs">
            <div className="text-zinc-500 text-center sm:text-left">
              Menampilkan{' '}
              <span className="font-semibold text-zinc-800">
                {(currentPage - 1) * itemsPerPage + 1}
              </span>{' '}
              –{' '}
              <span className="font-semibold text-zinc-800">
                {Math.min(currentPage * itemsPerPage, filteredCodes.length)}
              </span>{' '}
              dari <span className="font-semibold text-zinc-800">{filteredCodes.length}</span> kode
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium shadow-2xs text-xs"
              >
                <ChevronLeft size={13} />
                <span>Sebelumnya</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((pageNum, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={pageNum}>
                        {prev && pageNum - prev > 1 && (
                          <span className="px-1 text-zinc-400">...</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold transition ${
                            currentPage === pageNum
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium shadow-2xs text-xs"
              >
                <span>Berikutnya</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Modal Buat Kode Baru */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-zinc-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Buat Kode Akses Baru</h3>
                  <p className="text-[11px] text-zinc-400">Tentukan kode, nama pemegang, dan hak akses fitur</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateCode} className="space-y-4 text-xs">
              {/* Input Kode */}
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Kode Akses Unik
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    placeholder="MTA-XXXXXX"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] font-mono font-bold text-emerald-800 text-sm tracking-wider uppercase focus:bg-white focus:outline-none focus:border-emerald-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleRandomizeCode}
                    className="px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold transition shrink-0 flex items-center gap-1.5"
                    title="Buat kode acak baru"
                  >
                    <Sparkles size={13} className="text-emerald-600" />
                    <span>Acak</span>
                  </button>
                </div>
              </div>

              {/* Catatan / Nama Grup */}
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Catatan / Nama Pemegang / Grup
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Contoh: Jamaah Cabang Sleman, Pengurus Ahad Pagi, Uji Coba"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Pilihan Hak Akses Fitur */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-zinc-700">
                    Pilih Hak Akses Fitur yang Diizinkan
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedFeatures.length === AVAILABLE_FEATURES.length) {
                        setSelectedFeatures([]);
                      } else {
                        setSelectedFeatures(AVAILABLE_FEATURES.map((f) => f.id));
                      }
                    }}
                    className="text-[11px] text-emerald-600 font-semibold hover:underline"
                  >
                    {selectedFeatures.length === AVAILABLE_FEATURES.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 max-h-56 overflow-y-auto">
                  {AVAILABLE_FEATURES.map((feature) => {
                    const isChecked = selectedFeatures.includes(feature.id);
                    const FeatureIcon = feature.icon;

                    return (
                      <label
                        key={feature.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition ${
                          isChecked ? 'bg-white border border-emerald-200 shadow-2xs' : 'hover:bg-zinc-100/70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCreateFeature(feature.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <FeatureIcon size={12} className={isChecked ? 'text-emerald-600' : 'text-zinc-400'} />
                            <span className="font-semibold text-zinc-800 text-xs">{feature.label}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400">{feature.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Membuat...</span>
                    </>
                  ) : (
                    <span>Buat Kode Akses</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal Edit Hak Akses & Catatan */}
      {editingCode && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-zinc-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900">Edit Hak Akses Kode</h3>
                  <p className="font-mono text-emerald-700 font-bold text-xs">{editingCode.code}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCode(null)}
                className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Catatan / Nama Pemegang
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-zinc-700">
                    Hak Akses Fitur
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (editFeatures.length === AVAILABLE_FEATURES.length) {
                        setEditFeatures([]);
                      } else {
                        setEditFeatures(AVAILABLE_FEATURES.map((f) => f.id));
                      }
                    }}
                    className="text-[11px] text-emerald-600 font-semibold hover:underline"
                  >
                    {editFeatures.length === AVAILABLE_FEATURES.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 max-h-56 overflow-y-auto">
                  {AVAILABLE_FEATURES.map((feature) => {
                    const isChecked = editFeatures.includes(feature.id);
                    const FeatureIcon = feature.icon;

                    return (
                      <label
                        key={feature.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition ${
                          isChecked ? 'bg-white border border-emerald-200 shadow-2xs' : 'hover:bg-zinc-100/70'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEditFeature(feature.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <FeatureIcon size={12} className={isChecked ? 'text-emerald-600' : 'text-zinc-400'} />
                            <span className="font-semibold text-zinc-800 text-xs">{feature.label}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400">{feature.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingCode(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
