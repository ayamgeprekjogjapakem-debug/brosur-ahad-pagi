'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookMarked, Plus, Search, Trash2, Edit2, BookOpen, Quote, 
  AlertCircle, Copy, Check, ExternalLink, X, 
  Layers, Database, Tag, BookmarkCheck, RefreshCw, Loader2, FileText, ArrowRight,
  ChevronDown, Sparkles, UserCheck, Award, BookText, Filter, CheckCircle2, Clock, ShieldCheck
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

// SQL Schema V2 Lengkap untuk copy-paste interaktif di tombol Salin Script SQL
const SQL_SCHEMA_V2_TEXT = `-- ====================================================================
-- SCRIPT SQL V2: RIJALUL HADITS (SUNNAH.COM) & TAKHRIJ HADIST
-- ====================================================================

CREATE TABLE IF NOT EXISTS master_rawi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_rawi TEXT UNIQUE NOT NULL,
    nama_arab TEXT,
    kategori_rawi TEXT DEFAULT 'mukharij',
    thabaqat TEXT,
    kredibilitas TEXT DEFAULT 'Thiqah',
    biografi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE master_rawi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on master_rawi" ON master_rawi FOR SELECT TO public USING (true);
CREATE POLICY "Allow all access for authenticated on master_rawi" ON master_rawi FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS rawi_kitab TEXT;
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS juz TEXT;
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS halaman TEXT;
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS no_hadist TEXT;
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS rawi_teratas TEXT;
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS status_hadist TEXT DEFAULT 'terverifikasi';
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS catatan_analisis TEXT;
ALTER TABLE hadist_brosur ALTER COLUMN kelompok_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hadist_rawi_kitab ON hadist_brosur(rawi_kitab);
CREATE INDEX IF NOT EXISTS idx_hadist_status ON hadist_brosur(status_hadist);

INSERT INTO master_rawi (nama_rawi, nama_arab, kategori_rawi, thabaqat, kredibilitas, biografi)
VALUES
    ('Muslim', 'الإمام مسلم بن الحجاج النيسابوري', 'mukharij', 'Mukharij Abad 3 H (204 - 261 H)', 'Thiqah', 'Imam Muslim bin al-Hajjaj adalah penyusun kitab Shahih Muslim, kitab hadist paling shahih kedua setelah Shahih al-Bukhari.'),
    ('Bukhari', 'الإمام محمد بن إسماعيل البخاري', 'mukharij', 'Mukharij Abad 3 H (194 - 256 H)', 'Thiqah', 'Imam Muhammad bin Ismail al-Bukhari adalah Amirul Mukminin dalam ilmu hadist dan penyusun al-Jami as-Shahih (Shahih Bukhari).'),
    ('Tirmidzi', 'الإمام محمد بن عيسى الترمذي', 'mukharij', 'Mukharij Abad 3 H (209 - 279 H)', 'Thiqah', 'Imam at-Tirmidzi adalah murid terkemuka Imam Bukhari dan pengarang kitab Sunan at-Tirmidzi.'),
    ('Abu Dawud', 'الإمام سليمان بن الأشعث السجستاني', 'mukharij', 'Mukharij Abad 3 H (202 - 275 H)', 'Thiqah', 'Imam Abu Dawud adalah penyusun kitab Sunan Abu Dawud yang menghimpun hadist-hadist hukum ahkam.'),
    ('An-Nasa''i', 'الإمام أحمد بن شعيب النسائي', 'mukharij', 'Mukharij Abad 3 H (215 - 303 H)', 'Thiqah', 'Imam an-Nasa''i adalah penulis kitab as-Sunan al-Sughra (al-Mujtaba).'),
    ('Ibnu Majah', 'الإمام محمد بن يزيد ابن ماجه', 'mukharij', 'Mukharij Abad 3 H (209 - 273 H)', 'Thiqah', 'Imam Ibnu Majah al-Qazwini adalah penulis Sunan Ibnu Majah.'),
    ('Ahmad', 'الإمام أحمد بن محمد بن حنبل', 'mukharij', 'Mukharij Abad 3 H (164 - 241 H)', 'Thiqah', 'Imam Ahmad bin Hanbal adalah Imam Ahlus Sunnah wal Jamaah dan pengarang kitab al-Musnad.'),
    ('Malik', 'الإمام مالك بن أنس الأصبحي', 'mukharij', 'Mukharij Abad 2 H (93 - 179 H)', 'Thiqah', 'Imam Malik bin Anas adalah Imam Darul Hijrah dan pengarang kitab al-Muwaththa''.'),
    ('Ad-Darimi', 'الإمام عبد الله بن عبد الرحمن الدارمي', 'mukharij', 'Mukharij Abad 3 H (181 - 255 H)', 'Thiqah', 'Imam ad-Darimi adalah guru dari Imam Muslim dan pengarang kitab Sunan ad-Darimi.'),
    ('Anas bin Malik', 'أنس بن مالك الأنصاري', 'sahabat', 'Sahabat Nabi ﷺ', 'Shahabi', 'Anas bin Malik al-Ansari adalah pelayan Rasulullah ﷺ selama 10 tahun di Madinah dan meriwayatkan lebih dari 2.200 hadist.'),
    ('Abu Hurairah', 'أبو هريرة عبد الرحمن بن صخر الدوسي', 'sahabat', 'Sahabat Nabi ﷺ', 'Shahabi', 'Abu Hurairah r.a. adalah penghafal hadist terhebat di kalangan sahabat dengan riwayat terbanyak (lebih dari 5.300 hadist).'),
    ('Aisyah binti Abu Bakar', 'عائشة بنت أبي بكر الصديق', 'sahabat', 'Sahabat Nabi ﷺ', 'Shahabi', 'Ummul Mukminin Aisyah r.a. adalah istri tercinta Rasulullah ﷺ yang sangat alim dalam ilmu fikih dan hadist.'),
    ('al-Humaydi ''Abdullah bin az-Zubayr', 'الحميدي عبد الله بن الزبير', 'rijal_sanad', 'Mukharij / Guru Bukhari (Wafat 219 H)', 'Thiqah', 'Al-Humaydi Abdullah bin az-Zubair adalah imam besar di Makkah, guru utama Imam Bukhari dan penyusun Musnad al-Humaydi.')
ON CONFLICT (nama_rawi) DO NOTHING;`;

const badgeStyles: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
};

const badgeColorsList = [
  { value: 'emerald', label: 'Emerald Hijau', bg: 'bg-emerald-500' },
  { value: 'blue', label: 'Biru Laut', bg: 'bg-blue-500' },
  { value: 'amber', label: 'Amber Kuning', bg: 'bg-amber-500' },
  { value: 'purple', label: 'Ungu Unggul', bg: 'bg-purple-500' },
  { value: 'rose', label: 'Rose Merah', bg: 'bg-rose-500' },
  { value: 'cyan', label: 'Cyan Cerah', bg: 'bg-cyan-500' },
];

