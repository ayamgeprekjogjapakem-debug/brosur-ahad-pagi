'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Sparkles, BookOpen, Search, ArrowRight, Loader2, Save, X, Eye, ChevronLeft, ChevronRight, Edit3, Check,
  CheckCircle
} from 'lucide-react';

export default function GenerateSQLPage() {
  const [brosurs, setBrosurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [brosurSearch, setBrosurSearch] = useState('');
  const [filterTahunMulai, setFilterTahunMulai] = useState('');
  const [filterTahunAkhir, setFilterTahunAkhir] = useState('');
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Pagination state for Brosur
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Pagination state for Drafts
  const [draftPage, setDraftPage] = useState(1);
  const draftsPerPage = 20;

  const [selectedBrosurForGen, setSelectedBrosurForGen] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [massProgress, setMassProgress] = useState({ current: 0, total: 0 });
  const [draftHadists, setDraftHadists] = useState<any[]>([]);
  const [filterDraftRawi, setFilterDraftRawi] = useState<string>('Semua');
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [showMassGenModal, setShowMassGenModal] = useState(false);
  const [isViewingDatabase, setIsViewingDatabase] = useState(false);

  // States for external Hadith Search (API Gading)
  const [searchKitab, setSearchKitab] = useState('bukhari');
  const [searchNomor, setSearchNomor] = useState('');
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const supabase = createClient();


  useEffect(() => {
    setCurrentPage(1);
  }, [brosurSearch]);

  const fetchBrosurs = async () => {
    try {
      setLoading(true);
      let allBrosurs: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;

      while (hasMore) {
        let q = supabase
          .from('brosur')
          .select('id, judul, tahun, slug, teks_bersih, folders(name), hadist_brosur(id)')
          .order('tahun', { ascending: false })
          .range(from, to);

        if (filterTahunMulai) q = q.gte('tahun', parseInt(filterTahunMulai));
        if (filterTahunAkhir) q = q.lte('tahun', parseInt(filterTahunAkhir));

        const { data } = await q;
        if (data && data.length > 0) {
          allBrosurs = [...allBrosurs, ...data];
          from += 1000;
          to += 1000;
        } else {
          hasMore = false;
        }
      }

      setBrosurs(allBrosurs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableYears = async () => {
    const { data } = await supabase.from('brosur').select('tahun').order('tahun', { ascending: false });
    if (data) {
      const years = Array.from(new Set(data.map(d => d.tahun).filter(Boolean))) as number[];
      setAvailableYears(years);

      // Default ke tahun paling baru jika belum ada filter
      if (years.length > 0 && !filterTahunMulai && !filterTahunAkhir) {
        setFilterTahunMulai(years[0].toString());
        setFilterTahunAkhir(years[0].toString());
      }
    }
  };

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    fetchBrosurs();
  }, [filterTahunMulai, filterTahunAkhir]);

  const extractHadistFromText = (rawTeks: string, brosurId: string) => {
    if (!rawTeks) return [];

    // Bersihkan HTML tags & entities jika teks mengandung raw HTML
    let teks = rawTeks.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"');

    // Pola Regex untuk menangkap blok teks Arab 
    // Memperbolehkan titik dua (:), titik koma Arab (؛), koma Arab (،), tanda kurung, angka Arab maupun Latin, tanda kurung siku, karakter khusus Arab (seperti Sallallahu Alayhi Wasallam ﷺ)
    const arabicRegex = /([\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\.,\-\(\)"':;؛،؟﴾﴿«»\[\]]{5,}[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF])/g;

    // 1. Temukan SEMUA blok Arab terlebih dahulu
    const matches: { text: string; start: number; end: number }[] = [];
    let match;
    while ((match = arabicRegex.exec(teks)) !== null) {
      matches.push({
        text: match[0].trim(),
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    // 2. Gabungkan blok Arab yang berdekatan (terpisah kurang dari 80 karakter non-Arab)
    // Seringkali teks arab terpisah oleh angka, baris baru, atau kata latin pendek.
    const mergedBlocks: { text: string; start: number; end: number }[] = [];
    for (let i = 0; i < matches.length; i++) {
      if (mergedBlocks.length === 0) {
        mergedBlocks.push(matches[i]);
      } else {
        const last = mergedBlocks[mergedBlocks.length - 1];
        const current = matches[i];

        const gapLength = current.start - last.end;
        if (gapLength < 80) {
          // Gabungkan blok
          const textBetween = teks.substring(last.end, current.start);
          last.text = last.text + textBetween + current.text;
          last.end = current.end;
        } else {
          mergedBlocks.push(current);
        }
      }
    }

    const drafts: any[] = [];
    let counter = 1;

    // 3. Ekstrak Terjemahan & Takhrij
    for (let i = 0; i < mergedBlocks.length; i++) {
      const block = mergedBlocks[i];
      const arabicText = block.text.trim();

      // Abaikan jika terlalu pendek
      if (arabicText.length < 30) continue;

      // Ambil teks SETELAH blok ini sampai sebelum blok Arab berikutnya
      const nextBlockStart = i + 1 < mergedBlocks.length ? mergedBlocks[i + 1].start : teks.length;
      let terjemahan = teks.substring(block.end, nextBlockStart).trim();

      // Deteksi takhrij atau sumber dari terjemahan
      let rawi = 'Sumber Tidak Dikenal';
      const lowerTerjemahan = terjemahan.toLowerCase();

      // Cek apakah ini ayat Al-Qur'an
      if (
        lowerTerjemahan.includes('qs.') ||
        lowerTerjemahan.includes('q.s') ||
        lowerTerjemahan.match(/surat \w+ ayat/i) ||
        lowerTerjemahan.match(/surah \w+ ayat/i) ||
        lowerTerjemahan.match(/al-qur\'?an/i)
      ) {
        rawi = "Al-Qur'an";
      }
      // Jika bukan Al-Qur'an, cari perawi hadist
      else if (lowerTerjemahan.includes('bukhari')) rawi = 'Bukhari';
      else if (lowerTerjemahan.includes('muslim')) rawi = 'Muslim';
      else if (lowerTerjemahan.includes('tirmidzi')) rawi = 'Tirmidzi';
      else if (lowerTerjemahan.includes('abu dawud') || lowerTerjemahan.includes('abu daud')) rawi = 'Abu Dawud';
      else if (lowerTerjemahan.includes('nasa')) rawi = 'Nasai';
      else if (lowerTerjemahan.includes('ibnu majah')) rawi = 'Ibnu Majah';
      else if (lowerTerjemahan.includes('ahmad')) rawi = 'Ahmad';
      else if (lowerTerjemahan.includes('malik')) rawi = 'Malik';
      else if (lowerTerjemahan.includes('darimi')) rawi = 'Darimi';
      else if (lowerTerjemahan.includes('daraquthni')) rawi = 'Daraquthni';
      else if (lowerTerjemahan.includes('baihaqi')) rawi = 'Al-Baihaqi';
      else if (lowerTerjemahan.includes('baghawi')) rawi = 'Al-Baghawi';
      else if (lowerTerjemahan.includes('thabrani')) rawi = 'Thabrani';
      else if (lowerTerjemahan.includes('hakim')) rawi = 'Al-Hakim';

      // Batasi terjemahan maksimal 600 karakter
      if (terjemahan.length > 600) {
        terjemahan = terjemahan.substring(0, 600) + '...';
      }

      drafts.push({
        id: `draft_${Date.now()}_${counter++}`,
        brosur_id: brosurId,
        kutipan_arab: arabicText,
        terjemahan: terjemahan || 'Terjemahan tidak terdeteksi...',
        rawi_kitab: rawi,
        status_hadist: 'mentah'
      });
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
    setMassProgress({ current: 0, total: 0 });
    setDraftHadists([]);
    setFilterDraftRawi('Semua');
    setDraftPage(1);
    setIsViewingDatabase(false);

    // Ekstraksi data
    setTimeout(() => {
      const extracted = extractHadistFromText(brosur.teks_bersih || '', brosur.id);
      setDraftHadists(extracted);
      setGenerating(false);
    }, 500);
  };

  const handleMassGenerate = async () => {
    if (filteredBrosurs.length === 0) return;
    const confirmMsg = `Apakah Anda yakin ingin mengekstrak teks dari ${filteredBrosurs.length} brosur sekaligus? Ini mungkin membutuhkan waktu beberapa saat.`;
    if (!window.confirm(confirmMsg)) return;

    setSelectedBrosurForGen({ judul: `Mass Generate (${filteredBrosurs.length} Brosur)` });
    setGenerating(true);
    setMassProgress({ current: 0, total: filteredBrosurs.length });
    setDraftHadists([]);
    setFilterDraftRawi('Semua');
    setDraftPage(1);
    setIsViewingDatabase(false);

    let allExtracted: any[] = [];

    // Proses satu per satu dengan delay kecil agar UI tidak freeze (Progress Bar bisa jalan)
    for (let i = 0; i < filteredBrosurs.length; i++) {
      const brosur = filteredBrosurs[i];

      // Memberikan jeda singkat (yield) agar browser sempat render ulang UI progress
      await new Promise(resolve => setTimeout(resolve, 10));

      const extracted = extractHadistFromText(brosur.teks_bersih || '', brosur.id);

      // Update state secara bertahap agar UI menampilkan hasil yang terus bertambah
      setDraftHadists(prev => [...prev, ...extracted]);

      setMassProgress({ current: i + 1, total: filteredBrosurs.length });
    }

    setGenerating(false);
  };

  const handleLihatHasilAnalisis = async () => {
    if (filteredBrosurs.length === 0) return;

    setGenerating(true);
    setSelectedBrosurForGen({ judul: `Hasil Analisis Database (${filteredBrosurs.length} Brosur)` });
    setDraftHadists([]);
    setFilterDraftRawi('Semua');
    setDraftPage(1);
    setIsViewingDatabase(true);

    try {
      const brosurIds = filteredBrosurs.map((b: any) => b.id);
      let allDBHadists: any[] = [];

      const batchSize = 150;
      for (let i = 0; i < brosurIds.length; i += batchSize) {
        const batchIds = brosurIds.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('hadist_brosur')
          .select('id, brosur_id, kutipan_arab, terjemahan, rawi_kitab')
          .in('brosur_id', batchIds);

        if (data) {
          allDBHadists = [...allDBHadists, ...data];
          setDraftHadists(prev => [...prev, ...data]); // Update bertahap juga
        }
        setMassProgress({ current: Math.min(brosurIds.length, i + batchSize), total: brosurIds.length });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
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

    // Mengecek apakah ada data yang sudah pernah disimpan di DB sebelumnya
    // Kita cek apakah ada dari draft ini yang brosurnya sudah memiliki hadist di DB
    const uniqueBrosurIds = Array.from(new Set(draftHadists.map(d => d.brosur_id)));

    // Cek di state 'brosurs' apakah brosur tersebut punya length hadist_brosur > 0
    const alreadyExists = brosurs.some(b =>
      uniqueBrosurIds.includes(b.id) && b.hadist_brosur && b.hadist_brosur.length > 0
    );

    let willOverwrite = false;

    if (alreadyExists) {
      const ask = window.confirm("Data untuk brosur ini sudah pernah disimpan ke database sebelumnya.\n\nApakah Anda ingin MENIMPA ULANG (menghapus yang lama dan mengganti dengan yang baru ini)?\n\nKlik OK untuk Timpa Ulang, atau Cancel untuk Batal.");
      if (!ask) {
        alert("Proses simpan dibatalkan (diabaikan).");
        return;
      }
      willOverwrite = true;
    } else {
      const confirmMsg = `Anda akan menyimpan ${draftHadists.length} hadist mentah ke database. Lanjutkan?`;
      if (!window.confirm(confirmMsg)) return;
    }

    try {
      setGenerating(true);

      // Jika menimpa ulang, hapus data lama terlebih dahulu
      if (willOverwrite) {
        await supabase
          .from('hadist_brosur')
          .delete()
          .in('brosur_id', uniqueBrosurIds);
      }

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
        fetchBrosurs(); // Refresh status centang
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

  // Hitung statistik database status
  let savedCount = 0;
  let unsavedCount = 0;

  if (isViewingDatabase) {
    savedCount = draftHadists.length;
    unsavedCount = 0;
  } else {
    draftHadists.forEach(draft => {
      const isSaved = brosurs.find(b => b.id === draft.brosur_id)?.hadist_brosur?.length ? true : false;
      if (isSaved) savedCount++;
      else unsavedCount++;
    });
  }

  // Hitung statistik rawi dari draft yang diekstrak (detail)
  const rawiStats = draftHadists.reduce((acc, draft) => {
    const r = draft.rawi_kitab || 'Sumber Tidak Dikenal';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedRawiStats = (Object.entries(rawiStats) as [string, number][]).sort((a, b) => b[1] - a[1]);

  // Filter draft berdasarkan state
  const filteredDrafts = filterDraftRawi === 'Semua'
    ? draftHadists
    : draftHadists.filter(d => (d.rawi_kitab || 'Sumber Tidak Dikenal') === filterDraftRawi);

  // Paginate drafts
  const totalDraftPages = Math.ceil(filteredDrafts.length / draftsPerPage);
  const currentDrafts = filteredDrafts.slice((draftPage - 1) * draftsPerPage, draftPage * draftsPerPage);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
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
                <div className="flex items-center gap-1">
                  <select
                    value={filterTahunMulai}
                    onChange={(e) => setFilterTahunMulai(e.target.value)}
                    className="w-[70px] text-[10px] sm:text-xs bg-white border border-slate-200 rounded-lg px-1 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Awal</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <span className="text-slate-400 text-xs">-</span>
                  <select
                    value={filterTahunAkhir}
                    onChange={(e) => setFilterTahunAkhir(e.target.value)}
                    className="w-[70px] text-[10px] sm:text-xs bg-white border border-slate-200 rounded-lg px-1 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Akhir</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredBrosurs.length > 1 && (
                <div className="px-2 pt-1 pb-3 flex flex-col gap-2">
                  <button
                    onClick={handleMassGenerate}
                    className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Ekstrak Semua ({filteredBrosurs.length} Brosur)
                  </button>
                  <button
                    onClick={handleLihatHasilAnalisis}
                    className="w-full py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    Lihat Hasil Database ({filteredBrosurs.length} Brosur)
                  </button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-10 text-xs text-slate-400 font-medium">Memuat brosur...</div>
              ) : currentBrosurs.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">Tidak ada brosur ditemukan.</div>
              ) : (
                currentBrosurs.map((bro) => (
                  <div
                    key={bro.id}
                    onClick={() => handleAutoGenerateFromBrosur(bro)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedBrosurForGen?.id === bro.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-transparent hover:bg-slate-50 text-slate-700'
                      }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
                      <span>Tahun {bro.tahun}</span>
                      <div className="flex items-center gap-1.5">
                        {bro.hadist_brosur && bro.hadist_brosur.length > 0 && (
                          <div className="flex items-center gap-1 text-emerald-600 bg-emerald-100/50 px-1.5 py-0.5 rounded" title="Sudah diekstrak ke DB">
                            <CheckCircle className="w-3 h-3" />
                          </div>
                        )}
                        <span>{bro.folders?.name || 'Koleksi'}</span>
                      </div>
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
                <span>{isViewingDatabase ? '2. Hasil Ekstraksi Database' : '2. Review & Simpan Hasil Ekstraksi'}</span>
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4">
              {!selectedBrosurForGen ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <ArrowRight className="w-8 h-8 text-slate-300" />
                  <p className="text-xs font-medium">Pilih brosur di sebelah kiri untuk mulai ekstraksi.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col bg-white p-4 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-20 gap-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-slate-800">Hasil Analisis Ekstraksi</p>
                        <p className="text-[10px] text-slate-500">Sumber: {selectedBrosurForGen.judul}</p>
                      </div>
                      {draftHadists.length > 0 && !generating && !isViewingDatabase && (
                        <button
                          onClick={handleSaveAllToDatabase}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 transition"
                        >
                          <Save className="w-3.5 h-3.5" /> Simpan Semua ({draftHadists.length})
                        </button>
                      )}
                    </div>
                    {draftHadists.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 mb-1">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 transition" onClick={() => setFilterDraftRawi('Semua')}>
                          <span className="text-[10px] font-bold text-blue-600 uppercase">Total Ekstraksi</span>
                          <span className="text-xl font-black text-blue-800">{draftHadists.length}</span>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 flex flex-col items-center justify-center transition">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase">Sudah di DB</span>
                          <span className="text-xl font-black text-emerald-800">{savedCount}</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 flex flex-col items-center justify-center transition">
                          <span className="text-[10px] font-bold text-amber-600 uppercase">Belum di DB</span>
                          <span className="text-xl font-black text-amber-800">{unsavedCount}</span>
                        </div>
                      </div>
                    )}

                    {/* Filter Pills */}
                    {draftHadists.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase self-center mr-1">Filter Detail:</span>
                        <button
                          onClick={() => { setFilterDraftRawi('Semua'); setDraftPage(1); }}
                          className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${filterDraftRawi === 'Semua'
                              ? 'bg-slate-800 text-white border-slate-800'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                          Semua ({draftHadists.length})
                        </button>
                        {sortedRawiStats.map(([r, count]) => (
                          <button
                            key={r}
                            onClick={() => { setFilterDraftRawi(r); setDraftPage(1); }}
                            className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${filterDraftRawi === r
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                          >
                            {r} ({count})
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {generating && (
                    <div className="flex flex-col items-center justify-center p-6 gap-3 text-amber-600 bg-amber-50 rounded-xl border border-amber-100 shadow-sm">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      <p className="text-xs font-bold animate-pulse">
                        {massProgress.total > 0
                          ? `Sedang memindai... (${massProgress.current} dari ${massProgress.total} brosur)`
                          : 'Sedang Membaca & Mengekstrak Teks...'}
                      </p>
                      {massProgress.total > 0 && (
                        <div className="w-full max-w-xs h-1.5 bg-amber-200 rounded-full mt-1 overflow-hidden shadow-inner">
                          <div
                            className="h-full bg-amber-500 transition-all duration-300"
                            style={{ width: `${(massProgress.current / massProgress.total) * 100}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  )}

                  {draftHadists.length === 0 && !generating ? (
                    <div className="text-center py-10 text-xs text-slate-500">
                      {isViewingDatabase
                        ? "Belum ada hasil ekstraksi yang disimpan ke database untuk rentang tahun ini. Silakan jalankan 'Ekstrak Semua' terlebih dahulu."
                        : "Tidak menemukan pola hadist (teks Arab & Terjemahan) di dalam brosur ini."}
                    </div>
                  ) : filteredDrafts.length === 0 && !generating ? (
                    <div className="text-center py-10 text-xs text-slate-500">
                      Tidak ada hadist untuk filter {filterDraftRawi}.
                    </div>
                  ) : (
                    <>
                      {currentDrafts.map((draft, idx) => (
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
                                Data #{((draftPage - 1) * draftsPerPage) + idx + 1}
                              </span>
                              {isViewingDatabase ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Tersimpan di DB
                                </span>
                              ) : brosurs.find(b => b.id === draft.brosur_id)?.hadist_brosur && brosurs.find(b => b.id === draft.brosur_id)!.hadist_brosur!.length > 0 ? (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1" title="Data ini akan menimpa data lama di database">
                                  <CheckCircle className="w-3 h-3" /> Menimpa DB
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200">
                                  Belum di DB
                                </span>
                              )}
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
                              {editingDraftId === draft.id ? <><Check className="w-3.5 h-3.5" /> Selesai</> : <><Edit3 className="w-3.5 h-3.5" /> Edit Data</>}
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
                      ))}

                      {/* Pagination for Drafts */}
                      {totalDraftPages > 1 && (
                        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm flex items-center justify-between text-xs text-slate-500 sticky bottom-0 z-10">
                          <span className="font-medium">Menampilkan {currentDrafts.length} dari {filteredDrafts.length} hasil</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setDraftPage(p => Math.max(1, p - 1))}
                              disabled={draftPage === 1}
                              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="font-semibold px-3 py-1 bg-slate-100 rounded text-slate-700">
                              Hal {draftPage} / {totalDraftPages}
                            </span>
                            <button
                              onClick={() => setDraftPage(p => Math.min(totalDraftPages, p + 1))}
                              disabled={draftPage >= totalDraftPages}
                              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
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
