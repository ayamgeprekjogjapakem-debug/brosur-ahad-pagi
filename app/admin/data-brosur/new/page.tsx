'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ArrowLeft, Save, FolderArchive, Sparkles, Calendar, Type, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import RichTextEditor from '@/app/admin/components/RichTextEditor';

function CreateBrosurForm() {
  const [judul, setJudul] = useState('');
  const [tahun, setTahun] = useState(new Date().getFullYear().toString());
  const [slug, setSlug] = useState('');
  const [konten, setKonten] = useState('');
  const [folderId, setFolderId] = useState('');
  
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsingLoading, setParsingLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const pdfFile = searchParams?.get('pdf');

  // Load Folder Kategori
  useEffect(() => {
    const fetchFolders = async () => {
      const { data } = await supabase.from('folders').select('id, name').order('name');
      if (data && data.length > 0) {
        setFolders(data);
        setFolderId(data[0].id);
      }
    };
    fetchFolders();
  }, [supabase]);

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

  const handleTahunChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            <input
              type="number"
              required
              value={tahun}
              onChange={handleTahunChange}
              placeholder="2026"
              className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 outline-none focus:bg-white focus:border-emerald-500 transition font-medium"
            />
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