export default function PengelompokanHadistPage() {
  const [activeTab, setActiveTab] = useState<'rawi' | 'rijal' | 'generate' | 'kelompok' | 'brosur' | 'items'>('rawi');
  const [loading, setLoading] = useState(true);
  const [isTableNotFound, setIsTableNotFound] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Data Master
  const [kelompokList, setKelompokList] = useState<any[]>([]);
  const [rawiList, setRawiList] = useState<any[]>([]);
  const [rawiLoading, setRawiLoading] = useState(false);
  const [globalStats, setGlobalStats] = useState({ totalKelompok: 0, totalHadist: 0, totalBrosur: 0 });
  const [hadistItems, setHadistItems] = useState<any[]>([]);

  // State untuk Brosur (Mengolah Data dari dashboard/data?tab=brosur)
  const [brosurs, setBrosurs] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [brosurSearch, setBrosurSearch] = useState('');
  const [filterFolder, setFilterFolder] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [brosurLoading, setBrosurLoading] = useState(false);

  // Auto-Generate Hadist Mentah State
  const [selectedBrosurForGen, setSelectedBrosurForGen] = useState<any | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatingStatusText, setGeneratingStatusText] = useState('');
  const [generatedDrafts, setGeneratedDrafts] = useState<any[]>([]);
  const [savingDraftId, setSavingDraftId] = useState<string | null>(null);
  const [showMassGenModal, setShowMassGenModal] = useState(false);
  const [selectedMassYear, setSelectedMassYear] = useState('all');
  const [lastGenBrosurCount, setLastGenBrosurCount] = useState<number | null>(null);
  const [massProgress, setMassProgress] = useState<{ current: number; total: number; currentJudul: string } | null>(null);
  const [autoSaveToRawi, setAutoSaveToRawi] = useState(true);
  const cancelMassGenRef = useRef(false);

  // Profil Rijalul Hadits Modal (Sunnah.com Style)
  const [selectedRawiProfile, setSelectedRawiProfile] = useState<any | null>(null);
  const [rawiHadistHistory, setRawiHadistHistory] = useState<any[]>([]);
  const [showRawiModal, setShowRawiModal] = useState(false);
  const [editingRawi, setEditingRawi] = useState<any | null>(null);
  const [isActionDropdownOpen, setIsActionDropdownOpen] = useState(false);
  const [namaRawiForm, setNamaRawiForm] = useState('');
  const [namaArabForm, setNamaArabForm] = useState('');
  const [kategoriRawiForm, setKategoriRawiForm] = useState('mukharij');
  const [thabaqatForm, setThabaqatForm] = useState('');
  const [kredibilitasForm, setKredibilitasForm] = useState('Thiqah');
  const [biografiForm, setBiografiForm] = useState('');
  const [savingRawi, setSavingRawi] = useState(false);

  // Modal Kelompok (Buat / Edit)
  const [showKelompokModal, setShowKelompokModal] = useState(false);
  const [editingKelompok, setEditingKelompok] = useState<any | null>(null);
  const [namaKelompok, setNamaKelompok] = useState('');
  const [deskripsiKelompok, setDeskripsiKelompok] = useState('');
  const [warnaBadge, setWarnaBadge] = useState('emerald');
  const [savingKelompok, setSavingKelompok] = useState(false);

  // Brosur Hadist Studio (Drawer / Panel Ekstraksi Hadist)
  const [selectedBrosur, setSelectedBrosur] = useState<any | null>(null);
  const [brosurKonten, setBrosurKonten] = useState<string>('');
  const [loadingKonten, setLoadingKonten] = useState(false);
  const [selectedKelompokId, setSelectedKelompokId] = useState('');
  const [kutipanArab, setKutipanArab] = useState('');
  const [terjemahan, setTerjemahan] = useState('');
  const [perawiSumber, setPerawiSumber] = useState('');
  const [rawiKitabForm, setRawiKitabForm] = useState('Muslim');
  const [juzForm, setJuzForm] = useState('');
  const [halamanForm, setHalamanForm] = useState('');
  const [noHadistForm, setNoHadistForm] = useState('');
  const [rawiTeratasForm, setRawiTeratasForm] = useState('');
  const [catatan, setCatatan] = useState('');
  const [savingHadist, setSavingHadist] = useState(false);

  // Filter & Search di Tab Semua Hadist
  const [itemSearch, setItemSearch] = useState('');
  const [filterKelompokItem, setFilterKelompokItem] = useState('all');
  const [filterRawiItem, setFilterRawiItem] = useState('all');
  const [filterStatusItem, setFilterStatusItem] = useState('all');
  const [filterSumberJenis, setFilterSumberJenis] = useState<'all' | 'hadist' | 'quran'>('all');

  // Form input dalil QS vs HR
  const [sumberJenisForm, setSumberJenisForm] = useState<'hadist' | 'quran'>('hadist');
  const [namaSuratForm, setNamaSuratForm] = useState('');
  const [noAyatForm, setNoAyatForm] = useState('');

  // Modal Edit Hadist Item
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const supabase = createClient();

  // Load Data Master Kelompok & Global Stats
  const fetchKelompok = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hadist/kelompok');
      const data = await res.json();

      if (res.status === 404 && data.error === 'TABLE_NOT_FOUND') {
        setIsTableNotFound(true);
        setLoading(false);
        return;
      }

      if (res.ok) {
        setIsTableNotFound(false);
        setKelompokList(data.kelompok || []);
        if (data.globalStats) setGlobalStats(data.globalStats);
        if (data.kelompok?.length > 0 && !selectedKelompokId) {
          setSelectedKelompokId(data.kelompok[0].id);
        }
      }
    } catch (e) {
      console.error('Error fetching kelompok:', e);
    } finally {
      setLoading(false);
    }
  };

  // Load Data Master Rawi / Rijalul Hadits
  const fetchRawiList = async () => {
    setRawiLoading(true);
    try {
      const res = await fetch('/api/hadist/rawi');
      const data = await res.json();
      if (res.status === 404 && data.error === 'TABLE_NOT_FOUND') {
        setIsTableNotFound(true);
        return;
      }
      if (res.ok) {
        setRawiList(data.rawi || []);
      }
    } catch (e) {
      console.error('Error fetch rawi list:', e);
    } finally {
      setRawiLoading(false);
    }
  };

  // Load Data Semua Hadist
  const fetchHadistItems = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filterKelompokItem && filterKelompokItem !== 'all') {
        queryParams.set('kelompok_id', filterKelompokItem);
      }
      if (filterRawiItem && filterRawiItem !== 'all') {
        queryParams.set('rawi_kitab', filterRawiItem);
      }
      if (filterStatusItem && filterStatusItem !== 'all') {
        queryParams.set('status_hadist', filterStatusItem);
      }
      if (filterSumberJenis && filterSumberJenis !== 'all') {
        queryParams.set('sumber_jenis', filterSumberJenis);
      }
      if (itemSearch) {
        queryParams.set('search', itemSearch);
      }
      const res = await fetch(`/api/hadist/items?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setHadistItems(data.items || []);
      }
    } catch (e) {
      console.error('Error fetching hadist items:', e);
    }
  };

  // Load Data Brosur untuk Tab Jelajah Brosur
  const fetchBrosurs = async () => {
    setBrosurLoading(true);
    try {
      let query = supabase
        .from('brosur')
        .select('id, judul, tahun, slug, created_at, folder_id, folders(name), teks_bersih')
        .order('tahun', { ascending: false })
        .order('judul', { ascending: true })
        .limit(5000);

      if (brosurSearch) {
        query = query.ilike('judul', `%${brosurSearch}%`);
      }
      if (filterFolder) {
        query = query.eq('folder_id', filterFolder);
      }
      if (filterTahun) {
        query = query.eq('tahun', filterTahun);
      }

      const { data } = await query;
      setBrosurs(data || []);
    } catch (e) {
      console.error('Error fetch brosurs:', e);
    } finally {
      setBrosurLoading(false);
    }
  };

  // Load Data Folder / Koleksi & Tahun
  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folders-stats');
      const data = await res.json();
      if (data.folders) setFolders(data.folders);
    } catch (e) {
      console.error('Error fetch folders:', e);
    }
  };

  const fetchAvailableYears = async () => {
    const { data } = await supabase.from('brosur').select('tahun').order('tahun', { ascending: false }).limit(5000);
    if (data) {
      const years = Array.from(new Set(data.map((d: any) => d.tahun).filter(Boolean))) as number[];
      setAvailableYears(years);
    }
  };

  const changeTab = (tab: 'rawi' | 'rijal' | 'generate' | 'kelompok' | 'brosur' | 'items') => {
    setActiveTab(tab);
    window.history.pushState(null, '', `?tab=${tab}`);
  };

  useEffect(() => {
    // Sinkronisasi Tab dengan URL slug '?tab=...'
    const syncTabFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') as 'rawi' | 'rijal' | 'generate' | 'kelompok' | 'brosur' | 'items';
      if (tab && ['rawi', 'rijal', 'generate', 'kelompok', 'brosur', 'items'].includes(tab)) {
        setActiveTab(tab);
      }
    };

    syncTabFromUrl();
    window.addEventListener('popstate', syncTabFromUrl);
    return () => window.removeEventListener('popstate', syncTabFromUrl);
  }, []);

  useEffect(() => {
    fetchKelompok();
    fetchRawiList();
    fetchFolders();
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    if (activeTab === 'brosur' || activeTab === 'generate') {
      fetchBrosurs();
    } else if (activeTab === 'items') {
      fetchHadistItems();
    }
  }, [activeTab, filterKelompokItem, filterRawiItem, filterStatusItem, brosurSearch, filterFolder, filterTahun]);

  // Handle Copy SQL Schema
  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA_V2_TEXT);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Trigger Auto-Generate Hadist Mentah dari Brosur
  const handleAutoGenerateFromBrosur = async (brosur: any) => {
    setSelectedBrosurForGen(brosur);
    setGenerating(true);
    setGeneratedDrafts([]);
    setLastGenBrosurCount(null);

    try {
      const res = await fetch('/api/hadist/generate-from-brosur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brosur_id: brosur.id, auto_save: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setGeneratedDrafts(data.items || []);
        await fetchRawiList();
        await fetchHadistItems();
      } else {
        alert(data.error || 'Gagal generate hadist mentah.');
      }
    } catch (e) {
      console.error('Error auto generate:', e);
    } finally {
      setGenerating(false);
    }
  };

  // Trigger Mass Auto-Generate Hadist Mentah (Bertahap / Batch per 5 Brosur agar tidak Timeout)
  const handleMassGenerate = async (year: string) => {
    setShowMassGenModal(false);
    setSelectedBrosurForGen(null);
    setGenerating(true);
    setGeneratedDrafts([]);
    setLastGenBrosurCount(null);
    cancelMassGenRef.current = false;

    const yearText = year === 'all' ? 'Seluruh Tahun' : `Tahun ${year}`;
    setGeneratingStatusText(`Mengambil daftar brosur (${yearText})...`);
    setMassProgress(null);

    try {
      // 1. Ambil daftar metadata brosur terlebih dahulu (ringan, tanpa teks/HTML agar tidak timeout)
      const metaRes = await fetch('/api/hadist/generate-from-brosur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tahun: year === 'all' ? undefined : year,
          metadata_only: true,
        }),
      });

      const metaData = await metaRes.json();
      if (!metaRes.ok || !metaData.brosurs || metaData.brosurs.length === 0) {
        alert(metaData.error || 'Tidak ada brosur ditemukan untuk tahun yang dipilih.');
        setGenerating(false);
        return;
      }

      const brosurList = metaData.brosurs;
      const totalBrosur = brosurList.length;
      let accumulatedDrafts: any[] = [];
      const batchSize = 5; // Proses 5 brosur per batch agar load server/database sangat ringan

      for (let i = 0; i < totalBrosur; i += batchSize) {
        if (cancelMassGenRef.current) {
          console.log('Mass generate dibatalkan oleh user.');
          break;
        }

        const batch = brosurList.slice(i, i + batchSize);
        const batchIds = batch.map((b: any) => b.id);
        const firstJudul = batch[0]?.judul || 'Brosur';

        setMassProgress({
          current: Math.min(i + batch.length, totalBrosur),
          total: totalBrosur,
          currentJudul: firstJudul,
        });
        setGeneratingStatusText(`Memproses batch ${Math.floor(i / batchSize) + 1} (${Math.min(i + batch.length, totalBrosur)} dari ${totalBrosur} brosur)...`);

        const res = await fetch('/api/hadist/generate-from-brosur', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brosur_ids: batchIds,
            auto_save: true,
          }),
        });

        const data = await res.json();
        if (res.ok && data.items) {
          accumulatedDrafts = [...accumulatedDrafts, ...data.items];
          // Update draft sementara agar user langsung bisa melihat hasil yang bertambah
          setGeneratedDrafts([...accumulatedDrafts]);
        }

        // Delay singkat 150ms antar-batch agar tidak membebani trafik & CPU database
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      setLastGenBrosurCount(totalBrosur);

      // Langsung simpan aktif, perbarui statistik rijalul hadits dan buka tab rawi
      if (accumulatedDrafts.length > 0) {
        await fetchRawiList();
        await fetchHadistItems();
      }
    } catch (e) {
      console.error('Error mass generate:', e);
      alert('Terjadi kesalahan saat generate massal');
    } finally {
      setGenerating(false);
      setGeneratingStatusText('');
      setMassProgress(null);
    }
  };

  // Simpan Kartu Hadist Mentah ke Database (Verifikasi)
  const handleSaveDraftToDatabase = async (draft: any, status: 'terverifikasi' | 'mentah' = 'terverifikasi') => {
    setSavingDraftId(draft.id);
    try {
      const res = await fetch('/api/hadist/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelompok_id: draft.kelompok_id || (kelompokList[0]?.id || null),
          brosur_id: draft.brosur_id,
          kutipan_arab: draft.kutipan_arab,
          terjemahan: draft.terjemahan,
          perawi_sumber:
            draft.sumber_jenis === 'quran'
              ? `QS. ${draft.nama_surat || 'Al-Qur\'an'} : ${draft.no_ayat || ''}`
              : `HR. ${draft.rawi_kitab || 'Muslim'} juz ${draft.juz || '1'}, hal. ${draft.halaman || '1'}, no. ${draft.no_hadist || '-'}`,
          rawi_kitab: draft.rawi_kitab,
          juz: draft.juz,
          halaman: draft.halaman,
          no_hadist: draft.no_hadist,
          rawi_teratas: draft.rawi_teratas,
          status_hadist: status,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menyimpan hadist');
      } else {
        // Hapus dari daftar draft visual
        setGeneratedDrafts((prev) => prev.filter((item) => item.id !== draft.id));
        fetchRawiList();
        fetchKelompok();
      }
    } catch (e) {
      console.error('Error save draft:', e);
    } finally {
      setSavingDraftId(null);
    }
  };

  // Buka Profil Rijalul Hadits ala Sunnah.com
  const handleOpenRawiProfile = async (rawi: any) => {
    setSelectedRawiProfile(rawi);
    setRawiHadistHistory([]);
    try {
      const res = await fetch(`/api/hadist/items?rawi_kitab=${encodeURIComponent(rawi.nama_rawi)}`);
      const data = await res.json();
      if (res.ok) {
        setRawiHadistHistory(data.items || []);
      }
    } catch (e) {
      console.error('Error load rawi hadist history:', e);
    }
  };

  // Simpan / Update Rijalul Hadits
  const handleSaveRawiProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaRawiForm.trim()) return;
    setSavingRawi(true);

    try {
      const url = '/api/hadist/rawi';
      const method = editingRawi ? 'PUT' : 'POST';
      const payload = {
        id: editingRawi?.id,
        nama_rawi: namaRawiForm.trim(),
        nama_arab: namaArabForm.trim(),
        kategori_rawi: kategoriRawiForm,
        thabaqat: thabaqatForm.trim(),
        kredibilitas: kredibilitasForm,
        biografi: biografiForm.trim(),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowRawiModal(false);
        setEditingRawi(null);
        setNamaRawiForm('');
        setNamaArabForm('');
        setThabaqatForm('');
        setBiografiForm('');
        fetchRawiList();
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal menyimpan profil perawi.');
      }
    } catch (e) {
      console.error('Error save rawi:', e);
    } finally {
      setSavingRawi(false);
    }
  };

  // Buka Brosur Hadist Studio
  const handleOpenStudio = async (brosur: any) => {
    setSelectedBrosur(brosur);
    setLoadingKonten(true);
    setBrosurKonten('');
    setKutipanArab('');
    setTerjemahan('');
    setPerawiSumber('');
    setRawiKitabForm('Muslim');
    setJuzForm('');
    setHalamanForm('');
    setNoHadistForm('');
    setRawiTeratasForm('');
    setCatatan('');

    try {
      const { data } = await supabase
        .from('brosur')
        .select('konten, teks_bersih')
        .eq('id', brosur.id)
        .single();
      
      if (data) {
        setBrosurKonten(data.konten || data.teks_bersih || '<p>Konten tidak tersedia</p>');
      }
    } catch (e) {
      console.error('Error load brosur content:', e);
    } finally {
      setLoadingKonten(false);
    }

    fetchHadistFromBrosur(brosur.id);
  };

  const [brosurItemsHistory, setBrosurItemsHistory] = useState<any[]>([]);
  const fetchHadistFromBrosur = async (bId: string) => {
    try {
      const res = await fetch(`/api/hadist/items?brosur_id=${bId}`);
      const data = await res.json();
      if (res.ok) {
        setBrosurItemsHistory(data.items || []);
      }
    } catch (e) {
      console.error('Error load history:', e);
    }
  };

  // Simpan Hadist dari Studio
  const handleSaveHadistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKelompokId || !selectedBrosur || !kutipanArab.trim()) {
      alert('Tema Kelompok dan Kutipan Teks Arab wajib diisi.');
      return;
    }
    setSavingHadist(true);

    try {
      const res = await fetch('/api/hadist/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kelompok_id: selectedKelompokId,
          brosur_id: selectedBrosur.id,
          kutipan_arab: kutipanArab.trim(),
          terjemahan: terjemahan.trim(),
          perawi_sumber:
            perawiSumber.trim() ||
            (sumberJenisForm === 'quran'
              ? `QS. ${namaSuratForm || 'Al-Qur\'an'} : ${noAyatForm || ''}`
              : `HR. ${rawiKitabForm} juz ${juzForm || '1'}, hal. ${halamanForm || '1'}, no. ${noHadistForm || '-'}`),
          rawi_kitab: rawiKitabForm,
          juz: juzForm,
          halaman: halamanForm,
          no_hadist: noHadistForm,
          rawi_teratas: rawiTeratasForm,
          status_hadist: 'terverifikasi',
          catatan: catatan.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menyimpan hadist');
      } else {
        setKutipanArab('');
        setTerjemahan('');
        setPerawiSumber('');
        setJuzForm('');
        setHalamanForm('');
        setNoHadistForm('');
        setRawiTeratasForm('');
        setNamaSuratForm('');
        setNoAyatForm('');
        setSumberJenisForm('hadist');
        setRawiTeratasForm('');
        setCatatan('');
        fetchHadistFromBrosur(selectedBrosur.id);
        fetchKelompok();
        fetchRawiList();
        if (activeTab === 'items') fetchHadistItems();
      }
    } catch (e) {
      console.error('Error save hadist:', e);
    } finally {
      setSavingHadist(false);
    }
  };

  const handleDeleteHadistItem = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus kutipan hadist ini?')) return;
    try {
      const res = await fetch(`/api/hadist/items?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedBrosur) fetchHadistFromBrosur(selectedBrosur.id);
        if (activeTab === 'items') {
          setHadistItems(hadistItems.filter(item => item.id !== id));
        }
        fetchKelompok();
        fetchRawiList();
      }
    } catch (e) {
      console.error('Error delete item:', e);
    }
  };

  const handleResetAllHadist = async (type: 'all' | 'mentah') => {
    const confirmMsg =
      type === 'all'
        ? 'PERINGATAN SANGAT BERBAHAYA!\n\nApakah Anda YAKIN ingin menghapus SELURUH kutipan hadist & dalil yang tersimpan di arsip database?\n\nData yang dihapus tidak dapat dikembalikan.'
        : 'Yakin ingin menghapus SELURUH draft hadist mentah yang tersimpan di database?';
    if (!window.confirm(confirmMsg)) return;

    try {
      const param = type === 'all' ? 'reset_all=true' : 'status_hadist=mentah';
      const res = await fetch(`/api/hadist/items?${param}`, { method: 'DELETE' });
      if (res.ok) {
        alert(type === 'all' ? 'Seluruh data hadist di arsip berhasil dikosongkan.' : 'Seluruh draft hadist mentah berhasil dihapus.');
        setGeneratedDrafts([]);
        fetchHadistItems();
        fetchKelompok();
        fetchRawiList();
      } else {
        const data = await res.json();
        alert(`Gagal reset data: ${data.error}`);
      }
    } catch (e) {
      console.error('Error reset hadist:', e);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* HEADER BANNER WITH STATISTICS */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent/15 via-white dark:via-zinc-900 to-accent/5 p-6 md:p-8 border border-black/5 dark:border-white/5 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent font-extrabold text-xs uppercase tracking-widest">
              <Sparkles size={14} />
              <span>Rijalul Hadits & Auto-Generate Parser</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
              Pengelompokan Hadist & Dalil
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
              Kelola, kelompokkan berdasarkan riwayat (rawi), dan otomatis generate hadist mentah dari arsip brosur dengan takhrij lengkap (Juz, Halaman, dan Nomor Hadist).
            </p>
          </div>

          <div className="relative">
            <button
              onClick={() => setIsActionDropdownOpen(!isActionDropdownOpen)}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-accent text-white font-extrabold text-sm shadow-lg shadow-accent/25 hover:bg-accent/90 active:scale-95 transition-all"
            >
              <Sparkles size={18} className="text-amber-300" />
              <span>Aksi Hadist</span>
              <ChevronDown size={16} className={`transition-transform duration-300 ${isActionDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isActionDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsActionDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-64 rounded-3xl bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 shadow-2xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3 py-2 border-b border-black/5 dark:border-white/5 mb-1.5">
                    <span className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-widest">
                      Tindakan & Kontrol
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setIsActionDropdownOpen(false);
                      setEditingRawi(null);
                      setNamaRawiForm('');
                      setNamaArabForm('');
                      setKategoriRawiForm(activeTab === 'rijal' ? 'sahabat' : 'mukharij');
                      setThabaqatForm('');
                      setKredibilitasForm('Thiqah');
                      setBiografiForm('');
                      setShowRawiModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left text-sm font-extrabold text-zinc-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <UserCheck size={18} className="text-accent" />
                    <span>+ Profil Rawi / Sahabat</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsActionDropdownOpen(false);
                      changeTab('generate');
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left text-sm font-extrabold text-zinc-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <Sparkles size={18} className="text-amber-500" />
                    <span>Auto-Generate Hadist</span>
                  </button>

                  <div className="my-1.5 border-t border-black/5 dark:border-white/5" />

                  <button
                    onClick={() => {
                      setIsActionDropdownOpen(false);
                      handleResetAllHadist('all');
                    }}
                    className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left text-sm font-extrabold text-red-600 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={18} />
                    <span>Reset All Arsip</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-black/5 dark:border-white/5">
          <div className="flex items-center gap-4 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-4 rounded-2xl border border-black/[0.03] dark:border-white/[0.03]">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Award size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Total Kitab & Rawi</p>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">{rawiList.length} Perawi</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-4 rounded-2xl border border-black/[0.03] dark:border-white/[0.03]">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Quote size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Hadist Terkelompokkan</p>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">{globalStats.totalHadist} Kutipan</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-4 rounded-2xl border border-black/[0.03] dark:border-white/[0.03]">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Database size={22} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">Brosur Sumber</p>
              <p className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">{globalStats.totalBrosur} Brosur</p>
            </div>
          </div>
        </div>
      </div>

      {/* ALERT BOX JIKA TABEL BELUM ADA DI SUPABASE */}
      {isTableNotFound && (
        <div className="p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-amber-500 text-white shrink-0">
              <AlertCircle size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-amber-900 dark:text-amber-200">
                Perlu Inisialisasi SQL Schema V2 (Rijalul Hadits & Takhrij)
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Agar fitur riwayat perawi ala Sunnah.com dan penomoran takhrij (Juz, Halaman, No) berfungsi penuh, silakan jalankan SQL Script berikut sekali saja di dalam <strong>Supabase SQL Editor</strong> Anda.
              </p>
            </div>
          </div>

          <div className="relative">
            <pre className="p-4 rounded-2xl bg-zinc-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-60 border border-white/10">
              {SQL_SCHEMA_V2_TEXT}
            </pre>
            <button
              onClick={handleCopySql}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-md transition-all"
            >
              {copiedSql ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedSql ? 'Disalin!' : 'Salin Script SQL V2'}</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => {
                fetchKelompok();
                fetchRawiList();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-all"
            >
              <RefreshCw size={16} />
              <span>Cek Ulang Database</span>
            </button>
          </div>
        </div>
      )}

      {/* TABS NAVIGATION (6 TABS) */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-black/5 dark:bg-white/5 rounded-2xl w-fit border border-black/5 dark:border-white/5">
        <button
          onClick={() => changeTab('rawi')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'rawi'
              ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Award size={17} />
          <span>Kitab Hadist (HR) ({rawiList.filter((rw) => rw.kategori_rawi === 'mukharij').length})</span>
        </button>

        <button
          onClick={() => changeTab('rijal')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'rijal'
              ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <UserCheck size={17} />
          <span>Rijalul Hadits (Sahabat) ({rawiList.filter((rw) => rw.kategori_rawi !== 'mukharij').length})</span>
        </button>

        <button
          onClick={() => changeTab('generate')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'generate'
              ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Sparkles size={17} />
          <span>⚡ Auto-Generate Hadist Mentah</span>
        </button>

        <button
          onClick={() => changeTab('kelompok')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'kelompok'
              ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Layers size={17} />
          <span>Tema & Kategori ({kelompokList.length})</span>
        </button>

        <button
          onClick={() => changeTab('brosur')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'brosur'
              ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <BookOpen size={17} />
          <span>Jelajah Brosur</span>
        </button>

        <button
          onClick={() => changeTab('items')}
          className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'items'
              ? 'bg-white dark:bg-zinc-800 text-accent shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          <Quote size={17} />
          <span>Semua Daftar Hadist</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KITAB HADIST (MUKHARIJ / HR & QS) */}
      {/* ========================================================================= */}
      {activeTab === 'rawi' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/70 dark:bg-zinc-900/70 p-6 rounded-3xl border border-black/5 dark:border-white/5">
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                Koleksi Kitab Hadist (Mukharij / HR)
              </h3>
              <p className="text-xs text-zinc-500">
                💡 Klik kitab hadist di bawah ini (misal: Shahih Muslim, Shahih Bukhari, Tirmidzi, dll.) untuk melihat seluruh dalil dari kitab/riwayat tersebut di arsip brosur.
              </p>
            </div>
          </div>

          {rawiLoading ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 bg-white/70 dark:bg-zinc-900/70 rounded-3xl border border-black/5 dark:border-white/5 gap-4">
              <Loader2 size={40} className="animate-spin text-accent" />
              <div className="text-center space-y-1">
                <p className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">
                  Sedang Mengambil Data Kitab Hadist...
                </p>
                <p className="text-xs text-zinc-500">
                  Menghitung statistik kitab hadist dan seluruh riwayat dalil di arsip
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rawiList
              .filter((rw) => rw.kategori_rawi === 'mukharij')
              .map((rw) => (
              <div
                key={rw.id}
                onClick={() => handleOpenRawiProfile(rw)}
                className="group cursor-pointer bg-white/80 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-900 p-6 rounded-3xl border border-black/[0.04] dark:border-white/[0.04] shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all duration-300 flex flex-col justify-between gap-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-full bg-accent/10 text-accent font-extrabold text-xs uppercase tracking-wider">
                      {rw.kredibilitas || 'Thiqah'}
                    </span>
                    <span className="text-xs font-bold text-zinc-400">
                      Kitab Utama (HR)
                    </span>
                  </div>

                  <div>
                    <h4 className="text-lg font-black text-zinc-900 dark:text-zinc-100 group-hover:text-accent transition-colors">
                      {rw.nama_rawi}
                    </h4>
                    {rw.nama_arab && (
                      <p className="font-serif text-base text-zinc-500 text-right" dir="rtl">
                        {rw.nama_arab}
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                    {rw.biografi || 'Belum ada catatan kitab untuk mukharij ini.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500">
                    <strong className="text-accent">{rw.total_hadist || 0}</strong> Hadist di Arsip
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-accent group-hover:underline">
                    <span>Lihat Hadist Kitab</span>
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB RIJALUL HADITS: SAHABAT NABI & PERAWI SANAD */}
      {/* ========================================================================= */}
      {activeTab === 'rijal' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/70 dark:bg-zinc-900/70 p-6 rounded-3xl border border-black/5 dark:border-white/5">
            <div className="space-y-1">
              <h3 className="font-extrabold text-base text-zinc-900 dark:text-zinc-100">
                Rijalul Hadits (Sahabat Nabi & Perawi Sanad)
              </h3>
              <p className="text-xs text-zinc-500">
                💡 Daftar profil sahabat dan perawi hadist (Al-Jarh wa At-Ta&apos;dil) yang menjadi sanad periwayatan dalil dalam brosur.
              </p>
            </div>
          </div>

          {rawiLoading ? (
            <div className="flex flex-col items-center justify-center py-20 px-6 bg-white/70 dark:bg-zinc-900/70 rounded-3xl border border-black/5 dark:border-white/5 gap-4">
              <Loader2 size={40} className="animate-spin text-accent" />
              <div className="text-center space-y-1">
                <p className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">
                  Sedang Mengambil Data Rijalul Hadits...
                </p>
                <p className="text-xs text-zinc-500">
                  Menghitung statistik perawi dan sahabat dari arsip brosur
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rawiList
                .filter((rw) => rw.kategori_rawi !== 'mukharij')
                .map((rw) => (
                  <div
                    key={rw.id}
                    onClick={() => handleOpenRawiProfile(rw)}
                    className="group cursor-pointer bg-white/80 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-900 p-6 rounded-3xl border border-black/[0.04] dark:border-white/[0.04] shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all duration-300 flex flex-col justify-between gap-6"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-3 py-1 rounded-full bg-accent/10 text-accent font-extrabold text-xs uppercase tracking-wider">
                          {rw.kredibilitas || 'Thiqah'}
                        </span>
                        <span className="text-xs font-bold text-zinc-400">
                          {rw.kategori_rawi === 'sahabat' ? 'Sahabat Nabi ﷺ' : 'Perawi Sanad'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-lg font-black text-zinc-900 dark:text-zinc-100 group-hover:text-accent transition-colors">
                          {rw.nama_rawi}
                        </h4>
                        {rw.nama_arab && (
                          <p className="font-serif text-base text-zinc-500 text-right" dir="rtl">
                            {rw.nama_arab}
                          </p>
                        )}
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                        {rw.biografi || 'Belum ada biografi rinci untuk perawi ini.'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-500">
                        <strong className="text-accent">{rw.total_hadist || 0}</strong> Hadist di Arsip
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-accent group-hover:underline">
                        <span>Lihat Biografi & Sanad</span>
                        <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUTO-GENERATE HADIST MENTAH DARI BROSUR */}
      {/* ========================================================================= */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-extrabold text-base">
                <Sparkles size={20} className="text-amber-500" />
                <span>⚡ Auto-Generate Hadist Mentah dari Brosur</span>
              </div>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                Sistem akan membaca teks brosur, mengenali pola Arab dan terjemahan, serta mendeteksi takhrij secara otomatis (Kitab Rawi, Juz, Halaman, Nomor Hadist, dan Rawi Teratas). Hasil deteksi akan muncul sebagai <strong>Hadist Mentah</strong> yang siap diverifikasi.
              </p>
            </div>

            <button
              onClick={() => setShowMassGenModal(true)}
              disabled={generating}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-lg shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Sparkles size={16} />
              <span>Generate Semua Brosur</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KOLOM KIRI: DAFTAR BROSUR UNTUK DIPILIH */}
            <div className="lg:col-span-1 space-y-4 bg-white/70 dark:bg-zinc-900/70 p-5 rounded-3xl border border-black/5 dark:border-white/5">
              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <BookOpen size={16} className="text-accent" />
                <span>1. Pilih Brosur Sumber</span>
              </h4>

              <input
                type="text"
                placeholder="Cari judul brosur..."
                value={brosurSearch}
                onChange={(e) => setBrosurSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {brosurLoading ? (
                  <div className="text-center py-10 text-xs text-zinc-400">Memuat brosur...</div>
                ) : (
                  brosurs.map((bro) => (
                    <div
                      key={bro.id}
                      onClick={() => handleAutoGenerateFromBrosur(bro)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        selectedBrosurForGen?.id === bro.id
                          ? 'border-accent bg-accent/10 text-zinc-900 dark:text-zinc-100'
                          : 'border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 font-bold mb-1">
                        <span>Tahun {bro.tahun}</span>
                        <span>{bro.folders?.name || 'Koleksi'}</span>
                      </div>
                      <p className="font-extrabold text-xs line-clamp-2">{bro.judul}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* KOLOM KANAN: HASIL AUTO-GENERATE (DRAFT REVIEW) */}
            <div className="lg:col-span-2 space-y-4">
              {generating ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 bg-white/70 dark:bg-zinc-900/70 rounded-3xl border border-black/5 dark:border-white/5 gap-5">
                  <div className="relative flex items-center justify-center">
                    <Loader2 size={48} className="animate-spin text-amber-500" />
                    <Sparkles size={20} className="absolute text-orange-500 animate-pulse" />
                  </div>
                  <div className="text-center space-y-2 max-w-md w-full">
                    <p className="font-extrabold text-base text-zinc-800 dark:text-zinc-200">
                      Sedang Memproses Auto-Generate...
                    </p>
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {generatingStatusText || 'Harap tunggu, sistem sedang membaca teks Arab dan terjemahan brosur...'}
                    </p>

                    {massProgress ? (
                      <div className="space-y-3 pt-3">
                        <div className="w-full h-3 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden p-0.5">
                          <div 
                            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.round((massProgress.current / massProgress.total) * 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-extrabold text-zinc-600 dark:text-zinc-300">
                          <span className="truncate max-w-[220px]">📖 {massProgress.currentJudul}</span>
                          <span>{Math.round((massProgress.current / massProgress.total) * 100)}% ({massProgress.current}/{massProgress.total})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { cancelMassGenRef.current = true; }}
                          className="mt-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-extrabold text-xs transition-colors shadow-sm"
                        >
                          ⏹ Hentikan Proses & Lihat Hasil Sementara
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-4">
                        <div className="w-full h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden p-0.5">
                          <div className="w-2/3 h-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 rounded-full animate-pulse" />
                        </div>
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-extrabold text-[11px] uppercase tracking-wider animate-pulse">
                          <Loader2 size={13} className="animate-spin" />
                          <span>Sedang Mengambil Daftar Brosur & Metadata dari Server...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : generatedDrafts.length === 0 ? (
                <div className="text-center py-20 bg-white/40 dark:bg-zinc-900/40 rounded-3xl border border-dashed border-black/10 dark:border-white/10 space-y-3 px-6">
                  {selectedBrosurForGen ? (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                        <AlertCircle size={24} />
                      </div>
                      <h4 className="font-extrabold text-base text-zinc-800 dark:text-zinc-200">
                        0 Hadist (HR) Terdeteksi dari Brosur Ini
                      </h4>
                      <p className="text-sm font-medium text-zinc-500 max-w-md mx-auto leading-relaxed">
                        Brosur &quot;{selectedBrosurForGen.judul}&quot; kemungkinan hanya berisi dalil ayat Al-Qur&apos;an (QS), sedangkan fitur ini khusus memfilter dalil yang memiliki keterangan riwayat Hadist (HR).
                      </p>
                    </>
                  ) : (
                    <>
                      <Sparkles size={36} className="mx-auto text-zinc-400" />
                      <p className="text-sm font-semibold text-zinc-500">
                        Pilih brosur di sebelah kiri atau klik &quot;Generate Semua Brosur&quot; untuk memindai otomatis.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-zinc-900/80 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">
                          Hasil Deteksi: {generatedDrafts.length} Dalil (QS / HR)
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          Siap Diverifikasi
                        </span>
                      </div>
                      {lastGenBrosurCount !== null && (
                        <p className="text-[11px] font-bold text-zinc-500">
                          ✨ Hasil ekstraksi massal dari <strong>{lastGenBrosurCount} brosur</strong> {selectedMassYear === 'all' ? 'semua tahun' : `tahun ${selectedMassYear}`}.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={async () => {
                          setGenerating(true);
                          try {
                            for (const draft of generatedDrafts) {
                              await fetch('/api/hadist/items', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  kelompok_id: draft.kelompok_id || (kelompokList[0]?.id || null),
                                  brosur_id: draft.brosur_id,
                                  kutipan_arab: draft.kutipan_arab,
                                  terjemahan: draft.terjemahan,
                                  perawi_sumber:
                                    draft.sumber_jenis === 'quran'
                                      ? `QS. ${draft.nama_surat || 'Al-Qur\'an'} : ${draft.no_ayat || ''}`
                                      : `HR. ${draft.rawi_kitab || 'Muslim'} juz ${draft.juz || '1'}, hal. ${draft.halaman || '1'}, no. ${draft.no_hadist || '-'}`,
                                  rawi_kitab: draft.rawi_kitab,
                                  juz: draft.juz,
                                  halaman: draft.halaman,
                                  no_hadist: draft.no_hadist,
                                  rawi_teratas: draft.rawi_teratas,
                                  status_hadist: 'mentah',
                                }),
                              });
                            }
                            setGeneratedDrafts([]);
                            await fetchRawiList();
                            await fetchHadistItems();
                            changeTab('rawi');
                          } catch (e) {
                            console.error(e);
                            alert('Gagal simpan massal');
                          } finally {
                            setGenerating(false);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-xs font-extrabold text-white transition-all shadow-sm"
                      >
                        <Database size={13} />
                        <span>Simpan Semua ke DB & Buka Kitab Rawi</span>
                      </button>
                      <button
                        onClick={() => setGeneratedDrafts([])}
                        className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-colors"
                      >
                        Reset Hasil
                      </button>
                      <button
                        onClick={() => handleResetAllHadist('mentah')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white font-bold text-xs transition-all"
                      >
                        <Trash2 size={13} />
                        <span>Hapus Semua Mentah di DB</span>
                      </button>
                    </div>
                  </div>

                  {generatedDrafts.map((draft, idx) => (
                    <div
                      key={draft.id || idx}
                      className="bg-white/90 dark:bg-zinc-900/90 p-6 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm space-y-4"
                    >
                      {/* BADGES TAKHRIJ */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/5 dark:border-white/5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {draft.sumber_jenis === 'quran' ? (
                            <>
                              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-extrabold text-xs">
                                📖 QS. {draft.nama_surat || 'Al-Qur\'an'}
                              </span>
                              {draft.no_ayat && (
                                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs">
                                  Ayat {draft.no_ayat}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="px-3 py-1 rounded-full bg-accent/10 text-accent font-extrabold text-xs">
                                📜 HR. {draft.rawi_kitab || 'Muslim'}
                              </span>
                              {draft.juz && (
                                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 font-bold text-xs">
                                  Juz {draft.juz}
                                </span>
                              )}
                              {draft.halaman && (
                                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 font-bold text-xs">
                                  Hal {draft.halaman}
                                </span>
                              )}
                              {draft.no_hadist && (
                                <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 font-bold text-xs">
                                  No. {draft.no_hadist}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveDraftToDatabase(draft, 'terverifikasi')}
                            disabled={savingDraftId === draft.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all"
                          >
                            {savingDraftId === draft.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 size={14} />
                                <span>Verifikasi & Simpan</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* TEKS ARAB */}
                      <p className="font-serif text-right text-xl md:text-2xl leading-loose text-zinc-900 dark:text-zinc-100 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02]" dir="rtl">
                        {draft.kutipan_arab}
                      </p>

                      {/* TERJEMAHAN */}
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        &ldquo;{draft.terjemahan}&rdquo;
                      </p>

                      {/* FORMAT TAKHRIJ & SUMBER BROSUR */}
                      <div className="text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>
                            {draft.sumber_jenis === 'quran'
                              ? `[ QS. ${draft.nama_surat || 'Al-Qur\'an'} : ${draft.no_ayat || ''} ]`
                              : `[ HR. ${draft.rawi_kitab || 'Muslim'} juz ${draft.juz || '1'}, hal. ${draft.halaman || '1'}, no. ${draft.no_hadist || '-'} ]`}
                          </span>
                          {draft.rawi_teratas && draft.sumber_jenis !== 'quran' && (
                            <span className="text-accent font-extrabold">Sahabat: {draft.rawi_teratas}</span>
                          )}
                        </div>
                        {draft.brosur_judul && (
                          <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <BookOpen size={12} className="text-amber-500" />
                            <span>Sumber: {draft.brosur_judul} ({draft.brosur_tahun})</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TEMA & KATEGORI HADIST */}
      {/* ========================================================================= */}
      {activeTab === 'kelompok' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {kelompokList.map((kel) => {
              const bStyle = badgeStyles[kel.warna_badge] || badgeStyles.emerald;
              return (
                <div
                  key={kel.id}
                  className="group bg-white/70 dark:bg-zinc-900/70 hover:bg-white dark:hover:bg-zinc-900 backdrop-blur-xl p-6 rounded-3xl border border-black/[0.04] dark:border-white/[0.04] shadow-sm hover:shadow-xl hover:shadow-black/5 transition-all duration-300 flex flex-col justify-between gap-6"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${bStyle}`}>
                        <Tag size={12} />
                        <span>Tema Hadist</span>
                      </span>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingKelompok(kel);
                            setNamaKelompok(kel.nama_kelompok);
                            setDeskripsiKelompok(kel.deskripsi || '');
                            setWarnaBadge(kel.warna_badge || 'emerald');
                            setShowKelompokModal(true);
                          }}
                          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 group-hover:text-accent transition-colors">
                      {kel.nama_kelompok}
                    </h3>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {kel.deskripsi || 'Tidak ada deskripsi.'}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      <span>{kel.stats?.totalHadist || 0} Hadist</span>
                      <span>•</span>
                      <span>{kel.stats?.totalBrosur || 0} Brosur</span>
                    </div>

                    <button
                      onClick={() => {
                        setFilterKelompokItem(kel.id);
                        changeTab('items');
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline"
                    >
                      <span>Lihat Semua</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: JELAJAH BROSUR & STUDIO MANUAL */}
      {/* ========================================================================= */}
      {activeTab === 'brosur' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-black/5 dark:border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Cari judul brosur..."
                  value={brosurSearch}
                  onChange={(e) => setBrosurSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filterFolder}
                  onChange={(e) => setFilterFolder(e.target.value)}
                  className="px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none"
                >
                  <option value="">Semua Koleksi</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>

                <select
                  value={filterTahun}
                  onChange={(e) => setFilterTahun(e.target.value)}
                  className="px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none"
                >
                  <option value="">Semua Tahun</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>Tahun {yr}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {brosurs.map((bro) => (
              <div
                key={bro.id}
                className="bg-white/80 dark:bg-zinc-900/80 hover:bg-white dark:hover:bg-zinc-900 p-5 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] shadow-sm flex items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 font-extrabold text-[11px]">
                      {bro.tahun}
                    </span>
                    {bro.folders?.name && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-accent/10 text-accent font-extrabold text-[11px] truncate">
                        {bro.folders.name}
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {bro.judul}
                  </h4>
                  <p className="text-xs text-zinc-500 truncate">ID: {bro.id}</p>
                </div>

                <button
                  onClick={() => handleOpenStudio(bro)}
                  className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-bold text-xs shadow-md shadow-accent/20 hover:bg-accent/90 transition-all"
                >
                  <Quote size={14} />
                  <span>Kelola Hadist</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SEMUA DAFTAR HADIST YANG TERKELOMPOKKAN & TAKHRIJ */}
      {/* ========================================================================= */}
      {activeTab === 'items' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white/70 dark:bg-zinc-900/70 border border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Cari kutipan Arab, terjemahan, atau perawi..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchHadistItems()}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterSumberJenis}
                onChange={(e) => setFilterSumberJenis(e.target.value as any)}
                className="px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="all">Semua Jenis (QS & HR)</option>
                <option value="quran">📖 Ayat Al-Qur&apos;an (QS)</option>
                <option value="hadist">📜 Hadist (HR)</option>
              </select>

              <select
                value={filterRawiItem}
                onChange={(e) => setFilterRawiItem(e.target.value)}
                className="px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="all">Semua Kitab Rawi</option>
                <option value="Muslim">HR. Muslim</option>
                <option value="Bukhari">HR. Bukhari</option>
                <option value="Tirmidzi">HR. Tirmidzi</option>
                <option value="Abu Dawud">HR. Abu Dawud</option>
                <option value="An-Nasa'i">HR. An-Nasa&apos;i</option>
                <option value="Ibnu Majah">HR. Ibnu Majah</option>
                <option value="Ahmad">HR. Ahmad</option>
                <option value="Malik">HR. Malik</option>
              </select>

              <select
                value={filterKelompokItem}
                onChange={(e) => setFilterKelompokItem(e.target.value)}
                className="px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="all">Semua Tema</option>
                {kelompokList.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama_kelompok}</option>
                ))}
              </select>

              <button
                onClick={() => handleResetAllHadist('all')}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white font-bold text-xs transition-all shrink-0"
                title="Hapus seluruh data hadist dari arsip"
              >
                <Trash2 size={15} />
                <span>Reset All</span>
              </button>
            </div>
          </div>

          {hadistItems.length === 0 ? (
            <div className="text-center py-20 bg-white/40 dark:bg-zinc-900/40 rounded-3xl border border-dashed border-black/10 dark:border-white/10 space-y-3">
              <Quote size={40} className="mx-auto text-zinc-400" />
              <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                Belum ada kutipan hadist yang tersimpan.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {hadistItems.map((item) => {
                const bStyle =
                  badgeStyles[item.kelompok_hadist?.warna_badge || 'emerald'] || badgeStyles.emerald;
                const isQuran = item.sumber_jenis === 'quran' || item.nama_surat;
                const takhrijStr = isQuran
                  ? `QS. ${item.nama_surat || 'Al-Qur\'an'} : ${item.no_ayat || ''}`
                  : item.rawi_kitab || item.juz || item.halaman || item.no_hadist
                    ? `HR. ${item.rawi_kitab || 'Muslim'} juz ${item.juz || '-'}, hal. ${item.halaman || '-'}, no. ${item.no_hadist || '-'}`
                    : item.perawi_sumber || 'Riwayat Hadist';

                return (
                  <div
                    key={item.id}
                    className="bg-white/80 dark:bg-zinc-900/80 p-6 rounded-3xl border border-black/[0.04] dark:border-white/[0.04] shadow-sm space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${bStyle}`}>
                          {item.kelompok_hadist?.nama_kelompok || 'Tanpa Tema'}
                        </span>

                        {isQuran ? (
                          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-extrabold">
                            📖 QS. {item.nama_surat || 'Al-Qur\'an'} {item.no_ayat ? `ayat ${item.no_ayat}` : ''}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-extrabold">
                            {item.rawi_kitab ? `HR. ${item.rawi_kitab}` : 'Hadist'}
                          </span>
                        )}

                        {item.status_hadist === 'mentah' && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[11px] font-bold">
                            Mentah / Draft
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {item.brosur && (
                          <Link
                            href={`/dashboard/data/edit/${item.brosur.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-xs font-extrabold text-amber-700 dark:text-amber-300 transition-colors"
                            target="_blank"
                          >
                            <BookOpen size={12} className="text-amber-500" />
                            <span>Sumber: {item.brosur.judul} ({item.brosur.tahun})</span>
                            <ExternalLink size={11} className="opacity-70" />
                          </Link>
                        )}
                        <Link
                          href={`/dashboard/hadist/analisis/${item.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent font-bold text-xs transition-colors"
                        >
                          <Sparkles size={14} />
                          <span>Analisis</span>
                        </Link>
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteHadistItem(item.id)}
                          className="p-2 rounded-xl hover:bg-red-500/10 text-zinc-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* TEKS ARAB */}
                    <p
                      className="text-right font-serif text-xl md:text-2xl leading-loose text-zinc-900 dark:text-zinc-100 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5"
                      dir="rtl"
                    >
                      {item.kutipan_arab}
                    </p>

                    {/* TERJEMAHAN */}
                    {item.terjemahan && (
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        &ldquo;{item.terjemahan}&rdquo;
                      </p>
                    )}

                    {/* TAKHRIJ INFO BOX (FORMAT USER REQUEST) */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      <span>[ {takhrijStr} ]</span>
                      {item.rawi_teratas && (
                        <span className="text-accent font-extrabold">
                          Sahabat: {item.rawi_teratas}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PROFIL RIJALUL HADITS (ALA SUNNAH.COM) */}
      {/* ========================================================================= */}
      {selectedRawiProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="px-3 py-1 rounded-full bg-accent/10 text-accent font-extrabold text-xs">
                  {selectedRawiProfile.kredibilitas || 'Thiqah'} • {selectedRawiProfile.thabaqat || 'Ulama Hadist'}
                </span>
                <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100">
                  {selectedRawiProfile.nama_rawi}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRawiProfile(null)}
                className="p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {selectedRawiProfile.nama_arab && (
                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-right font-serif text-2xl text-zinc-900 dark:text-zinc-100" dir="rtl">
                  {selectedRawiProfile.nama_arab}
                </div>
              )}

              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  {selectedRawiProfile.kategori_rawi === 'mukharij'
                    ? 'Catatan Kitab & Penulis'
                    : 'Biografi & Ilmu Rijalul Hadits'}
                </h4>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {selectedRawiProfile.biografi || 'Belum ada catatan biografi untuk perawi ini.'}
                </p>
              </div>

              {/* DAFTAR HADIST DARI RIWAYAT KITAB / PERAWI INI DI DALAM ARSIP BROSUR */}
              <div className="space-y-3 pt-4 border-t border-black/5 dark:border-white/5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  {selectedRawiProfile.kategori_rawi === 'mukharij'
                    ? `Daftar Hadist Riwayat Kitab Ini (${rawiHadistHistory.length})`
                    : `Daftar Hadist Diriwayatkan Oleh Tokoh Ini (${rawiHadistHistory.length})`}
                </h4>

                {rawiHadistHistory.length === 0 ? (
                  <p className="text-xs text-zinc-500">Belum ada kutipan hadist yang tersimpan dari riwayat ini.</p>
                ) : (
                  <div className="space-y-3">
                    {rawiHadistHistory.map((item) => (
                      <div key={item.id} className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-zinc-500">
                          <span className="text-accent">HR. {item.rawi_kitab || 'Muslim'}</span>
                          <span>Juz {item.juz || '-'} • Hal {item.halaman || '-'} • No {item.no_hadist || '-'}</span>
                        </div>
                        <p className="font-serif text-right text-base text-zinc-900 dark:text-zinc-100" dir="rtl">
                          {item.kutipan_arab}
                        </p>
                        {item.terjemahan && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                            {item.terjemahan}
                          </p>
                        )}
                        {item.brosur && (
                          <div className="pt-2.5 mt-1 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs font-bold">
                            <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                              <BookOpen size={13} className="text-amber-500" />
                              <span>Sumber Brosur: {item.brosur.judul} ({item.brosur.tahun})</span>
                            </span>
                            <Link
                              href={`/dashboard/data/edit/${item.brosur.id}`}
                              target="_blank"
                              className="text-accent hover:underline flex items-center gap-1 shrink-0 ml-2"
                            >
                              <span>Buka Brosur ↗</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL KONFIRMASI GENERATE MASSAL BERDASARKAN TAHUN */}
      {/* ========================================================================= */}
      {showMassGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100">
                    Auto-Generate Semua Hadist
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Ekstraksi otomatis dalil dari seluruh brosur di arsip
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMassGenModal(false)}
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Pilih cakupan tahun brosur yang ingin dipindai. Sistem akan secara otomatis mendeteksi ayat Al-Qur&apos;an (QS) dan Hadist (HR) beserta takhrijnya untuk siap diverifikasi.
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {brosurLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3.5 bg-black/5 dark:bg-white/5 rounded-2xl">
                    <Loader2 size={32} className="animate-spin text-amber-500" />
                    <div className="text-center space-y-1">
                      <p className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">
                        Sedang Mengambil Data Brosur...
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Harap tunggu, menghitung jumlah brosur per tahun di server
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Opsi Semua Tahun */}
                    <div
                      onClick={() => setSelectedMassYear('all')}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedMassYear === 'all'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-extrabold'
                      : 'border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-semibold'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">🌟</span>
                    <div>
                      <div className="text-xs font-extrabold">Semua Tahun (Seluruh Brosur)</div>
                      <div className="text-[11px] opacity-70">Pindai seluruh arsip brosur tanpa kecuali</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-black/10 dark:bg-white/10 text-xs font-extrabold">
                    {brosurs.length} Brosur
                  </span>
                </div>

                {/* Daftar Tahun yang Tersedia */}
                {availableYears.map((yr) => {
                  const countInYear = brosurs.filter((b) => String(b.tahun) === String(yr)).length;
                  return (
                    <div
                      key={yr}
                      onClick={() => setSelectedMassYear(String(yr))}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedMassYear === String(yr)
                          ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-extrabold'
                          : 'border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base">📅</span>
                        <div>
                          <div className="text-xs font-extrabold">Tahun {yr}</div>
                          <div className="text-[11px] opacity-70">Khusus brosur terbitan tahun {yr}</div>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-black/10 dark:bg-white/10 text-xs font-extrabold">
                        {countInYear} Brosur
                      </span>
                    </div>
                  );
                })}
                  </>
                )}
              </div>
            </div>

            <div className="px-6 pb-3">
              <label className="flex items-center gap-3 cursor-pointer p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                <input
                  type="checkbox"
                  checked={autoSaveToRawi}
                  onChange={(e) => setAutoSaveToRawi(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
                <div className="text-xs font-bold leading-snug">
                  <div>⚡ Langsung Simpan ke Database & Otomatis Buka Tab Rijalul Hadits</div>
                  <div className="text-[11px] font-normal opacity-85">
                    Hadist/QS otomatis masuk ke kitab rawinya (Muslim, Bukhari, Tirmidzi, dll.) di Tab 1
                  </div>
                </div>
              </label>
            </div>

            <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-t border-black/5 dark:border-white/5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowMassGenModal(false)}
                className="px-5 py-2.5 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 font-bold text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleMassGenerate(selectedMassYear)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-lg shadow-amber-500/25 transition-all hover:scale-105"
              >
                <Sparkles size={16} />
                <span>Mulai Generate Massal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL BUAT / EDIT PROFIL RAWI */}
      {/* ========================================================================= */}
      {showRawiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-zinc-900 dark:text-zinc-100">
                {editingRawi ? 'Edit Profil Perawi' : 'Tambah Profil Perawi Baru'}
              </h3>
              <button onClick={() => setShowRawiModal(false)} className="p-2 rounded-xl text-zinc-500">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRawiProfile} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-zinc-500">
                    Nama Rawi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="misal: Muslim"
                    value={namaRawiForm}
                    onChange={(e) => setNamaRawiForm(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-zinc-500">Nama Arab</label>
                  <input
                    type="text"
                    placeholder="misal: الإمام مسلم"
                    value={namaArabForm}
                    onChange={(e) => setNamaArabForm(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm font-serif text-right text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase text-zinc-500">Kategori Tokoh / Kitab</label>
                <select
                  value={kategoriRawiForm}
                  onChange={(e) => setKategoriRawiForm(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="mukharij">Kitab Hadist / Mukharij (HR)</option>
                  <option value="sahabat">Rijalul Hadits / Sahabat Nabi</option>
                  <option value="tabiin">Rijalul Hadits / Tabi&apos;in</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-zinc-500">Generasi / Thabaqat</label>
                  <input
                    type="text"
                    placeholder="misal: Mukharij Abad 3 H"
                    value={thabaqatForm}
                    onChange={(e) => setThabaqatForm(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold uppercase text-zinc-500">Jarh wa Ta&apos;dil</label>
                  <select
                    value={kredibilitasForm}
                    onChange={(e) => setKredibilitasForm(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                  >
                    <option value="Thiqah">Thiqah (Sangat Terpercaya)</option>
                    <option value="Shaduq">Shaduq (Jujur)</option>
                    <option value="Shahabi">Shahabi (Sahabat Nabi ﷺ)</option>
                    <option value="Dha'if">Dha&apos;if (Lemah)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase text-zinc-500">Biografi Singkat</label>
                <textarea
                  rows={3}
                  placeholder="Sejarah hidup perawi, guru, dan kitab karangannya..."
                  value={biografiForm}
                  onChange={(e) => setBiografiForm(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowRawiModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-zinc-500"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingRawi}
                  className="px-6 py-2.5 rounded-xl bg-accent text-white font-bold text-sm shadow-md shadow-accent/20 hover:bg-accent/90"
                >
                  Simpan Rawi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BROSUR HADIST STUDIO (DRAWER / PANEL EKSTRAKSI HADIST DARI BROSUR) */}
      {/* ========================================================================= */}
      {selectedBrosur && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 h-full flex flex-col border-l border-black/10 dark:border-white/10 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-md bg-accent/10 text-accent text-xs font-extrabold">
                  Tahun {selectedBrosur.tahun}
                </span>
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
                  {selectedBrosur.judul}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBrosur(null)}
                className="p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 text-zinc-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
              <div className="p-6 overflow-y-auto border-r border-black/5 dark:border-white/5 space-y-4">
                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  Teks Brosur Sumber
                </span>
                {loadingKonten ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-400">
                    <Loader2 size={24} className="animate-spin" />
                    <p className="text-xs font-semibold">Memuat isi brosur...</p>
                  </div>
                ) : (
                  <div 
                    className="reader-content prose dark:prose-invert max-w-none text-sm leading-relaxed p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 selection:bg-accent/20"
                    dangerouslySetInnerHTML={{ __html: brosurKonten }}
                  />
                )}
              </div>

              <div className="p-6 overflow-y-auto space-y-6 bg-zinc-50/50 dark:bg-zinc-950/50">
                <form onSubmit={handleSaveHadistItem} className="space-y-4 bg-white dark:bg-zinc-900 p-5 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm">
                  <h4 className="font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Plus size={16} className="text-accent" />
                    <span>Tambahkan Hadist (Takhrij Lengkap)</span>
                  </h4>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
                      Tema Hadist <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedKelompokId}
                      onChange={(e) => setSelectedKelompokId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      required
                    >
                      <option value="">-- Pilih Tema --</option>
                      {kelompokList.map((k) => (
                        <option key={k.id} value={k.id}>{k.nama_kelompok}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
                      Kutipan Teks Arab <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="عَنْ اَنَسِ بْنِ مَالِكٍ قَالَ..."
                      value={kutipanArab}
                      onChange={(e) => setKutipanArab(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-base font-serif text-right text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-zinc-500">
                      Terjemahan / Penjelasan
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Dari Anas bin Maalik, ia berkata..."
                      value={terjemahan}
                      onChange={(e) => setTerjemahan(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                  </div>

                  {/* PILIH JENIS DALIL (HADIST HR vs QURAN QS) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-zinc-500">Jenis Dalil / Kutipan</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSumberJenisForm('hadist')}
                        className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                          sumberJenisForm === 'hadist'
                            ? 'bg-accent text-white border-accent'
                            : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-transparent'
                        }`}
                      >
                        📜 Hadist (HR)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSumberJenisForm('quran')}
                        className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all ${
                          sumberJenisForm === 'quran'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 border-transparent'
                        }`}
                      >
                        📖 Ayat Al-Qur&apos;an (QS)
                      </button>
                    </div>
                  </div>

                  {sumberJenisForm === 'quran' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-zinc-500">Nama Surat</label>
                        <input
                          type="text"
                          placeholder="misal: Al-Baqarah"
                          value={namaSuratForm}
                          onChange={(e) => setNamaSuratForm(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase text-zinc-500">No. Ayat</label>
                        <input
                          type="text"
                          placeholder="misal: 152"
                          value={noAyatForm}
                          onChange={(e) => setNoAyatForm(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-center text-zinc-900 dark:text-zinc-100 focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* TAKHRIJ FORM: Kitab Rawi, Juz, Halaman, Nomor */}
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-zinc-500">Kitab Rawi</label>
                          <select
                            value={rawiKitabForm}
                            onChange={(e) => setRawiKitabForm(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                          >
                            <option value="Muslim">HR. Muslim</option>
                            <option value="Bukhari">HR. Bukhari</option>
                            <option value="Tirmidzi">HR. Tirmidzi</option>
                            <option value="Abu Dawud">HR. Abu Dawud</option>
                            <option value="An-Nasa'i">HR. An-Nasa&apos;i</option>
                            <option value="Ibnu Majah">HR. Ibnu Majah</option>
                            <option value="Ahmad">HR. Ahmad</option>
                            <option value="Malik">HR. Malik</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-zinc-500">Juz</label>
                          <input
                            type="text"
                            placeholder="1"
                            value={juzForm}
                            onChange={(e) => setJuzForm(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-center text-zinc-900 dark:text-zinc-100 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-zinc-500">Hal</label>
                          <input
                            type="text"
                            placeholder="227"
                            value={halamanForm}
                            onChange={(e) => setHalamanForm(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-center text-zinc-900 dark:text-zinc-100 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-zinc-500">No. Hadist</label>
                          <input
                            type="text"
                            placeholder="70"
                            value={noHadistForm}
                            onChange={(e) => setNoHadistForm(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase text-zinc-500">Rawi Teratas (Sahabat)</label>
                          <input
                            type="text"
                            placeholder="misal: Anas bin Malik"
                            value={rawiTeratasForm}
                            onChange={(e) => setRawiTeratasForm(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={savingHadist}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-accent text-white font-extrabold text-sm shadow-md shadow-accent/20 hover:bg-accent/90 transition-all"
                  >
                    <BookmarkCheck size={18} />
                    <span>Simpan Hadist Takhrij</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
