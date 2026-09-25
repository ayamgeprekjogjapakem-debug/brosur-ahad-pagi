'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Sparkles, BookOpen, Search, ArrowRight, Loader2, Save, X, Eye, ChevronLeft, ChevronRight, Edit3, Check
} from 'lucide-react';

export default function GenerateSQLPage() {
  const [brosurs, setBrosurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [brosurSearch, setBrosurSearch] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  
  // Pagination state for Brosur
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const [selectedBrosurForGen, setSelectedBrosurForGen] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [draftHadists, setDraftHadists] = useState<any[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [showMassGenModal, setShowMassGenModal] = useState(false);

  // States for external Hadith Search (API Gading)
  const [searchKitab, setSearchKitab] = useState('bukhari');
  const [searchNomor, setSearchNomor] = useState('');
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchBrosurs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [brosurSearch]);

  const fetchBrosurs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('brosur')
        .select('id, judul, tahun, slug, teks_bersih, folders(name)')
        .order('tahun', { ascending: false });
        
      if (filterTahun) {
        query = query.eq('tahun', filterTahun);
      }

      const { data } = await query.limit(200);
      setBrosurs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableYears = async () => {
    const { data } = await supabase.from('brosur').select('tahun').order('tahun', { ascending: false });
    if (data) {
      const years = Array.from(new Set(data.map(d => d.tahun).filter(Boolean)));
      setAvailableYears(years as number[]);
    }
  };

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    fetchBrosurs();
  }, [filterTahun]);

  const extractHadistFromText = (teks: string, brosurId: string) => {
    if (!teks) return [];
    
    // Pola Regex sederhana untuk menangkap teks Arab (blok-blok Arab)
    const arabicRegex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]{15,})/g;
    
    const drafts: any[] = [];
    let match;
    let counter = 1;
    
    // Potong teks berdasarkan baris baru untuk memudahkan pencarian terjemahan setelah teks arab
    const lines = teks.split('\n').filter(l => l.trim().length > 0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (arabicRegex.test(line)) {
        // Asumsikan baris ini adalah teks Arab
        const arabicText = line.trim();
        
        // Asumsikan 1-3 baris berikutnya adalah terjemahan (selama tidak mengandung teks arab lagi)
        let terjemahan = '';
        for (let j = 1; j <= 3; j++) {
          if (i + j < lines.length) {
            const nextLine = lines[i + j];
            if (!arabicRegex.test(nextLine)) {
              terjemahan += nextLine.trim() + ' ';
            } else {
              break;
            }
          }
        }
        
        // Deteksi takhrij sederhana dari terjemahan atau teks setelahnya
        let rawi = 'Sumber Tidak Dikenal';
        const lowerTerjemahan = terjemahan.toLowerCase();
        if (lowerTerjemahan.includes('bukhari')) rawi = 'Bukhari';
        else if (lowerTerjemahan.includes('muslim')) rawi = 'Muslim';
        else if (lowerTerjemahan.includes('tirmidzi')) rawi = 'Tirmidzi';
        else if (lowerTerjemahan.includes('abu dawud')) rawi = 'Abu Dawud';
        else if (lowerTerjemahan.includes('nasa')) rawi = 'Nasai';
        else if (lowerTerjemahan.includes('ibnu majah')) rawi = 'Ibnu Majah';
        else if (lowerTerjemahan.includes('ahmad')) rawi = 'Ahmad';
        else if (lowerTerjemahan.includes('malik')) rawi = 'Malik';

        // Jika terjemahan terlalu panjang, potong
        if (terjemahan.length > 500) {
          terjemahan = terjemahan.substring(0, 500) + '...';
        }

        drafts.push({
          id: `draft_${Date.now()}_${counter++}`,
          brosur_id: brosurId,
          kutipan_arab: arabicText,
          terjemahan: terjemahan.trim() || 'Terjemahan tidak terdeteksi...',
          rawi_kitab: rawi,
          status_hadist: 'mentah'
        });
      }
    }
    
    // Remove duplicates based on arabic text similarity
    const uniqueDrafts = drafts.filter((draft, index, self) =>
      index === self.findIndex((t) => (
        t.kutipan_arab === draft.kutipan_arab
      ))
    );

    return uniqueDrafts;
  };

  const handleAutoGenerateFromBrosur = (brosur: any) => {
    setSelectedBrosurForGen(brosur);
    setGenerating(true);
    setDraftHadists([]);
    
    // Ekstraksi data
    setTimeout(() => {
      const extracted = extractHadistFromText(brosur.teks_bersih || '', brosur.id);
      if (extracted.length === 0) {
        // Fallback jika tidak ditemukan
        extracted.push({
          id: `draft_${Date.now()}_fallback`,
          brosur_id: brosur.id,
          kutipan_arab: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ', 
          terjemahan: 'Amal itu tergantung niat.', 
          rawi_kitab: 'Bukhari', 
          status_hadist: 'mentah'
        });
      }
      setDraftHadists(extracted);
      setGenerating(false);
    }, 1000);
  };

  const handleUpdateDraft = (id: string, field: string, value: string) => {
    setDraftHadists(prev => 
      prev.map(d => d.id === id ? { ...d, [field]: value } : d)
    );
  };

  const handleRemoveDraft = (id: string) => {
    setDraftHadists(prev => prev.filter(d => d.id !== id));
  };

  const handleSearchExternalHadist = async () => {
    if (!searchKitab || !searchNomor) {
      alert("Harap pilih kitab dan masukkan nomor hadist!");
      return;
    }
    
    setIsSearchingApi(true);
    setSearchResults([]);
    
    try {
      const res = await fetch(`https://api.hadith.gading.dev/books/${searchKitab}/${searchNomor}`);
      const data = await res.json();
      
      if (data && data.data && data.data.contents) {
        const hadist = data.data.contents;
        setSearchResults([
          {
            id: hadist.number,
            kitab: data.data.name,
            arab: hadist.arab,
            terjemah: hadist.id,
          }
        ]);
      } else {
        alert("Hadist tidak ditemukan di API!");
      }
    } catch (e) {
      alert("Gagal terhubung ke API Hadist.");
    } finally {
      setIsSearchingApi(false);
    }
  };

  const applySearchResult = (draftId: string, res: any) => {
    handleUpdateDraft(draftId, 'kutipan_arab', res.arab);
    handleUpdateDraft(draftId, 'terjemahan', res.terjemah);
    handleUpdateDraft(draftId, 'rawi_kitab', res.kitab);
    alert('Data draft berhasil ditimpa dengan teks API yang sempurna!');
    setSearchResults([]);
    setSearchNomor('');
  };

  const handleSaveAllToDatabase = async () => {
    if (draftHadists.length === 0) return;
    
    const confirmMsg = `Anda akan menyimpan ${draftHadists.length} hadist mentah ke database. Lanjutkan?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setGenerating(true);
      // Persiapkan payload
      const payload = draftHadists.map(d => ({
        brosur_id: d.brosur_id,
        kutipan_arab: d.kutipan_arab,
        terjemahan: d.terjemahan,
        rawi_kitab: d.rawi_kitab,
        status_hadist: d.status_hadist
      }));

      const { error } = await supabase.from('hadist_brosur').insert(payload);
      
      if (error) {
        alert('Terjadi kesalahan saat menyimpan: ' + error.message);
      } else {
        alert('Berhasil menyimpan semua hadist mentah ke database!');
        setDraftHadists([]);
        setSelectedBrosurForGen(null);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const filteredBrosurs = brosurs.filter(b => b.judul?.toLowerCase().includes(brosurSearch.toLowerCase()));
  const totalPages = Math.ceil(filteredBrosurs.length / itemsPerPage);
  const currentBrosurs = filteredBrosurs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Amiri:wght@400;700&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .arabic-text { font-family: 'Amiri', serif; direction: rtl; }
      `}} />

      <div className="p-5 sm:p-7 space-y-6 font-jakarta text-slate-800 bg-slate-50/60 min-h-full">
        
        {/* Hero Header Section */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-gradient-to-br from-amber-100/40 to-orange-50/10 rounded-full pointer-events-none blur-2xl"></div>
          
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold mb-1">
              <Sparkles className="w-4 h-4" />
              <span>AI & Automation Tools</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Auto-Generate Hadist Mentah</h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Sistem akan membaca teks brosur secara otomatis (via Pola Regex/AI), mengenali teks Arab dan terjemahan, serta mendeteksi takhrij. Hasil ekstraksi bisa Anda koreksi di sini sebelum disimpan sebagai <strong>Hadist Mentah</strong>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KOLOM KIRI: DAFTAR BROSUR UNTUK DIPILIH */}
          <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <span>1. Pilih Brosur Sumber</span>
              </h4>
              <div className="mt-3 relative flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Cari judul..."
                    value={brosurSearch}
                    onChange={(e) => setBrosurSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
                <select
                  value={filterTahun}
                  onChange={(e) => setFilterTahun(e.target.value)}
                  className="w-24 text-xs bg-white border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Semua Thn</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="text-center py-10 text-xs text-slate-400 font-medium">Memuat brosur...</div>
              ) : currentBrosurs.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">Tidak ada brosur ditemukan.</div>
              ) : (
                currentBrosurs.map((bro) => (
                  <div
                    key={bro.id}
                    onClick={() => handleAutoGenerateFromBrosur(bro)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      selectedBrosurForGen?.id === bro.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-transparent hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
                      <span>Tahun {bro.tahun}</span>
                      <span>{bro.folders?.name || 'Koleksi'}</span>
                    </div>
                    <p className="font-bold text-xs line-clamp-2">{bro.judul}</p>
                  </div>
                ))
              )}
            </div>
            
            {/* Pagination Controls */}
            <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || filteredBrosurs.length === 0}
                  className="p-1 rounded border border-slate-200 hover:bg-white disabled:opacity-50 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold px-2">{currentPage} / {Math.max(1, totalPages)}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || filteredBrosurs.length === 0}
                  className="p-1 rounded border border-slate-200 hover:bg-white disabled:opacity-50 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: HASIL AUTO-GENERATE (DRAFT REVIEW) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/70 shadow-sm flex flex-col h-[700px] overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-600" />
                <span>2. Review & Simpan Hasil Ekstraksi</span>
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4">
              {generating ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-amber-600">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm font-bold animate-pulse">Sedang Membaca & Mengekstrak Teks...</p>
                </div>
              ) : !selectedBrosurForGen ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <ArrowRight className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-medium">Pilih brosur di sebelah kiri untuk mulai ekstraksi.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-20">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Ditemukan {draftHadists.length} potensi hadist</p>
                      <p className="text-[10px] text-slate-500">Brosur: {selectedBrosurForGen.judul}</p>
                    </div>
                    {draftHadists.length > 0 && (
                      <button 
                        onClick={handleSaveAllToDatabase}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 transition"
                      >
                        <Save className="w-3.5 h-3.5" /> Simpan Semua ke Database
                      </button>
                    )}
                  </div>

                  {draftHadists.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-500">
                      Tidak menemukan pola hadist (teks Arab & Terjemahan) di dalam brosur ini.
                    </div>
                  ) : (
                    draftHadists.map((draft, idx) => (
                      <div key={draft.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 relative group">
                        <button 
                          onClick={() => handleRemoveDraft(draft.id)}
                          title="Hapus Draft Ini"
                          className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        
                        <div className="flex items-center justify-between pr-8">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Data #{idx + 1}
                            </span>
                            {editingDraftId === draft.id ? (
                              <input 
                                type="text"
                                value={draft.rawi_kitab}
                                onChange={(e) => handleUpdateDraft(draft.id, 'rawi_kitab', e.target.value)}
                                className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded px-2 py-0.5 focus:ring-1 focus:ring-amber-500 outline-none w-32"
                                placeholder="Rawi/Kitab"
                              />
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {draft.rawi_kitab || 'Sumber Tidak Dikenal'}
                              </span>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => setEditingDraftId(editingDraftId === draft.id ? null : draft.id)}
                            className="text-slate-400 hover:text-emerald-600 text-xs flex items-center gap-1 font-medium transition"
                          >
                            {editingDraftId === draft.id ? <><Check className="w-3.5 h-3.5"/> Selesai</> : <><Edit3 className="w-3.5 h-3.5"/> Edit Data</>}
                          </button>
                        </div>
                        
                        {editingDraftId === draft.id ? (
                          <div className="space-y-3 pt-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Teks Arab</label>
                              <textarea 
                                value={draft.kutipan_arab}
                                onChange={(e) => handleUpdateDraft(draft.id, 'kutipan_arab', e.target.value)}
                                className="arabic-text w-full text-slate-800 text-sm font-semibold bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[80px] focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
                                dir="rtl"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Terjemahan</label>
                              <textarea 
                                value={draft.terjemahan}
                                onChange={(e) => handleUpdateDraft(draft.id, 'terjemahan', e.target.value)}
                                className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[80px] focus:ring-2 focus:ring-emerald-500 outline-none resize-y"
                              />
                            </div>
                            
                            {/* Pencarian Referensi Eksternal (API Gading) */}
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 mt-4">
                              <label className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide mb-1 block flex items-center gap-1">
                                <Search className="w-3 h-3" /> Tarik Data Spesifik dari API Gading
                              </label>
                              <div className="flex gap-2 mb-2">
                                <select 
                                  value={searchKitab}
                                  onChange={(e) => setSearchKitab(e.target.value)}
                                  className="text-xs bg-white border border-indigo-200 rounded-lg px-2 py-2 focus:ring-1 focus:ring-indigo-500 outline-none w-32 cursor-pointer"
                                >
                                  <option value="bukhari">Bukhari</option>
                                  <option value="muslim">Muslim</option>
                                  <option value="tirmidzi">Tirmidzi</option>
                                  <option value="abudaud">Abu Daud</option>
                                  <option value="nasai">Nasai</option>
                                  <option value="ibnumajah">Ibnu Majah</option>
                                  <option value="ahmad">Ahmad</option>
                                  <option value="malik">Malik</option>
                                  <option value="darimi">Darimi</option>
                                </select>
                                <input 
                                  type="number"
                                  placeholder="Nomor Hadist..."
                                  value={searchNomor}
                                  onChange={(e) => setSearchNomor(e.target.value)}
                                  className="flex-1 text-xs bg-white border border-indigo-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                                <button 
                                  onClick={handleSearchExternalHadist}
                                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 flex items-center gap-1 transition-colors"
                                >
                                  {isSearchingApi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                  Cari
                                </button>
                              </div>
                              {searchResults.length > 0 && (
                                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto bg-white border border-indigo-100 rounded-lg p-2">
                                  {searchResults.map((res, i) => (
                                    <div key={i} className="p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer rounded transition-colors group/result" onClick={() => applySearchResult(draft.id, res)}>
                                      <div className="flex justify-between items-center mb-1.5">
                                         <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{res.kitab}</span>
                                         <button className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2.5 py-1 rounded opacity-0 group-hover/result:opacity-100 transition-opacity flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Gunakan
                                         </button>
                                      </div>
                                      <p className="arabic-text text-slate-800 text-sm font-semibold text-right leading-loose">{res.arab}</p>
                                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">{res.terjemah}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="arabic-text text-slate-800 text-sm font-semibold pt-1 leading-loose">{draft.kutipan_arab}</p>
                            <p className="text-xs text-slate-600 italic">"{draft.terjemahan}"</p>
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
