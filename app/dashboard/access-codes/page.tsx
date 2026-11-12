'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Key, Plus, Trash2, CheckCircle2, XCircle, Loader2, Copy, Edit2, X, Save, Search, Clock, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AccessCode {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
  notes: string | null;
  allowed_features?: string[]; // Akan disimpan di DB sebagai jsonb array
  expires_in_seconds?: number | null; // Masa aktif cache dalam detik
  ai_daily_limit?: number | null; // Batas pertanyaan AI per hari (0/null = unlimited)
  ai_reset_hour?: number | null; // Jam reset (0-23, default 0 = 00:00 WIB)
}

const AVAILABLE_FEATURES = [
  { id: 'bap', label: 'Brosur (BAP)', default: true },
  { id: 'quran', label: 'Al-Qur\'an', default: true },
  { id: 'kalender', label: 'Kalender Hijriah', default: true },
  { id: 'tersimpan', label: 'Dalil Tersimpan', default: true },
  { id: 'hadist', label: 'Pustaka Hadist', default: false },
  { id: 'perawi', label: 'Master Perawi', default: false },
  { id: 'ai-pustaka', label: 'AI Pustaka', default: false },
];

export default function AccessCodesPage() {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [customCodeInput, setCustomCodeInput] = useState('');
  const [newCodeNotes, setNewCodeNotes] = useState('');
  const [selectedDurationPreset, setSelectedDurationPreset] = useState<number>(0); // 0 = permanen
  const [customDurationSeconds, setCustomDurationSeconds] = useState<string>('');
  const [newAiDailyLimit, setNewAiDailyLimit] = useState<number>(20); // 20 pertanyaan/hari (0 = unlimited)
  const [newAiResetHour, setNewAiResetHour] = useState<number>(0); // Jam 00:00 WIB
  
  // Modal Edit State
  const [editingCode, setEditingCode] = useState<AccessCode | null>(null);
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [editExpiresInSeconds, setEditExpiresInSeconds] = useState<number | null>(null);
  const [editCustomSeconds, setEditCustomSeconds] = useState<string>('');
  const [editAiDailyLimit, setEditAiDailyLimit] = useState<number>(20);
  const [editAiResetHour, setEditAiResetHour] = useState<number>(0);
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  const supabase = createClient();

  const formatDurationLabel = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) {
      return { main: 'Permanen', sub: 'Tanpa Kedaluwarsa', isPermanent: true };
    }
    if (seconds % 86400 === 0) {
      const days = seconds / 86400;
      return { main: `${days} Hari`, sub: `${seconds.toLocaleString('id-ID')} dtk`, isPermanent: false };
    }
    if (seconds % 3600 === 0) {
      const hours = seconds / 3600;
      return { main: `${hours} Jam`, sub: `${seconds.toLocaleString('id-ID')} dtk`, isPermanent: false };
    }
    return { main: `${seconds.toLocaleString('id-ID')} dtk`, sub: `${(seconds / 86400).toFixed(1)} Hari`, isPermanent: false };
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const fetchCodes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (!error && data) {
      setCodes(data);
    }
    setLoading(false);
  };

  const handleCreateCode = async () => {
    setGenerating(true);
    let finalCode = customCodeInput.trim().toUpperCase();
    if (!finalCode) {
      finalCode = 'MTA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    
    // Default features
    const defaultFeatures = AVAILABLE_FEATURES.filter(f => f.default).map(f => f.id);

    // Hitung masa berlaku dalam detik
    let finalSeconds: number | null = null;
    if (selectedDurationPreset === -1) {
      const parsed = parseInt(customDurationSeconds, 10);
      finalSeconds = !isNaN(parsed) && parsed > 0 ? parsed : null;
    } else if (selectedDurationPreset > 0) {
      finalSeconds = selectedDurationPreset;
    }

    const hasAiAccess = defaultFeatures.includes('ai-pustaka');
    const noteText = newCodeNotes.trim() || 'Reguler Akses';

    const fullPayload: any = { 
      code: finalCode, 
      is_active: true,
      notes: noteText,
      description: noteText,
      allowed_features: defaultFeatures,
      has_ai_access: hasAiAccess,
      expires_in_seconds: finalSeconds,
      ai_daily_limit: newAiDailyLimit,
      ai_reset_hour: newAiResetHour
    };

    const { data, error } = await supabase
      .from('access_codes')
      .insert([fullPayload])
      .select();

    if (!error && data) {
      setCodes([data[0], ...codes]);
      setCustomCodeInput('');
      setNewCodeNotes('');
      setCustomDurationSeconds('');
    } else {
      console.error('Error generating code:', error);

      // Cek duplicate key error
      if (error?.code === '23505' || error?.message?.toLowerCase().includes('duplicate') || error?.message?.toLowerCase().includes('unique')) {
        alert(`Kode akses "${finalCode}" sudah pernah terdaftar di database. Silakan gunakan kode lain.`);
        setGenerating(false);
        return;
      }

      // Fallback jika database belum memiliki kolom baru
      const fallbackPayload: any = {
        code: finalCode,
        is_active: true,
        description: noteText,
        has_ai_access: hasAiAccess,
      };
      if (noteText) fallbackPayload.notes = noteText;
      if (finalSeconds) fallbackPayload.expires_in_seconds = finalSeconds;
      if (newAiDailyLimit !== undefined) fallbackPayload.ai_daily_limit = newAiDailyLimit;
      if (newAiResetHour !== undefined) fallbackPayload.ai_reset_hour = newAiResetHour;

      const fallbackRes = await supabase.from('access_codes').insert([fallbackPayload]).select();
      if (!fallbackRes.error && fallbackRes.data) {
        setCodes([fallbackRes.data[0], ...codes]);
        setCustomCodeInput('');
        setNewCodeNotes('');
        setCustomDurationSeconds('');
        alert('Kode berhasil dibuat dengan fallback sederhana.');
      } else {
        alert(
          `Gagal membuat kode: ${error?.message || fallbackRes.error?.message || 'Database error'}.\n\n` +
          `Silakan buka Supabase SQL Editor dan jalankan skrip di file: scripts/add_expires_in_seconds_to_access_codes.sql`
        );
      }
    }
    setGenerating(false);
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('access_codes')
      .update({ is_active: !currentStatus })
      .eq('id', id);
      
    if (!error) {
      setCodes(codes.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
    }
  };

  const deleteCode = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kode ini?')) return;
    
    const { error } = await supabase
      .from('access_codes')
      .delete()
      .eq('id', id);
      
    if (!error) {
      setCodes(codes.filter(c => c.id !== id));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Kode disalin!');
  };

  const openEditModal = (code: AccessCode) => {
    setEditingCode(code);
    setEditFeatures(code.allowed_features || AVAILABLE_FEATURES.filter(f => f.default).map(f => f.id));
    setEditExpiresInSeconds(code.expires_in_seconds || null);
    setEditCustomSeconds(
      code.expires_in_seconds && ![0, 86400, 259200, 604800, 2592000].includes(code.expires_in_seconds)
        ? code.expires_in_seconds.toString()
        : ''
    );
    setEditAiDailyLimit(code.ai_daily_limit !== undefined && code.ai_daily_limit !== null ? code.ai_daily_limit : 20);
    setEditAiResetHour(code.ai_reset_hour !== undefined && code.ai_reset_hour !== null ? code.ai_reset_hour : 0);
  };

  const toggleFeature = (featureId: string) => {
    if (editFeatures.includes(featureId)) {
      setEditFeatures(editFeatures.filter(id => id !== featureId));
    } else {
      setEditFeatures([...editFeatures, featureId]);
    }
  };

  const saveEdit = async () => {
    if (!editingCode) return;
    setSavingEdit(true);

    const hasAiAccess = editFeatures.includes('ai-pustaka');
    const updatePayload: any = { 
      allowed_features: editFeatures,
      has_ai_access: hasAiAccess,
      expires_in_seconds: editExpiresInSeconds,
      ai_daily_limit: editAiDailyLimit,
      ai_reset_hour: editAiResetHour,
    };

    const { error } = await supabase
      .from('access_codes')
      .update(updatePayload)
      .eq('id', editingCode.id);

    if (!error) {
      setCodes(codes.map(c => c.id === editingCode.id ? { 
        ...c, 
        allowed_features: editFeatures,
        has_ai_access: hasAiAccess,
        expires_in_seconds: editExpiresInSeconds,
        ai_daily_limit: editAiDailyLimit,
        ai_reset_hour: editAiResetHour,
      } : c));
      setEditingCode(null);
    } else {
      alert('Gagal menyimpan pengaturan fitur, masa aktif, & kuota AI: ' + error.message);
    }
    setSavingEdit(false);
  };

  const filteredCodes = codes.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 flex items-center gap-3">
            <Key className="w-8 h-8 text-emerald-500" />
            Access Codes
          </h1>
          <p className="text-zinc-500 mt-1">Kelola kode akses, masa berlaku cache, dan izin fitur untuk setiap kode.</p>
        </div>
      </div>

      {/* Panel Buat / Input Kode Akses */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 mb-6">
        <h3 className="text-sm font-bold text-zinc-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-600" />
          Tambah / Input Kode Akses
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-end">
          {/* 1. Input Kode Manual (Opsional) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Kode Akses <span className="font-normal text-zinc-400">(Manual / Acak)</span>
            </label>
            <input
              type="text"
              placeholder="Kosong = Acak"
              value={customCodeInput}
              onChange={(e) => setCustomCodeInput(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm font-mono uppercase bg-zinc-50/50 focus:bg-white transition"
            />
          </div>

          {/* 2. Catatan / Pemilik */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Catatan / Pemilik
            </label>
            <input
              type="text"
              placeholder="Cth: Pengurus / VIP"
              value={newCodeNotes}
              onChange={(e) => setNewCodeNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm bg-white"
            />
          </div>

          {/* 3. Masa Berlaku */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Masa Aktif Cache
            </label>
            <select
              value={selectedDurationPreset}
              onChange={(e) => setSelectedDurationPreset(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm bg-white text-zinc-700 cursor-pointer"
            >
              <option value={0}>Permanen</option>
              <option value={86400}>1 Hari (86.400s)</option>
              <option value={259200}>3 Hari (259.200s)</option>
              <option value={604800}>7 Hari (604.800s)</option>
              <option value={2592000}>30 Hari (2.592.000s)</option>
              <option value={-1}>Kustom Detik...</option>
            </select>
          </div>

          {/* 4. Kuota Tanya AI / Hari */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Batas Tanya AI
            </label>
            <select
              value={newAiDailyLimit}
              onChange={(e) => setNewAiDailyLimit(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm bg-white text-zinc-700 cursor-pointer"
            >
              <option value={10}>10 Pertanyaan/Hari</option>
              <option value={20}>20 Pertanyaan/Hari</option>
              <option value={50}>50 Pertanyaan/Hari</option>
              <option value={100}>100 Pertanyaan/Hari</option>
              <option value={0}>Unlimited</option>
            </select>
          </div>

          {/* 5. Jam Reset Harian */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Jam Reset (WIB)
            </label>
            <select
              value={newAiResetHour}
              onChange={(e) => setNewAiResetHour(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm bg-white text-zinc-700 cursor-pointer"
            >
              <option value={0}>Pukul 00:00 (Tengah Malam)</option>
              <option value={3}>Pukul 03:00 (Dini Hari)</option>
              <option value={4}>Pukul 04:00 (Subuh)</option>
              <option value={5}>Pukul 05:00 (Pagi)</option>
              <option value={6}>Pukul 06:00 (Pagi)</option>
              <option value={12}>Pukul 12:00 (Siang)</option>
            </select>
          </div>

          {/* 6. Tombol Buat */}
          <div>
            <button
              type="button"
              onClick={handleCreateCode}
              disabled={generating}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 text-sm cursor-pointer whitespace-nowrap"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>{customCodeInput.trim() ? 'Simpan Kode' : 'Generate Kode'}</span>
            </button>
          </div>
        </div>

        {/* Input kustom detik jika dipilih */}
        {selectedDurationPreset === -1 && (
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-zinc-100 max-w-sm">
            <span className="text-xs text-zinc-600 font-medium">Input Durasi:</span>
            <input
              type="number"
              placeholder="Detik..."
              value={customDurationSeconds}
              onChange={(e) => setCustomDurationSeconds(e.target.value)}
              className="w-32 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <span className="text-xs text-zinc-400">detik sebelum terkunci kembali</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar Data Table */}
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-zinc-800">Daftar Kode & Hak Akses</h2>
            <span className="text-xs bg-zinc-200/70 text-zinc-700 px-2.5 py-0.5 rounded-full font-medium">
              {filteredCodes.length} kode
            </span>
          </div>
          
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari kode atau nama grup..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-zinc-100">
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Kode Akses</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Catatan</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Masa Berlaku</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Batas Tanya AI</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Akses Sidebar (Fitur)</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredCodes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                      {searchQuery ? 'Tidak ada kode akses yang cocok dengan pencarian.' : 'Belum ada kode akses yang dibuat.'}
                    </td>
                  </tr>
                ) : (
                  filteredCodes.map((code) => {
                    const features = code.allowed_features || [];
                    const isAll = features.length === AVAILABLE_FEATURES.length;
                    
                    return (
                      <tr key={code.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-lg text-emerald-700 tracking-wide">{code.code}</span>
                            <button onClick={() => copyToClipboard(code.code)} className="text-zinc-400 hover:text-emerald-600 transition-colors cursor-pointer" title="Salin Kode">
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-zinc-700">{code.notes || '-'}</td>
                        <td className="px-6 py-4">
                          {(() => {
                            const dur = formatDurationLabel(code.expires_in_seconds);
                            return dur.isPermanent ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200/60">
                                <Clock className="w-3 h-3 text-zinc-400" />
                                Permanen
                              </span>
                            ) : (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                                  {dur.main}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono mt-0.5">{dur.sub}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              {code.ai_daily_limit && code.ai_daily_limit > 0 ? `${code.ai_daily_limit} tanya / hari` : 'Unlimited'}
                            </span>
                            <span className="text-[10px] text-zinc-400 mt-0.5">
                              Reset pk {(code.ai_reset_hour ?? 0).toString().padStart(2, '0')}:00 WIB
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {features.length === 0 ? (
                              <span className="text-xs text-zinc-400 italic">Tidak ada akses</span>
                            ) : isAll ? (
                              <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider border border-emerald-200/50">Full Akses (Semua)</span>
                            ) : (
                              features.map(fId => {
                                const fName = AVAILABLE_FEATURES.find(a => a.id === fId)?.label || fId;
                                return (
                                  <span key={fId} className="px-2 py-1 rounded-md bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider border border-zinc-200/50">
                                    {fName}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleStatus(code.id, code.is_active)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors border ${
                              code.is_active 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                : 'bg-zinc-50 text-zinc-500 border-zinc-200 hover:bg-zinc-100'
                            }`}
                          >
                            {code.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                            {code.is_active ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(code)}
                              className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Pengaturan Akses Fitur"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteCode(code.id)}
                              className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus Kode"
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
        )}
      </div>

      {/* MODAL EDIT AKSES FITUR */}
      <AnimatePresence>
        {editingCode && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingCode(null)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[101] p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                  <h3 className="font-bold text-lg text-zinc-800 flex items-center gap-2">
                    <Edit2 className="w-5 h-5 text-emerald-600" />
                    Atur Hak Akses Sidebar
                  </h3>
                  <button onClick={() => setEditingCode(null)} className="p-1.5 text-zinc-400 hover:bg-zinc-200 rounded-lg transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <p className="text-xs text-emerald-800 font-medium mb-1">Mengatur hak akses untuk kode:</p>
                    <p className="font-mono font-bold text-xl text-emerald-900">{editingCode.code}</p>
                    {editingCode.notes && <p className="text-sm text-emerald-700 mt-1">Catatan: {editingCode.notes}</p>}
                  </div>

                  <h4 className="font-bold text-sm text-zinc-800 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-emerald-600" />
                    Masa Berlaku Cache:
                  </h4>
                  <div className="mb-6 p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                    <p className="text-xs text-zinc-500">
                      Tentukan berapa lama browser / aplikasi pengguna dapat menyimpan akses sebelum harus input kode ulang.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { label: 'Permanen', sec: 0 },
                        { label: '1 Hari (86.400s)', sec: 86400 },
                        { label: '3 Hari (259.200s)', sec: 259200 },
                        { label: '7 Hari (604.800s)', sec: 604800 },
                        { label: '30 Hari (2.592.000s)', sec: 2592000 },
                      ].map((preset) => {
                        const isChosen = (editExpiresInSeconds === null || editExpiresInSeconds === 0) 
                          ? preset.sec === 0 
                          : editExpiresInSeconds === preset.sec;
                        return (
                          <button
                            key={preset.sec}
                            type="button"
                            onClick={() => {
                              setEditExpiresInSeconds(preset.sec === 0 ? null : preset.sec);
                              setEditCustomSeconds('');
                            }}
                            className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition cursor-pointer ${
                              isChosen 
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                                : 'bg-white text-zinc-700 border-zinc-200 hover:border-emerald-300'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-medium text-zinc-600">Atau kustom detik:</span>
                      <input
                        type="number"
                        placeholder="Contoh: 3600"
                        value={editCustomSeconds}
                        onChange={(e) => {
                          setEditCustomSeconds(e.target.value);
                          const val = parseInt(e.target.value, 10);
                          setEditExpiresInSeconds(!isNaN(val) && val > 0 ? val : null);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-zinc-300 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 bg-white"
                      />
                      <span className="text-xs text-zinc-400">detik</span>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-zinc-800 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Batas Kuota Pertanyaan AI & Jam Reset:
                  </h4>
                  <div className="mb-6 p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">Maksimal Tanya AI / Hari:</label>
                        <select
                          value={editAiDailyLimit}
                          onChange={(e) => setEditAiDailyLimit(parseInt(e.target.value, 10))}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-700 cursor-pointer"
                        >
                          <option value={10}>10 Pertanyaan / Hari</option>
                          <option value={20}>20 Pertanyaan / Hari (Standar)</option>
                          <option value={50}>50 Pertanyaan / Hari</option>
                          <option value={100}>100 Pertanyaan / Hari</option>
                          <option value={0}>Unlimited (Tanpa Batas)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-700 mb-1">Jam Reset Harian (WIB):</label>
                        <select
                          value={editAiResetHour}
                          onChange={(e) => setEditAiResetHour(parseInt(e.target.value, 10))}
                          className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs bg-white text-zinc-700 cursor-pointer"
                        >
                          <option value={0}>Pukul 00:00 WIB (Tengah Malam)</option>
                          <option value={3}>Pukul 03:00 WIB (Dini Hari)</option>
                          <option value={4}>Pukul 04:00 WIB (Subuh)</option>
                          <option value={5}>Pukul 05:00 WIB (Pagi)</option>
                          <option value={6}>Pukul 06:00 WIB (Pagi)</option>
                          <option value={12}>Pukul 12:00 WIB (Siang)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-zinc-800 mb-3 uppercase tracking-wider">Pilih Fitur Yang Tersedia:</h4>
                  <div className="space-y-2">
                    {AVAILABLE_FEATURES.map(feature => {
                      const isSelected = editFeatures.includes(feature.id);
                      return (
                        <label 
                          key={feature.id} 
                          onClick={(e) => {
                            e.preventDefault();
                            toggleFeature(feature.id);
                          }}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-emerald-500 bg-emerald-50/50' : 'border-zinc-200 hover:border-emerald-300'}`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-300'}`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                          <span className={`font-semibold ${isSelected ? 'text-emerald-900' : 'text-zinc-700'}`}>{feature.label}</span>
                          {feature.default && !isSelected && (
                            <span className="ml-auto text-[10px] uppercase font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">Default Fitur</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3">
                  <button
                    onClick={() => setEditingCode(null)}
                    className="px-5 py-2.5 rounded-xl font-semibold text-zinc-600 hover:bg-zinc-200 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={saveEdit}
                    disabled={savingEdit}
                    className="px-5 py-2.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Akses
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
