'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ArrowLeft, Save, FolderArchive, Sparkles, Calendar, Type, Link as LinkIcon, CheckCircle2, ChevronDown, BellRing } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import RichTextEditor from '@/app/admin/components/RichTextEditor';

function CreateBrosurForm() {
  const currentYear = new Date().getFullYear();
  const [judul, setJudul] = useState('');
  const [tahun, setTahun] = useState(currentYear.toString());
  const [slug, setSlug] = useState('');
  const [konten, setKonten] = useState('');
  const [folderId, setFolderId] = useState('');
  const [sendPushNotif, setSendPushNotif] = useState(true);
  
  const [folders, setFolders] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>(() => {
    const list: number[] = [];
    for (let y = currentYear + 1; y >= 1995; y--) {
      list.push(y);
    }
    return list;
  });
  const [loading, setLoading] = useState(false);
  const [parsingLoading, setParsingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const pdfFile = searchParams?.get('pdf');
  const qTahun = searchParams?.get('tahun');
  const qFolder = searchParams?.get('folder');

  // Pre-fill tahun dari URL search params jika ada
  useEffect(() => {
    if (qTahun && /^\d{4}$/.test(qTahun)) {
      setTahun(qTahun);
    }
  }, [qTahun]);

  // Load Daftar Kategori Tahun Terbit (dari brosur + system_settings)
  useEffect(() => {
    const fetchYears = async () => {
      try {
        let allYears = new Set<number>();
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from('brosur')
            .select('tahun')
            .not('tahun', 'is', null)
            .range(from, from + step - 1);

          if (error || !data || data.length === 0) {
            hasMore = false;
          } else {
            data.forEach((d: any) => {
              if (d.tahun) allYears.add(d.tahun);
            });
            if (data.length < step) {
              hasMore = false;
            } else {
              from += step;
            }
          }
        }

        try {
          const { data: customYearsSetting } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'custom_years')
            .single();

          if (customYearsSetting?.value) {
            const parsed = JSON.parse(customYearsSetting.value);
            if (Array.isArray(parsed)) {
              parsed.forEach((y: any) => {
                const num = parseInt(y, 10);
                if (!isNaN(num)) allYears.add(num);
              });
            }
          }
        } catch (e) {}

        const nowYear = new Date().getFullYear();
        allYears.add(nowYear);
        allYears.add(nowYear + 1);

        if (qTahun && /^\d{4}$/.test(qTahun)) {
          allYears.add(parseInt(qTahun, 10));
        }

        const sorted = Array.from(allYears).sort((a, b) => b - a);
        setAvailableYears(sorted);
      } catch (err) {
        console.error('Error fetching years in new form:', err);
      }
    };

    fetchYears();
  }, [supabase, qTahun]);

  // Load Folder Kategori
  useEffect(() => {
    const fetchFolders = async () => {
      const { data } = await supabase.from('folders').select('id, name').order('name');
      if (data && data.length > 0) {
        setFolders(data);
        if (qFolder && data.some((f: any) => f.id === qFolder)) {
          setFolderId(qFolder);
        } else {
          setFolderId(data[0].id);
        }
      }
    };
    fetchFolders();
  }, [supabase, qFolder]);

  // Handle PDF Parsing jika datang dari upload PDF
  useEffect(() => {
    if (pdfFile) {
      const baseName = pdfFile.replace(/\.pdf$/i, '');
      const yearMatch = baseName.match(/^(\d{4})/);
      
      let initialTahun = new Date().getFullYear().toString();
      if (yearMatch) {
        initialTahun = yearMatch[1];
        setTahun(initialTahun);
      }
      
      const parsedJudul = baseName.replace(/[-_]/g, ' ');
      setJudul(parsedJudul);
      
      const cleanJudul = parsedJudul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setSlug(`BAP-(Brosur-Ahad-Pagi)-${initialTahun}-${cleanJudul}`);
      
      setParsingLoading(true);
      const parsePdf = async () => {
        try {
          const res = await fetch('/api/parse-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: pdfFile })
          });
          const data = await res.json();
          if (res.ok && data.html) {
             setKonten(data.html);
          } else {
             setKonten(`<p>Gagal memparsing teks PDF: ${data?.error || 'Kesalahan server'}</p>`);
          }
        } catch (e: any) {
             setKonten(`<p>Error saat memparsing teks PDF: ${e?.message || 'Gagal terhubung ke server'}</p>`);
        } finally {
          setParsingLoading(false);
        }
      };
      
      parsePdf();
    }
  }, [pdfFile]);

  // Update slug otomatis saat judul atau tahun berubah kecuali jika diedit manual
  const handleJudulChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setJudul(val);
    
    if (!isSlugManuallyEdited) {
      const cleanJudul = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const currentYear = tahun || new Date().getFullYear().toString();
      setSlug(`BAP-(Brosur-Ahad-Pagi)-${currentYear}-${cleanJudul}`);
    }
  };

  const handleTahunChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const val = e.target.value;
    setTahun(val);
    
    if (!isSlugManuallyEdited && judul) {
      const cleanJudul = judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      setSlug(`BAP-(Brosur-Ahad-Pagi)-${val}-${cleanJudul}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!judul.trim() || !tahun.trim() || !slug.trim() || !konten.trim() || !folderId) {
      setErrorMsg('Semua kolom (termasuk kategori koleksi dan isi brosur) wajib diisi.');
      setLoading(false);
      return;
    }

    const id = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const { error } = await supabase.from('brosur').insert({
      id,
      judul: judul.trim(),
      tahun: parseInt(tahun, 10),
      slug: slug.trim(),
      konten: konten.trim(),
      folder_id: folderId
    });

    if (error) {
      setErrorMsg(`Gagal menyimpan brosur: ${error.message}`);
      setLoading(false);
    } else {
      // Kirim Push Notifikasi otomatis ke Flutter jika dicentang
      if (sendPushNotif) {
        try {
          await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetType: 'topic',
              target: 'semua_pengguna',
              title: `📖 Brosur Baru: ${judul.trim()}`,
              body: `Telah terbit edisi tahun ${tahun}. Ketuk untuk membaca materi brosur.`,
              screen: 'detail_brosur',
              slug: slug.trim(),
              itemId: id,
            }),
          });
        } catch (notifErr) {
          console.warn('Gagal memicu push notification:', notifErr);
        }
      }

      router.push(`/admin/data-brosur?success=created&title=${encodeURIComponent(judul.trim())}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      
      {/* Top Header Clean Ala Gemini */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/data-brosur"
            className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition"
            title="Kembali ke Data Brosur"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Tambah Brosur Baru
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">
              Input data edisi brosur Ahad Pagi lengkap menggunakan visual editor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Link
            href="/admin/data-brosur"
            className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition"
          >
            Batal
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || parsingLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            <span>Simpan Brosur</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200/80 text-red-700 rounded-xl text-xs font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-800">×</button>
        </div>
      )}

      {parsingLoading && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2.5">
          <Loader2 size={16} className="animate-spin text-emerald-600" />
          <span>Sedang mengekstrak teks isi dari berkas PDF ke editor, mohon tunggu sebentar...</span>
        </div>
      )}

      {/* Main Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Meta Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          {/* Tahun Terbit */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
              <Calendar size={13} className="text-zinc-400" />
              <span>Tahun Terbit</span>
            </label>
            <div className="relative">
              <select
                value={tahun}
                onChange={handleTahunChange}
                required
                className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:bg-white focus:border-emerald-500 transition appearance-none cursor-pointer font-medium"
              >
                <option value="" disabled>-- Pilih Tahun --</option>
                {availableYears.map(y => (
                  <option key={y} value={y.toString()}>
                    Tahun {y}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Master Koleksi / Kategori */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
              <FolderArchive size={13} className="text-zinc-400" />
              <span>Koleksi Tematik</span>
            </label>
            <div className="relative">
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                required
                className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:bg-white focus:border-emerald-500 transition appearance-none cursor-pointer font-medium"
              >
                <option value="" disabled>-- Pilih Koleksi --</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>

          {/* Judul Brosur */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
              <Type size={13} className="text-zinc-400" />
              <span>Judul Brosur</span>
            </label>
            <input
              type="text"
              required
              value={judul}
              onChange={handleJudulChange}
              placeholder="Contoh: Thaharah Ke-13 (Adab Bersuci)"
              className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:bg-white focus:border-emerald-500 transition font-medium"
            />
          </div>

        </div>

        {/* Slug URL */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
              <LinkIcon size={13} className="text-zinc-400" />
              <span>Slug / Alamat URL Publik</span>
            </label>
            <span className="text-[11px] text-zinc-400">Otomatis mengikuti judul & tahun</span>
          </div>
          <div className="relative">
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setIsSlugManuallyEdited(true);
              }}
              placeholder="BAP-(Brosur-Ahad-Pagi)-2026-judul-brosur"
              className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-xs text-zinc-800 font-mono outline-none focus:bg-white focus:border-emerald-500 transition"
            />
          </div>
          <p className="text-[11px] text-zinc-400">
            Format standar tautan: <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-600">/bap/{tahun || 'tahun'}/{slug || 'slug'}</code>
          </p>
        </div>

        {/* Rich Text Editor Konten Brosur */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
              <Sparkles size={13} className="text-emerald-600" />
              <span>Isi Brosur (Rich Text Editor)</span>
            </label>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 size={12} />
              <span>Mendukung Teks Arab & Visual Format</span>
            </div>
          </div>

          <RichTextEditor
            value={konten}
            onChange={(content) => setKonten(content)}
            placeholder="Tulis materi brosur, matan ayat hadits, dan terjemahan di sini..."
          />
        </div>

        {/* Checkbox Kirim Push Notifikasi ke Flutter */}
        <div className="flex items-start gap-3 p-4 bg-emerald-50/70 border border-emerald-100/90 rounded-2xl transition-all">
          <input
            type="checkbox"
            id="sendPushNotif"
            checked={sendPushNotif}
            onChange={(e) => setSendPushNotif(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
          />
          <label htmlFor="sendPushNotif" className="text-xs text-zinc-700 cursor-pointer select-none">
            <span className="font-bold text-emerald-950 flex items-center gap-1.5">
              <BellRing size={13} className="text-emerald-600" />
              Kirim Notifikasi Otomatis ke Aplikasi Jamaah (Flutter)
            </span>
            <span className="text-zinc-500 text-[11.5px] mt-0.5 block leading-relaxed">
              Otomatis kirim push notifikasi &quot;Brosur Baru&quot; ke smartphone jamaah. Notifikasi dapat diklik langsung membuka halaman detail brosur ini dan otomatis dinonaktifkan setelah dibaca.
            </span>
          </label>
        </div>

        {/* Bottom Action Button */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
          <Link
            href="/admin/data-brosur"
            className="px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={loading || parsingLoading}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            <span>Simpan Brosur</span>
          </button>
        </div>

      </form>

    </div>
  );
}

export default function AdminNewBrosurPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin text-emerald-600" />
        <span>Memuat formulir...</span>
      </div>
    }>
      <CreateBrosurForm />
    </Suspense>
  );
}
