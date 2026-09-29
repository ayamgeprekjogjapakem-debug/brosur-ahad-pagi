'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Key, Plus, Trash2, CheckCircle2, XCircle, Loader2, Copy, Edit2, X, Save, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AccessCode {
  id: string;
  code: string;
  is_active: boolean;
  created_at: string;
  notes: string | null;
  allowed_features?: string[]; // Akan disimpan di DB sebagai jsonb array
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
  const [newCodeNotes, setNewCodeNotes] = useState('');
  
  // Modal Edit State
  const [editingCode, setEditingCode] = useState<AccessCode | null>(null);
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  const supabase = createClient();

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

  const generateCode = async () => {
    setGenerating(true);
    const randomCode = 'MTA-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Default features
    const defaultFeatures = AVAILABLE_FEATURES.filter(f => f.default).map(f => f.id);

    const { data, error } = await supabase
      .from('access_codes')
      .insert([{ 
        code: randomCode, 
        is_active: true,
        notes: newCodeNotes || 'Reguler Akses',
        allowed_features: defaultFeatures
      }])
      .select();

    if (!error && data) {
      setCodes([data[0], ...codes]);
      setNewCodeNotes('');
    } else {
      console.error('Error generating code:', error);
      alert('Gagal membuat kode. Pastikan Anda telah menambahkan kolom "allowed_features" (tipe JSONB) di tabel access_codes.');
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

    const { error } = await supabase
      .from('access_codes')
      .update({ allowed_features: editFeatures })
      .eq('id', editingCode.id);

    if (!error) {
      setCodes(codes.map(c => c.id === editingCode.id ? { ...c, allowed_features: editFeatures } : c));
      setEditingCode(null);
    } else {
      alert('Gagal menyimpan pengaturan fitur. Pastikan tabel access_codes memiliki kolom allowed_features (JSONB).');
    }
    setSavingEdit(false);
  };

  const filteredCodes = codes.filter(c => 
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 flex items-center gap-3">
            <Key className="w-8 h-8 text-emerald-500" />
            Access Codes
          </h1>
          <p className="text-zinc-500 mt-1">Kelola kode akses dan hak akses fitur (sidebar) untuk setiap kode.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar Data Table */}
        <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-bold text-zinc-800 hidden sm:block">Daftar Kode & Hak Akses</h2>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1 sm:justify-end">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Cari kode atau nama grup..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm"
              />
            </div>
            
            <input
              type="text"
              placeholder="Catatan / Nama Grup..."
              value={newCodeNotes}
              onChange={(e) => setNewCodeNotes(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm min-w-[250px]"
            />
            <button
              onClick={generateCode}
              disabled={generating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 text-sm whitespace-nowrap"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generate Kode Baru
            </button>
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
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Akses Sidebar (Fitur)</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredCodes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
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
                            <button onClick={() => copyToClipboard(code.code)} className="text-zinc-400 hover:text-emerald-600 transition-colors" title="Salin Kode">
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-zinc-700">{code.notes || '-'}</td>
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
