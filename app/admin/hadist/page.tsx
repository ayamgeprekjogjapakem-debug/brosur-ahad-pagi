'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Search, BookOpen, Layers, ShieldCheck, ChevronLeft, ChevronRight,
  Filter, Check, Eye, X, ScrollText, ArrowUpRight, Loader2, Sparkles,
  Edit2, Save, History, User, Clock, CheckCircle2, ChevronDown
} from 'lucide-react';
import Link from 'next/link';

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

export default function AdminHadistBrosurPage() {
  const [hadistItems, setHadistItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [itemSearch, setItemSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSumberJenis, setFilterSumberJenis] = useState<'all' | 'hadist' | 'quran'>('all');
  const [filterRawiItem, setFilterRawiItem] = useState('all');
  const [filterTahun, setFilterTahun] = useState('all');
  const [filterBrosurId, setFilterBrosurId] = useState('all');

  // Master Options
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [brosurList, setBrosurList] = useState<{ id: string; judul: string; tahun: number }[]>([]);
  
  // Pagination & Modal
  const [currentPage, setCurrentPage] = useState(1);
  const [viewItem, setViewItem] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const itemsPerPage = 10;

  // Sidebar Audit Log States
  const [showLogSidebar, setShowLogSidebar] = useState(true);
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
          .select('id, judul, tahun')
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

  // Filtered brosur options based on selected year
  const filteredBrosurOptions = useMemo(() => {
    if (filterTahun === 'all') return brosurList;
    return brosurList.filter(b => b.tahun.toString() === filterTahun);
  }, [brosurList, filterTahun]);

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
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16 font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900 text-white px-4 py-3.5 rounded-2xl shadow-lg border border-zinc-800 animate-in slide-in-from-bottom-5 duration-200 max-w-md">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={16} />
          </div>
          <p className="text-xs font-semibold leading-snug">{toastMessage}</p>
        </div>
      )}

      {/* Header Clean Gemini */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Hadist Brosur (Editable & Audit Log)
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
              <ScrollText size={12} />
              <span>Tabel: hadist_brosur</span>
            </span>
          </div>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Data dalil hadist yang dikutip dalam edisi brosur. Dapat disunting langsung secara inline dan riwayat editor tercatat di log audit.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={() => setShowLogSidebar(prev => !prev)}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition border ${
              showLogSidebar 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/70' 
                : 'bg-white text-zinc-600 border-zinc-200/70 hover:bg-zinc-50'
            }`}
          >
            <History size={14} className={showLogSidebar ? 'text-emerald-600' : ''} />
            <span>{showLogSidebar ? 'Sembunyikan Log' : 'Buka Log Editor'} ({editLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Content (8 cols) + Audit Log Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Kolom Kiri: Tabel Hadist */}
        <div className={showLogSidebar ? 'lg:col-span-8 space-y-4' : 'lg:col-span-12 space-y-4'}>
          
          {/* Filter Bar Flat Clean */}
          <div className="space-y-2.5 bg-[#FAFAFA] p-2.5 sm:p-3 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Cari matan Arab, terjemahan, atau perawi..."
                  className="w-full bg-white rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={filterRawiItem}
                  onChange={(e) => { setFilterRawiItem(e.target.value); setCurrentPage(1); }}
                  className="bg-white rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-700 outline-none w-full sm:w-auto"
                >
                  <option value="all">Semua Perawi</option>
                  {rawiList.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filter Dropdown Baris 2: Tahun & Brosur Spesifik */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1 border-t border-zinc-200/50">
              
              {/* Filter Tahun */}
              <div className="sm:col-span-4">
                <select
                  value={filterTahun}
                  onChange={(e) => {
                    const newYear = e.target.value;
                    setFilterTahun(newYear);
                    setFilterBrosurId('all'); // Reset filter brosur jika tahun berganti
                    setCurrentPage(1);
                  }}
                  className="bg-white rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 outline-none w-full"
                >
                  <option value="all">Semua Tahun Brosur ({availableYears.length})</option>
                  {availableYears.map(year => (
                    <option key={year} value={year.toString()}>Tahun {year}</option>
                  ))}
                </select>
              </div>

              {/* Filter Brosur Spesifik */}
              <div className="sm:col-span-8">
                <select
                  value={filterBrosurId}
                  onChange={(e) => { setFilterBrosurId(e.target.value); setCurrentPage(1); }}
                  className="bg-white rounded-xl px-3 py-2 text-xs font-medium text-zinc-700 outline-none w-full truncate"
                >
                  <option value="all">
                    {filterTahun !== 'all' 
                      ? `Semua Judul Brosur di Tahun ${filterTahun} (${filteredBrosurOptions.length})` 
                      : `Semua Judul Brosur (${brosurList.length})`}
                  </option>
                  {filteredBrosurOptions.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.tahun ? `[${b.tahun}] ` : ''}{b.judul}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

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
                      {/* Tombol Edit */}
                      <button
                        onClick={() => openEditModal(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-600 hover:text-emerald-700 hover:bg-white transition"
                        title="Sunting Hadist Ini"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>

                      {/* Tombol Lihat Detail */}
                      <button
                        onClick={() => setViewItem(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-700 hover:bg-white transition"
                        title="Lihat Pratinjau Lengkap"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Matan Arab */}
                  {item.kutipan_arab && (
                    <div className="text-right text-base sm:text-lg font-serif text-zinc-800 leading-loose" dir="rtl">
                      {item.kutipan_arab}
                    </div>
                  )}

                  {/* Terjemahan */}
                  {item.terjemahan && (
                    <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2 italic">
                      "{item.terjemahan}"
                    </p>
                  )}

                  {/* Footer Sumber */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-200/50">
                    <span>{item.perawi_sumber || 'Riwayat Kitab Hadist'}</span>
                    <span className="font-mono text-[10px]">ID: {item.id.slice(0, 8)}</span>
                  </div>
                </div>
              ))}

              {/* Pagination */}
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

        {/* Kolom Kanan: Sidebar Log Siapa Yang Edit (Clean Audit Trail) */}
        {showLogSidebar && (
          <div className="lg:col-span-4 p-4 sm:p-5 rounded-2xl bg-[#FAFAFA] border border-zinc-100 space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-zinc-200/60 pb-3">
              <div className="flex items-center gap-2">
                <History size={16} className="text-emerald-600" />
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                  Log Editor Hadist
                </h3>
              </div>
              <button
                onClick={fetchLogs}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-white transition"
                title="Segarkan Log"
              >
                <Clock size={13} />
              </button>
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Catatan riwayat audit siapa saja admin yang melakukan perubahan data hadist brosur.
            </p>

            {loadingLogs ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin text-emerald-600" />
                <span className="text-[11px] text-zinc-400">Memuat log audit...</span>
              </div>
            ) : editLogs.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400 italic bg-white rounded-xl p-4">
                Belum ada log penyuntingan tercatat.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                {editLogs.map((log) => {
                  const date = new Date(log.created_at);
                  const dateFormatted = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                  const timeFormatted = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-white border border-zinc-200/60 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {log.editor_name?.charAt(0).toUpperCase() || 'A'}
                          </div>
                          <span className="text-xs font-bold text-zinc-900 truncate">
                            {log.editor_name}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 shrink-0 font-medium">
                          {dateFormatted}, {timeFormatted}
                        </span>
                      </div>

                      <p className="text-[11px] text-zinc-600 leading-snug line-clamp-2">
                        {log.field_changes}
                      </p>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-100">
                        <span className="font-semibold text-emerald-700 truncate max-w-[140px]">
                          {log.hadist_title}
                        </span>
                        <span className="truncate max-w-[100px]">{log.editor_email}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal Edit Hadist Inline */}
      {editingItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => !savingEdit && setEditingItem(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 size={16} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-zinc-900">
                  Sunting Data Hadist Brosur
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                disabled={savingEdit}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded-xl hover:bg-zinc-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              
              {/* Matan Arab Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 block">
                  Matan Teks Arab
                </label>
                <textarea
                  required
                  rows={4}
                  value={formArab}
                  onChange={(e) => setFormArab(e.target.value)}
                  dir="rtl"
                  className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl p-3.5 text-right font-serif text-lg text-zinc-900 outline-none focus:bg-white focus:border-emerald-500 transition leading-loose"
                />
              </div>

              {/* Terjemahan */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 block">
                  Terjemahan Bahasa Indonesia
                </label>
                <textarea
                  rows={4}
                  value={formTerjemahan}
                  onChange={(e) => setFormTerjemahan(e.target.value)}
                  className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl p-3.5 text-xs text-zinc-900 outline-none focus:bg-white focus:border-emerald-500 transition leading-relaxed"
                />
              </div>

              {/* Row Grid: Perawi Kitab, No Hadist, Sumber */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700">Perawi Kitab</label>
                  <input
                    type="text"
                    value={formRawiKitab}
                    onChange={(e) => setFormRawiKitab(e.target.value)}
                    placeholder="Bukhari / Muslim / dll"
                    className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700">Nomor Hadist</label>
                  <input
                    type="text"
                    value={formNoHadist}
                    onChange={(e) => setFormNoHadist(e.target.value)}
                    placeholder="Contoh: 1, 70"
                    className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700">Status Hadist</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-500"
                  >
                    <option value="terverifikasi">Terverifikasi</option>
                    <option value="mentah">Mentah</option>
                  </select>
                </div>
              </div>

              {/* Row Grid: Takhrij Sumber, Juz, Halaman */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[11px] font-semibold text-zinc-700">Teks Sumber / Sanad</label>
                  <input
                    type="text"
                    value={formPerawiSumber}
                    onChange={(e) => setFormPerawiSumber(e.target.value)}
                    placeholder="HR. Bukhari No. 1"
                    className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700">Juz</label>
                  <input
                    type="text"
                    value={formJuz}
                    onChange={(e) => setFormJuz(e.target.value)}
                    placeholder="Juz 1"
                    className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700">Halaman</label>
                  <input
                    type="text"
                    value={formHalaman}
                    onChange={(e) => setFormHalaman(e.target.value)}
                    placeholder="Hal 12"
                    className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm"
                >
                  {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span>Simpan Perubahan & Catat Log</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Pratinjau */}
      {viewItem && (
        <div 
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setViewItem(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                  {viewItem.rawi_kitab || 'Hadist'} {viewItem.no_hadist ? `No. ${viewItem.no_hadist}` : ''}
                </span>
                <h3 className="text-sm font-bold text-zinc-900 mt-1">
                  {viewItem.brosur?.judul ? `Kutipan dari Brosur: ${viewItem.brosur.judul}` : 'Detail Hadist'}
                </h3>
              </div>
              <button
                onClick={() => setViewItem(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded-xl hover:bg-zinc-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            {viewItem.kutipan_arab && (
              <div className="p-4 rounded-2xl bg-[#FAFAFA] text-right font-serif text-xl sm:text-2xl text-zinc-900 leading-loose" dir="rtl">
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
