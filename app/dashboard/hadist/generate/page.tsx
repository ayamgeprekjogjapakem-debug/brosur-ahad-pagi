'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { computeContentHash } from '@/utils/contentHash';
import {
  Sparkles, BookOpen, Search, Loader2, Save, X, Eye, ChevronLeft, ChevronRight, Edit3, Check,
  CheckCircle, Cpu, Database, RefreshCw, AlertCircle, Clock, Square, Table2, FileText
} from 'lucide-react';

export default function GenerateSQLPage() {
  const [brosurs, setBrosurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [brosurSearch, setBrosurSearch] = useState('');
  const [filterTahunMulai, setFilterTahunMulai] = useState('');
  const [filterTahunAkhir, setFilterTahunAkhir] = useState('');
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Active Tab: 'brosur' (Tabel Brosur) | 'hasil' (Tabel Hasil Ekstraksi)
  const [activeTab, setActiveTab] = useState<'brosur' | 'hasil'>('brosur');

  // Pagination state for Brosur table
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // Selected brosur IDs for targeted batch extract
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Pagination state for Drafts table
  const [draftPage, setDraftPage] = useState(1);
  const draftsPerPage = 20;

  const [selectedBrosurForGen, setSelectedBrosurForGen] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [massProgress, setMassProgress] = useState({ current: 0, total: 0 });
  const [draftHadists, setDraftHadists] = useState<any[]>([]);
  const [filterDraftRawi, setFilterDraftRawi] = useState<string>('Semua');
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [isViewingDatabase, setIsViewingDatabase] = useState(false);

  // Opsi Generator: DeepSeek AI vs Regex Lokal
  const [generatorEngine, setGeneratorEngine] = useState<'deepseek' | 'regex'>('deepseek');
  const [autoSaveToDb, setAutoSaveToDb] = useState<boolean>(true);
  const [targetStatus, setTargetStatus] = useState<'terverifikasi' | 'mentah'>('terverifikasi');
  const [processPhase, setProcessPhase] = useState<'idle' | 'analyzing' | 'saving'>('idle');
  const [currentProcessLabel, setCurrentProcessLabel] = useState<string>('');
  const [filterExtractStatus, setFilterExtractStatus] = useState<'all' | 'belum' | 'berubah' | 'sudah'>('all');

  // States for external Hadith Search (API Gading)
  const [searchKitab, setSearchKitab] = useState('bukhari');
  const [searchNomor, setSearchNomor] = useState('');
  const [isSearchingApi, setIsSearchingApi] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const supabase = createClient();
  const fetchSeqRef = useRef(0);
  const cancelMassRef = useRef(false);
  const [yearsLoaded, setYearsLoaded] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
  }, [brosurSearch, filterExtractStatus, itemsPerPage]);

  const fetchBrosurs = async () => {
    const seq = ++fetchSeqRef.current;
    try {
      setLoading(true);
      let allBrosurs: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;

      const summaryPromise = fetch('/api/hadist/items?summary_only=1', { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : { brosur_counts: {} }))
        .catch(() => ({ brosur_counts: {} }));

      while (hasMore) {
        let q = supabase
          .from('brosur')
          .select('id, judul, tahun, slug, teks_bersih, folders(name)')
          .order('tahun', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (filterTahunMulai) q = q.gte('tahun', parseInt(filterTahunMulai));
        if (filterTahunAkhir) q = q.lte('tahun', parseInt(filterTahunAkhir));

        const { data } = await q;

        if (data && data.length > 0) {
          allBrosurs = [...allBrosurs, ...data];
          if (data.length < 1000) {
            hasMore = false;
          } else {
            from += 1000;
            to += 1000;
          }
        } else {
          hasMore = false;
        }
      }

      const summaryData = await summaryPromise;
      if (seq !== fetchSeqRef.current) return;

      const countsMap: Record<string, number> = summaryData?.brosur_counts || {};
      const hashesMap: Record<string, string> = summaryData?.brosur_hashes || {};

      const enrichedBrosurs = allBrosurs.map((b: any) => {
        const count = countsMap[b.id] || 0;
        const savedHash = hashesMap[b.id];
        const currentHash = computeContentHash(b.teks_bersih || '');
        const extractStatus: 'synced' | 'needs_update' | 'pending' =
          count > 0
            ? savedHash && savedHash !== currentHash
              ? 'needs_update'
              : 'synced'
            : 'pending';

        return {
          ...b,
          dalilCount: count,
          hadist_brosur: count > 0 ? Array(count).fill({ id: 'saved' }) : [],
          extractStatus,
        };
      });

      setBrosurs(enrichedBrosurs);
      setSelectedIds(new Set());
    } catch (e) {
      console.error(e);
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchAvailableYears = async () => {
    try {
      const yearSet = new Set<number>();
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data } = await supabase
          .from('brosur')
          .select('tahun')
          .order('tahun', { ascending: false })
          .range(from, from + pageSize - 1);

        if (!data || data.length === 0) break;
        data.forEach((d: any) => {
          if (d.tahun) yearSet.add(Number(d.tahun));
        });
        if (data.length < pageSize) break;
        from += pageSize;
      }

      const years = Array.from(yearSet).sort((a, b) => b - a);
      setAvailableYears(years);

      if (years.length > 0 && !filterTahunMulai && !filterTahunAkhir) {
        setFilterTahunMulai(years[0].toString());
        setFilterTahunAkhir(years[0].toString());
      }
    } finally {
      setYearsLoaded(true);
    }
  };

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    if (!yearsLoaded) return;
    fetchBrosurs();
  }, [yearsLoaded, filterTahunMulai, filterTahunAkhir]);

  const extractHadistFromText = (rawTeks: string, brosurId: string) => {
    if (!rawTeks) return [];

    let teks = rawTeks.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"');

    const arabicRegex = /([\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\.,\-\(\)"':;؛،؟﴾﴿«»\[\]]{5,}[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF])/g;

    const matches: { text: string; start: number; end: number }[] = [];
    let match;
    while ((match = arabicRegex.exec(teks)) !== null) {
      matches.push({
        text: match[0].trim(),
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    const mergedBlocks: { text: string; start: number; end: number }[] = [];
    for (let i = 0; i < matches.length; i++) {
      if (mergedBlocks.length === 0) {
        mergedBlocks.push(matches[i]);
      } else {
        const last = mergedBlocks[mergedBlocks.length - 1];
        const current = matches[i];
        const gapLength = current.start - last.end;
        if (gapLength < 80) {
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

    for (let i = 0; i < mergedBlocks.length; i++) {
      const block = mergedBlocks[i];
      const arabicText = block.text.trim();
      if (arabicText.length < 30) continue;

      const nextBlockStart = i + 1 < mergedBlocks.length ? mergedBlocks[i + 1].start : teks.length;
      let terjemahan = teks.substring(block.end, nextBlockStart).trim();

      let rawi = 'Sumber Tidak Dikenal';
      const lowerTerjemahan = terjemahan.toLowerCase();

      if (
        lowerTerjemahan.includes('qs.') ||
        lowerTerjemahan.includes('q.s') ||
        lowerTerjemahan.match(/surat \w+ ayat/i) ||
        lowerTerjemahan.match(/surah \w+ ayat/i) ||
        lowerTerjemahan.match(/al-qur\'?an/i)
      ) {
        rawi = "Al-Qur'an";
      } else if (lowerTerjemahan.includes('bukhari')) rawi = 'Bukhari';
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

    return drafts.filter((draft, index, self) =>
      index === self.findIndex((t) => t.kutipan_arab === draft.kutipan_arab)
    );
  };

  const handleAutoGenerateFromBrosur = async (brosur: any, forceRegenerate = false) => {
    setSelectedBrosurForGen(brosur);
    setActiveTab('hasil');
    setGenerating(true);
    setMassProgress({ current: 0, total: 1 });
    setDraftHadists([]);
    setFilterDraftRawi('Semua');
    setDraftPage(1);
    setEditingDraftId(null);
    setIsViewingDatabase(false);

    if (!forceRegenerate && brosur.extractStatus === 'synced') {
      try {
        setProcessPhase('analyzing');
        setCurrentProcessLabel(`Memuat hasil ekstraksi "${brosur.judul}" dari database...`);
        const res = await fetch(`/api/hadist/items?brosur_id=${encodeURIComponent(brosur.id)}`, { cache: 'no-store' });
        const json = await res.json();
        if (res.ok && Array.isArray(json.items)) {
          setDraftHadists(json.items);
          setIsViewingDatabase(true);
          setMassProgress({ current: 1, total: 1 });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setGenerating(false);
        setProcessPhase('idle');
        setCurrentProcessLabel('');
      }
      return;
    }

    if (generatorEngine === 'deepseek') {
      try {
        setProcessPhase('analyzing');
        setCurrentProcessLabel(`DeepSeek AI sedang membaca & mengekstrak dalil dari "${brosur.judul}"...`);

        const res = await fetch('/api/hadist/generate-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brosur_id: brosur.id,
            judul: brosur.judul,
            teks_bersih: brosur.teks_bersih || '',
            status_hadist: targetStatus,
            auto_save: autoSaveToDb,
            replace_existing: autoSaveToDb,
            skip_if_unchanged: !forceRegenerate,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          alert(`Gagal mengekstrak dengan DeepSeek: ${data.error || 'Terjadi kesalahan'}`);
        } else {
          const items = data.items || [];
          if (data.skipped) {
            setIsViewingDatabase(true);
          } else if (autoSaveToDb && items.length > 0) {
            setProcessPhase('saving');
            setCurrentProcessLabel(`Berhasil menyimpan ${data.savedCount || items.length} dalil ke database...`);
            await new Promise(r => setTimeout(r, 300));
            fetchBrosurs();
            setIsViewingDatabase(true);
          }
          setDraftHadists(items);
          setMassProgress({ current: 1, total: 1 });
        }
      } catch (e: any) {
        alert('Error memanggil DeepSeek API: ' + (e.message || e));
      } finally {
        setGenerating(false);
        setProcessPhase('idle');
        setCurrentProcessLabel('');
      }
      return;
    }

    setProcessPhase('analyzing');
    setCurrentProcessLabel(`Mengekstrak pola teks Arab & Terjemahan dari "${brosur.judul}"...`);
    setTimeout(() => {
      const extracted = extractHadistFromText(brosur.teks_bersih || '', brosur.id);
      setDraftHadists(extracted);
      setMassProgress({ current: 1, total: 1 });
      setGenerating(false);
      setProcessPhase('idle');
      setCurrentProcessLabel('');
    }, 300);
  };

  const handleMassGenerate = async () => {
    const hasManualSelection = selectedIds.size > 0;
    const toProcess = hasManualSelection
      ? baseSearchBrosurs.filter((b: any) => selectedIds.has(b.id))
      : baseSearchBrosurs.filter((b: any) => b.extractStatus !== 'synced');

    if (toProcess.length === 0) {
      alert(`Semua ${baseSearchBrosurs.length} brosur sudah terekstrak & sinkron.\n\nCentang brosur tertentu di tabel jika ingin generate ulang secara paksa.`);
      return;
    }

    const modeLabel = generatorEngine === 'deepseek' ? 'DeepSeek AI' : 'Regex Lokal';
    const confirmMsg = hasManualSelection
      ? `Anda memilih ${toProcess.length} brosur untuk diekstrak/disempurnakan ulang menggunakan ${modeLabel}.\n\nLanjutkan?`
      : `Ditemukan ${toProcess.length} brosur yang belum terekstrak / isinya berubah.\n\nLanjutkan ekstraksi menggunakan ${modeLabel}?`;

    if (!window.confirm(confirmMsg)) return;

    cancelMassRef.current = false;
    setSelectedBrosurForGen({
      judul: hasManualSelection
        ? `Batch ${modeLabel} (${toProcess.length} Brosur Terpilih)`
        : `Batch ${modeLabel} (${toProcess.length} Brosur Belum/Berubah)`
    });
    setActiveTab('hasil');
    setGenerating(true);
    setMassProgress({ current: 0, total: toProcess.length });
    setDraftHadists([]);
    setFilterDraftRawi('Semua');
    setDraftPage(1);
    setEditingDraftId(null);
    setIsViewingDatabase(autoSaveToDb && generatorEngine === 'deepseek');

    if (generatorEngine === 'deepseek') {
      // Concurrency pool 3 paralel + auto-retry 1x jika gagal sementara
      const concurrency = 3;
      let nextIdx = 0;
      let completedCount = 0;

      const processOne = async (brosur: any) => {
        for (let attempt = 1; attempt <= 2; attempt++) {
          if (cancelMassRef.current) return;
          setProcessPhase('analyzing');
          setCurrentProcessLabel(
            `[${completedCount + 1}/${toProcess.length}] DeepSeek Block-Pointer${attempt > 1 ? ' (Retry)' : ''}: ${brosur.judul}`
          );
          try {
            const res = await fetch('/api/hadist/generate-ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                brosur_id: brosur.id,
                judul: brosur.judul,
                status_hadist: targetStatus,
                auto_save: autoSaveToDb,
                replace_existing: autoSaveToDb,
                skip_if_unchanged: !hasManualSelection,
              }),
            });
            const data = await res.json();
            if (res.ok) {
              if (Array.isArray(data.items) && data.items.length > 0) {
                if (autoSaveToDb && !data.skipped) {
                  setProcessPhase('saving');
                  setCurrentProcessLabel(`Tersimpan ${data.items.length} dalil dari "${brosur.judul}"`);
                }
                setDraftHadists(prev => [...prev, ...data.items]);
              }
              return;
            }
            if (attempt === 2) {
              console.warn('Mass DeepSeek failed on', brosur.id, data.error);
            }
          } catch (err) {
            if (attempt === 2) {
              console.warn('Mass DeepSeek error on', brosur.id, err);
            }
          }
          await new Promise(r => setTimeout(r, 800));
        }
      };

      const workers = Array.from({ length: Math.min(concurrency, toProcess.length) }, async () => {
        while (!cancelMassRef.current) {
          const idx = nextIdx++;
          if (idx >= toProcess.length) break;
          await processOne(toProcess[idx]);
          completedCount++;
          setMassProgress({ current: completedCount, total: toProcess.length });
        }
      });

      await Promise.all(workers);
      if (autoSaveToDb) {
        fetchBrosurs();
      }
      setGenerating(false);
      setProcessPhase('idle');
      setCurrentProcessLabel('');
      return;
    }

    setProcessPhase('analyzing');
    for (let i = 0; i < toProcess.length; i++) {
      if (cancelMassRef.current) break;
      const brosur = toProcess[i];
      setCurrentProcessLabel(`[${i + 1}/${toProcess.length}] Mengekstrak: ${brosur.judul}`);
      await new Promise(resolve => setTimeout(resolve, 10));
      const extracted = extractHadistFromText(brosur.teks_bersih || '', brosur.id);
      setDraftHadists(prev => [...prev, ...extracted]);
      setMassProgress({ current: i + 1, total: toProcess.length });
    }

    setGenerating(false);
    setProcessPhase('idle');
    setCurrentProcessLabel('');
  };

  const handleStopMassGenerate = () => {
    cancelMassRef.current = true;
    setCurrentProcessLabel('Menghentikan proses setelah brosur saat ini selesai...');
  };

  const handleLihatHasilAnalisis = async () => {
    if (filteredBrosurs.length === 0) return;

    setActiveTab('hasil');
    setGenerating(true);
    setProcessPhase('analyzing');
    setCurrentProcessLabel('Memuat data hasil ekstraksi dari database...');
    setSelectedBrosurForGen({ judul: `Database (${filteredBrosurs.length} Brosur sesuai filter)` });
    setDraftHadists([]);
    setFilterDraftRawi('Semua');
    setDraftPage(1);
    setEditingDraftId(null);
    setIsViewingDatabase(true);

    try {
      const brosurIdSet = new Set(filteredBrosurs.map((b: any) => b.id));
      const params = new URLSearchParams();
      if (filterTahunMulai) params.set('tahun_mulai', filterTahunMulai);
      if (filterTahunAkhir) params.set('tahun_akhir', filterTahunAkhir);
      const qs = params.toString();
      const res = await fetch(`/api/hadist/items${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && Array.isArray(json.items)) {
        const matched = json.items.filter((it: any) => brosurIdSet.has(it.brosur_id));
        setDraftHadists(matched);
      }
      setMassProgress({ current: filteredBrosurs.length, total: filteredBrosurs.length });
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
      setProcessPhase('idle');
      setCurrentProcessLabel('');
    }
  };

  const handleUpdateDraft = (id: string, field: string, value: string) => {
    setDraftHadists(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleRemoveDraft = (id: string) => {
    setDraftHadists(prev => prev.filter(d => d.id !== id));
  };

  const handleSearchExternalHadist = async () => {
    if (!searchKitab || !searchNomor) {
      alert('Harap pilih kitab dan masukkan nomor hadist!');
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
        alert('Hadist tidak ditemukan di API!');
      }
    } catch {
      alert('Gagal terhubung ke API Hadist.');
    } finally {
      setIsSearchingApi(false);
    }
  };

  const applySearchResult = (draftId: string, res: any) => {
    handleUpdateDraft(draftId, 'kutipan_arab', res.arab);
    handleUpdateDraft(draftId, 'terjemahan', res.terjemah);
    handleUpdateDraft(draftId, 'rawi_kitab', res.kitab);
    alert('Data draft berhasil ditimpa dengan teks API!');
    setSearchResults([]);
    setSearchNomor('');
  };

  const handleSaveAllToDatabase = async () => {
    if (draftHadists.length === 0) return;

    const uniqueBrosurIds = Array.from(new Set(draftHadists.map(d => d.brosur_id)));
    const alreadyExists = brosurs.some(b =>
      uniqueBrosurIds.includes(b.id) && b.hadist_brosur && b.hadist_brosur.length > 0
    );

    let willOverwrite = false;

    if (alreadyExists) {
      const ask = window.confirm('Data untuk brosur ini sudah ada di database.\n\nApakah Anda ingin MENIMPA ULANG dengan hasil baru ini?\n\nKlik OK untuk Timpa Ulang, atau Cancel untuk Batal.');
      if (!ask) return;
      willOverwrite = true;
    } else {
      const confirmMsg = `Simpan ${draftHadists.length} dalil ke database sekarang?`;
      if (!window.confirm(confirmMsg)) return;
    }

    try {
      setGenerating(true);
      setProcessPhase('saving');
      setCurrentProcessLabel(`Menyimpan ${draftHadists.length} dalil ke database...`);

      const payload = draftHadists.map(d => ({
        brosur_id: d.brosur_id,
        kutipan_arab: d.kutipan_arab || '-',
        kutipan_arab_gundul: d.kutipan_arab_gundul || null,
        terjemahan: d.terjemahan || null,
        rawi_kitab: d.rawi_kitab,
        juz: d.juz || null,
        halaman: d.halaman || null,
        no_hadist: d.no_hadist || null,
        rawi_teratas: d.rawi_teratas || null,
        perawi_sumber: d.perawi_sumber || null,
        catatan: d.catatan || null,
        status_hadist: d.status_hadist || targetStatus
      }));

      const saveRes = await fetch('/api/hadist/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: payload,
          replace_brosur_ids: willOverwrite ? uniqueBrosurIds : [],
        }),
      });
      const saveJson = await saveRes.json();

      if (!saveRes.ok) {
        alert('Gagal menyimpan: ' + (saveJson.error || 'Server Error'));
      } else {
        alert(`Berhasil menyimpan ${saveJson.savedCount || payload.length} dalil ke database!`);
        fetchBrosurs();
        setIsViewingDatabase(true);
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setGenerating(false);
      setProcessPhase('idle');
      setCurrentProcessLabel('');
    }
  };

  // Filtered brosur list & stats
  const baseSearchBrosurs = brosurs.filter(b => b.judul?.toLowerCase().includes(brosurSearch.toLowerCase()));
  const syncedBrosursCount = baseSearchBrosurs.filter(b => b.extractStatus === 'synced').length;
  const changedBrosursCount = baseSearchBrosurs.filter(b => b.extractStatus === 'needs_update').length;
  const pendingOnlyCount = baseSearchBrosurs.filter(b => b.extractStatus === 'pending').length;
  const needsActionCount = pendingOnlyCount + changedBrosursCount;

  const filteredBrosurs = baseSearchBrosurs.filter(b => {
    if (filterExtractStatus === 'belum') return b.extractStatus === 'pending';
    if (filterExtractStatus === 'berubah') return b.extractStatus === 'needs_update';
    if (filterExtractStatus === 'sudah') return b.extractStatus === 'synced';
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredBrosurs.length / itemsPerPage));
  const currentBrosurs = filteredBrosurs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Selection helpers
  const allCurrentPageSelected = currentBrosurs.length > 0 && currentBrosurs.every(b => selectedIds.has(b.id));
  const toggleSelectAllPage = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allCurrentPageSelected) {
        currentBrosurs.forEach(b => next.delete(b.id));
      } else {
        currentBrosurs.forEach(b => next.add(b.id));
      }
      return next;
    });
  };
  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Stats for drafts
  let savedCount = 0;
  let unsavedCount = 0;
  if (isViewingDatabase) {
    savedCount = draftHadists.length;
  } else {
    draftHadists.forEach(draft => {
      const isSaved = brosurs.find(b => b.id === draft.brosur_id)?.dalilCount > 0;
      if (isSaved) savedCount++;
      else unsavedCount++;
    });
  }

  const rawiStats = draftHadists.reduce((acc, draft) => {
    const r = draft.rawi_kitab || 'Sumber Tidak Dikenal';
    acc[r] = (acc[r] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const sortedRawiStats = (Object.entries(rawiStats) as [string, number][]).sort((a, b) => b[1] - a[1]);

  const filteredDrafts = filterDraftRawi === 'Semua'
    ? draftHadists
    : draftHadists.filter(d => (d.rawi_kitab || 'Sumber Tidak Dikenal') === filterDraftRawi);

  const totalDraftPages = Math.max(1, Math.ceil(filteredDrafts.length / draftsPerPage));
  const currentDrafts = filteredDrafts.slice((draftPage - 1) * draftsPerPage, draftPage * draftsPerPage);

  const brosurTitleMap = new Map(brosurs.map(b => [b.id, b.judul]));

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Amiri:wght@400;700&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .arabic-text { font-family: 'Amiri', serif; direction: rtl; }
      `}} />

      <div className="p-4 sm:p-6 space-y-5 font-jakarta text-slate-800 bg-slate-50/70 min-h-full">

        {/* Header + Pengaturan Ringkas */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-amber-600 text-xs font-bold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generator Ekstraksi Dalil</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Ekstraksi Al-Qur&apos;an &amp; Hadits dari Brosur
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih brosur dari tabel di bawah untuk diekstrak satu per satu atau massal, lalu tinjau hasilnya di tab Hasil Ekstraksi.
              </p>
            </div>

            {/* Kontrol Engine & Auto-Save Ringkas */}
            <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <div className="inline-flex rounded-lg bg-white border border-slate-200 p-0.5">
                <button
                  type="button"
                  onClick={() => setGeneratorEngine('deepseek')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    generatorEngine === 'deepseek'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  DeepSeek AI
                </button>
                <button
                  type="button"
                  onClick={() => setGeneratorEngine('regex')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
                    generatorEngine === 'regex'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Regex Lokal
                </button>
              </div>

              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer px-1">
                <input
                  type="checkbox"
                  checked={autoSaveToDb}
                  onChange={(e) => setAutoSaveToDb(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-Simpan DB</span>
              </label>

              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as 'terverifikasi' | 'mentah')}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                title="Status simpan default"
              >
                <option value="terverifikasi">Status: Terverifikasi</option>
                <option value="mentah">Status: Draft Mentah</option>
              </select>
            </div>
          </div>

          {/* 4 Kartu Statistik (Klik untuk langsung filter tabel) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setFilterExtractStatus('all'); setActiveTab('brosur'); }}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                filterExtractStatus === 'all' && activeTab === 'brosur'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70'
              }`}
            >
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${filterExtractStatus === 'all' && activeTab === 'brosur' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Total Brosur
                </p>
                <p className="text-2xl font-black mt-0.5">{loading ? '—' : baseSearchBrosurs.length}</p>
              </div>
              <BookOpen className={`w-6 h-6 ${filterExtractStatus === 'all' && activeTab === 'brosur' ? 'text-slate-300' : 'text-blue-500'}`} />
            </button>

            <button
              type="button"
              onClick={() => { setFilterExtractStatus('sudah'); setActiveTab('brosur'); }}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                filterExtractStatus === 'sudah' && activeTab === 'brosur'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50/60 border-emerald-200/70 hover:bg-emerald-100/60'
              }`}
            >
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${filterExtractStatus === 'sudah' && activeTab === 'brosur' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                  Sudah Sinkron
                </p>
                <p className={`text-2xl font-black mt-0.5 ${filterExtractStatus === 'sudah' && activeTab === 'brosur' ? 'text-white' : 'text-emerald-800'}`}>
                  {loading ? '—' : syncedBrosursCount}
                </p>
              </div>
              <CheckCircle className={`w-6 h-6 ${filterExtractStatus === 'sudah' && activeTab === 'brosur' ? 'text-emerald-100' : 'text-emerald-600'}`} />
            </button>

            <button
              type="button"
              onClick={() => { setFilterExtractStatus('berubah'); setActiveTab('brosur'); }}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                filterExtractStatus === 'berubah' && activeTab === 'brosur'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-amber-50/60 border-amber-200/70 hover:bg-amber-100/60'
              }`}
            >
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${filterExtractStatus === 'berubah' && activeTab === 'brosur' ? 'text-amber-100' : 'text-amber-700'}`}>
                  Isi Berubah
                </p>
                <p className={`text-2xl font-black mt-0.5 ${filterExtractStatus === 'berubah' && activeTab === 'brosur' ? 'text-white' : 'text-amber-800'}`}>
                  {loading ? '—' : changedBrosursCount}
                </p>
              </div>
              <RefreshCw className={`w-6 h-6 ${filterExtractStatus === 'berubah' && activeTab === 'brosur' ? 'text-amber-100' : 'text-amber-600'}`} />
            </button>

            <button
              type="button"
              onClick={() => { setFilterExtractStatus('belum'); setActiveTab('brosur'); }}
              className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                filterExtractStatus === 'belum' && activeTab === 'brosur'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50/60 border-rose-200/70 hover:bg-rose-100/60'
              }`}
            >
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-wider ${filterExtractStatus === 'belum' && activeTab === 'brosur' ? 'text-rose-100' : 'text-rose-700'}`}>
                  Belum Diekstrak
                </p>
                <p className={`text-2xl font-black mt-0.5 ${filterExtractStatus === 'belum' && activeTab === 'brosur' ? 'text-white' : 'text-rose-800'}`}>
                  {loading ? '—' : pendingOnlyCount}
                </p>
              </div>
              <Clock className={`w-6 h-6 ${filterExtractStatus === 'belum' && activeTab === 'brosur' ? 'text-rose-100' : 'text-rose-500'}`} />
            </button>
          </div>
        </div>

        {/* Live Progress Banner saat sedang memproses */}
        {generating && (
          <div className={`rounded-2xl border p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            processPhase === 'saving'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Loader2 className="w-5 h-5 animate-spin shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold uppercase tracking-wider">
                    {processPhase === 'saving'
                      ? 'Menyimpan ke Database...'
                      : generatorEngine === 'deepseek'
                      ? 'DeepSeek AI Sedang Memproses...'
                      : 'Mengekstrak Teks...'}
                  </p>
                  {massProgress.total > 0 && (
                    <span className="text-xs font-bold">
                      {massProgress.current} / {massProgress.total} ({Math.min(100, Math.round((massProgress.current / massProgress.total) * 100))}%)
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5 truncate opacity-90">{currentProcessLabel}</p>
                {massProgress.total > 0 && (
                  <div className={`w-full h-2 rounded-full overflow-hidden mt-2 ${processPhase === 'saving' ? 'bg-emerald-200' : 'bg-amber-200'}`}>
                    <div
                      className={`h-full transition-all duration-300 ${processPhase === 'saving' ? 'bg-emerald-600' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, Math.round((massProgress.current / massProgress.total) * 100))}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            {massProgress.total > 1 && (
              <button
                type="button"
                onClick={handleStopMassGenerate}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition"
              >
                <Square className="w-3 h-3 fill-current" />
                Hentikan
              </button>
            )}
          </div>
        )}

        {/* Tab Switcher */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 bg-slate-50/60">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('brosur')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  activeTab === 'brosur'
                    ? 'border-emerald-600 text-emerald-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Table2 className="w-4 h-4" />
                <span>1. Daftar Brosur</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200/80 text-slate-700">
                  {filteredBrosurs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('hasil')}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  activeTab === 'hasil'
                    ? 'border-amber-500 text-amber-700 bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>2. Hasil Ekstraksi &amp; Review</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  draftHadists.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {draftHadists.length}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={fetchBrosurs}
              disabled={loading}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Muat ulang data dari database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* TAB 1: TABEL DAFTAR BROSUR                                */}
          {/* ========================================================= */}
          {activeTab === 'brosur' && (
            <div>
              {/* Toolbar Filter & Aksi Massal */}
              <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <input
                      type="text"
                      placeholder="Cari judul brosur..."
                      value={brosurSearch}
                      onChange={(e) => setBrosurSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                    <span className="text-[11px] font-semibold text-slate-500">Tahun:</span>
                    <select
                      value={filterTahunMulai}
                      onChange={(e) => setFilterTahunMulai(e.target.value)}
                      className="text-xs bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="">Semua</option>
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                    <span className="text-slate-400 text-xs">–</span>
                    <select
                      value={filterTahunAkhir}
                      onChange={(e) => setFilterTahunAkhir(e.target.value)}
                      className="text-xs bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="">Semua</option>
                      {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={filterExtractStatus}
                    onChange={(e) => setFilterExtractStatus(e.target.value as any)}
                    className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="all">Semua Status ({baseSearchBrosurs.length})</option>
                    <option value="belum">Belum Diekstrak ({pendingOnlyCount})</option>
                    <option value="berubah">Isi Berubah ({changedBrosursCount})</option>
                    <option value="sudah">Sudah Sinkron ({syncedBrosursCount})</option>
                  </select>
                </div>

                {/* Tombol Aksi Massal */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLihatHasilAnalisis}
                    disabled={filteredBrosurs.length === 0 || generating}
                    className="px-3 py-2 bg-white text-slate-700 border border-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    Lihat Hasil DB
                  </button>

                  <button
                    type="button"
                    onClick={handleMassGenerate}
                    disabled={generating || (selectedIds.size === 0 && needsActionCount === 0)}
                    className="px-3.5 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    {selectedIds.size > 0
                      ? `Ekstrak Terpilih (${selectedIds.size})`
                      : needsActionCount > 0
                      ? `Ekstrak Belum/Berubah (${needsActionCount})`
                      : 'Semua Sudah Sinkron'}
                  </button>
                </div>
              </div>

              {/* Info Pilihan Checkbox */}
              {selectedIds.size > 0 && (
                <div className="px-4 py-2 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
                  <span className="font-semibold">{selectedIds.size} brosur dipilih untuk diproses batch.</span>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-emerald-700 hover:underline font-bold cursor-pointer"
                  >
                    Bersihkan Pilihan
                  </button>
                </div>
              )}

              {/* Tabel Brosur */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 pl-4 pr-2 w-10">
                        <input
                          type="checkbox"
                          checked={allCurrentPageSelected}
                          onChange={toggleSelectAllPage}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          title="Pilih semua di halaman ini"
                        />
                      </th>
                      <th className="py-3 px-2 w-12 text-center">#</th>
                      <th className="py-3 px-3 w-20">Tahun</th>
                      <th className="py-3 px-3">Judul Brosur</th>
                      <th className="py-3 px-3 w-40 hidden md:table-cell">Koleksi</th>
                      <th className="py-3 px-3 w-28 text-center">Dalil di DB</th>
                      <th className="py-3 px-3 w-36 text-center">Status</th>
                      <th className="py-3 pl-3 pr-4 w-48 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-medium">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                          Memuat daftar brosur...
                        </td>
                      </tr>
                    ) : currentBrosurs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          Tidak ada brosur yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      currentBrosurs.map((bro, idx) => {
                        const rowNum = (currentPage - 1) * itemsPerPage + idx + 1;
                        const isChecked = selectedIds.has(bro.id);
                        return (
                          <tr
                            key={bro.id}
                            className={`transition-colors ${
                              isChecked ? 'bg-emerald-50/50' : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="py-3 pl-4 pr-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSelectOne(bro.id)}
                                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-3 px-2 text-center text-slate-400 font-mono text-[11px]">
                              {rowNum}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-700">
                              {bro.tahun}
                            </td>
                            <td className="py-3 px-3">
                              <p className="font-bold text-slate-900 line-clamp-1">{bro.judul}</p>
                              <p className="text-[11px] text-slate-400 md:hidden mt-0.5">
                                {bro.folders?.name || 'Koleksi'}
                              </p>
                            </td>
                            <td className="py-3 px-3 text-slate-500 hidden md:table-cell">
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium truncate max-w-[140px]">
                                {bro.folders?.name || 'Umum'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              {bro.dalilCount > 0 ? (
                                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                                  {bro.dalilCount} dalil
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium">0</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {bro.extractStatus === 'synced' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle className="w-3 h-3" />
                                  Sinkron
                                </span>
                              ) : bro.extractStatus === 'needs_update' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <AlertCircle className="w-3 h-3" />
                                  Isi Berubah
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  <Clock className="w-3 h-3" />
                                  Belum
                                </span>
                              )}
                            </td>
                            <td className="py-3 pl-3 pr-4 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                {bro.extractStatus === 'synced' ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleAutoGenerateFromBrosur(bro, false)}
                                      disabled={generating}
                                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      Lihat
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleAutoGenerateFromBrosur(bro, true)}
                                      disabled={generating}
                                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition inline-flex items-center gap-1 cursor-pointer"
                                      title="Generate ulang brosur ini"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                      Ulang
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAutoGenerateFromBrosur(bro, false)}
                                    disabled={generating}
                                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition inline-flex items-center gap-1 cursor-pointer shadow-xs"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {bro.extractStatus === 'needs_update' ? 'Perbarui' : 'Ekstrak'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Pagination Brosur */}
              <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span>
                    Menampilkan <strong className="text-slate-700">{filteredBrosurs.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredBrosurs.length)}</strong> dari <strong className="text-slate-700">{filteredBrosurs.length}</strong> brosur
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
          )}

          {/* ========================================================= */}
          {/* TAB 2: TABEL HASIL EKSTRAKSI & REVIEW                     */}
          {/* ========================================================= */}
          {activeTab === 'hasil' && (
            <div>
              {/* Toolbar Hasil Ekstraksi */}
              <div className="p-4 border-b border-slate-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">
                      {selectedBrosurForGen ? selectedBrosurForGen.judul : 'Belum Ada Brosur Dipilih'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Total <strong className="text-slate-700">{draftHadists.length}</strong> dalil •{' '}
                      <span className="text-emerald-700 font-semibold">{savedCount} di DB</span> •{' '}
                      <span className="text-amber-700 font-semibold">{unsavedCount} belum disimpan</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('brosur')}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                    >
                      ← Kembali ke Tabel Brosur
                    </button>

                    {selectedBrosurForGen?.id && isViewingDatabase && !generating && (
                      <button
                        type="button"
                        onClick={() => handleAutoGenerateFromBrosur(selectedBrosurForGen, true)}
                        className="px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Generate Ulang
                      </button>
                    )}

                    {draftHadists.length > 0 && !generating && !isViewingDatabase && (
                      <button
                        type="button"
                        onClick={handleSaveAllToDatabase}
                        className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Simpan Semua ({draftHadists.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Pill per Rawi */}
                {draftHadists.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Filter Rawi:</span>
                    <button
                      type="button"
                      onClick={() => { setFilterDraftRawi('Semua'); setDraftPage(1); }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-full border transition cursor-pointer ${
                        filterDraftRawi === 'Semua'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Semua ({draftHadists.length})
                    </button>
                    {sortedRawiStats.map(([r, count]) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => { setFilterDraftRawi(r); setDraftPage(1); }}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-full border transition cursor-pointer ${
                          filterDraftRawi === r
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

              {/* Tabel Hasil Ekstraksi */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 pl-4 pr-2 w-12 text-center">#</th>
                      <th className="py-3 px-3 w-44">Rawi &amp; Sitasi</th>
                      <th className="py-3 px-3 w-[34%]">Teks Arab</th>
                      <th className="py-3 px-3">Terjemahan &amp; Catatan</th>
                      <th className="py-3 px-3 w-28 text-center">Status</th>
                      <th className="py-3 pl-3 pr-4 w-28 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs align-top">
                    {!selectedBrosurForGen && !generating ? (
                      <tr>
                        <td colSpan={6} className="py-14 text-center text-slate-400">
                          Pilih brosur di tab <strong>Daftar Brosur</strong> atau klik <strong>Lihat Hasil DB</strong> terlebih dahulu.
                        </td>
                      </tr>
                    ) : draftHadists.length === 0 && !generating ? (
                      <tr>
                        <td colSpan={6} className="py-14 text-center text-slate-400">
                          {isViewingDatabase
                            ? 'Belum ada data ekstraksi tersimpan di database untuk filter ini.'
                            : 'Tidak ditemukan dalil Al-Qur\'an / Hadits pada brosur ini.'}
                        </td>
                      </tr>
                    ) : currentDrafts.length === 0 && !generating ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Tidak ada dalil untuk filter <strong>{filterDraftRawi}</strong>.
                        </td>
                      </tr>
                    ) : (
                      currentDrafts.map((draft, idx) => {
                        const rowNum = (draftPage - 1) * draftsPerPage + idx + 1;
                        const isEditing = editingDraftId === draft.id;
                        const brosurTitle = draft.brosur?.judul || brosurTitleMap.get(draft.brosur_id);
                        return (
                          <React.Fragment key={draft.id}>
                            <tr className={`transition-colors ${isEditing ? 'bg-amber-50/40' : 'hover:bg-slate-50/70'}`}>
                              <td className="py-3.5 pl-4 pr-2 text-center font-mono text-[11px] text-slate-400">
                                {rowNum}
                              </td>
                              <td className="py-3.5 px-3 space-y-1.5">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  {draft.rawi_kitab || 'Sumber Tidak Dikenal'}
                                </span>
                                {draft.perawi_sumber && (
                                  <p className="text-[11px] font-semibold text-slate-700 leading-snug">
                                    {draft.perawi_sumber}
                                  </p>
                                )}
                                {draft.rawi_teratas && (
                                  <p className="text-[10px] text-emerald-700 font-medium">
                                    Perawi: {draft.rawi_teratas}
                                  </p>
                                )}
                                {brosurTitle && !selectedBrosurForGen?.id && (
                                  <p className="text-[10px] text-slate-400 line-clamp-2 pt-1 border-t border-slate-100">
                                    {brosurTitle}
                                  </p>
                                )}
                              </td>
                              <td className="py-3.5 px-3">
                                {draft.kutipan_arab ? (
                                  <p className="arabic-text text-slate-900 text-base font-semibold leading-loose text-right">
                                    {draft.kutipan_arab}
                                  </p>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">(Tanpa teks Arab)</span>
                                )}
                              </td>
                              <td className="py-3.5 px-3 space-y-1.5">
                                {draft.terjemahan ? (
                                  <p className="text-xs text-slate-700 leading-relaxed">{draft.terjemahan}</p>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">(Tanpa terjemahan)</span>
                                )}
                                {draft.catatan && (
                                  <p className="text-[11px] text-slate-500 italic bg-slate-50 border border-slate-100 rounded-md px-2 py-1">
                                    Catatan: {draft.catatan}
                                  </p>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-center">
                                {isViewingDatabase ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle className="w-3 h-3" /> Di DB
                                  </span>
                                ) : (
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Draft
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 pl-3 pr-4 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingDraftId(isEditing ? null : draft.id)}
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer ${
                                      isEditing
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {isEditing ? <><Check className="w-3 h-3" /> Selesai</> : <><Edit3 className="w-3 h-3" /> Edit</>}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveDraft(draft.id)}
                                    title="Hapus dari daftar"
                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expanded Inline Editor Row */}
                            {isEditing && (
                              <tr className="bg-amber-50/30">
                                <td colSpan={6} className="p-4 border-t border-amber-100">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Rawi / Kitab</label>
                                        <input
                                          type="text"
                                          value={draft.rawi_kitab || ''}
                                          onChange={(e) => handleUpdateDraft(draft.id, 'rawi_kitab', e.target.value)}
                                          className="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500 outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Teks Arab</label>
                                        <textarea
                                          value={draft.kutipan_arab || ''}
                                          onChange={(e) => handleUpdateDraft(draft.id, 'kutipan_arab', e.target.value)}
                                          className="arabic-text w-full text-slate-800 text-sm font-semibold bg-white border border-slate-200 rounded-lg p-3 min-h-[90px] focus:ring-1 focus:ring-emerald-500 outline-none"
                                          dir="rtl"
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Terjemahan</label>
                                        <textarea
                                          value={draft.terjemahan || ''}
                                          onChange={(e) => handleUpdateDraft(draft.id, 'terjemahan', e.target.value)}
                                          className="w-full text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-3 min-h-[90px] focus:ring-1 focus:ring-emerald-500 outline-none"
                                        />
                                      </div>

                                      {/* Pencarian API Gading */}
                                      <div className="bg-indigo-50/70 border border-indigo-100 rounded-lg p-3">
                                        <label className="text-[10px] font-bold text-indigo-700 uppercase mb-1.5 flex items-center gap-1">
                                          <Search className="w-3 h-3" /> Tarik Referensi dari API Gading
                                        </label>
                                        <div className="flex gap-2">
                                          <select
                                            value={searchKitab}
                                            onChange={(e) => setSearchKitab(e.target.value)}
                                            className="text-xs bg-white border border-indigo-200 rounded-lg px-2 py-1.5 w-28"
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
                                            placeholder="No. Hadist..."
                                            value={searchNomor}
                                            onChange={(e) => setSearchNomor(e.target.value)}
                                            className="flex-1 text-xs bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5"
                                          />
                                          <button
                                            type="button"
                                            onClick={handleSearchExternalHadist}
                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 cursor-pointer"
                                          >
                                            {isSearchingApi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                                            Cari
                                          </button>
                                        </div>
                                        {searchResults.length > 0 && (
                                          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto bg-white border border-indigo-100 rounded-lg p-2">
                                            {searchResults.map((res, i) => (
                                              <div
                                                key={i}
                                                onClick={() => applySearchResult(draft.id, res)}
                                                className="p-2 hover:bg-indigo-50/50 rounded cursor-pointer transition"
                                              >
                                                <div className="flex justify-between items-center mb-1">
                                                  <span className="text-[10px] font-bold text-slate-600">{res.kitab}</span>
                                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Gunakan</span>
                                                </div>
                                                <p className="arabic-text text-xs text-right leading-loose">{res.arab}</p>
                                                <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">{res.terjemah}</p>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer Pagination Drafts */}
              {filteredDrafts.length > draftsPerPage && (
                <div className="p-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Menampilkan <strong className="text-slate-700">{(draftPage - 1) * draftsPerPage + 1}–{Math.min(draftPage * draftsPerPage, filteredDrafts.length)}</strong> dari <strong className="text-slate-700">{filteredDrafts.length}</strong> dalil
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDraftPage(p => Math.max(1, p - 1))}
                      disabled={draftPage === 1}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <span className="px-3 py-1.5 font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
                      {draftPage} / {totalDraftPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDraftPage(p => Math.min(totalDraftPages, p + 1))}
                      disabled={draftPage >= totalDraftPages}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
