'use client';

import React, { useEffect, useState, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  Loader2, ArrowLeft, Save, FolderArchive, Sparkles, 
  Calendar, Type, Link as LinkIcon, CheckCircle2, ArrowUpRight, Trash2, ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import RichTextEditor from '@/app/admin/components/RichTextEditor';

export default function AdminEditBrosurPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const currentYear = new Date().getFullYear();
  const [judul, setJudul] = useState('');
  const [tahun, setTahun] = useState('');
  const [slug, setSlug] = useState('');
  const [konten, setKonten] = useState('');
  const [folderId, setFolderId] = useState('');

  const [folders, setFolders] = useState<any[]>([]);
  const [availableYears, setAvailableYears] = useState<number[]>(() => {
    const list: number[] = [];
    for (let y = currentYear + 1; y >= 1995; y--) {
      list.push(y);
    }
    return list;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch Folders
      const { data: folderData } = await supabase
        .from('folders')
        .select('id, name')
        .order('name');
      if (folderData) setFolders(folderData);

      // 2. Fetch Available Years
      try {
        let allYears = new Set<number>();
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data: yData, error: yErr } = await supabase
            .from('brosur')
            .select('tahun')
            .not('tahun', 'is', null)
            .range(from, from + step - 1);

          if (yErr || !yData || yData.length === 0) {
            hasMore = false;
          } else {
            yData.forEach((d: any) => {
              if (d.tahun) allYears.add(d.tahun);
            });
            if (yData.length < step) {
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

        const sorted = Array.from(allYears).sort((a, b) => b - a);
        setAvailableYears(sorted);
      } catch (err) {
        console.error('Error fetching years in edit form:', err);
      }

      // 3. Fetch Brosur Data
      const { data, error } = await supabase
        .from('brosur')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        setErrorMsg('Data brosur tidak ditemukan atau telah dihapus.');
      } else {
        setJudul(data.judul || '');
        const loadedTahun = data.tahun?.toString() || '';
        setTahun(loadedTahun);
        if (loadedTahun) {
          const numTahun = parseInt(loadedTahun, 10);
          if (!isNaN(numTahun)) {
            setAvailableYears(prev => Array.from(new Set([...prev, numTahun])).sort((a, b) => b - a));
          }
        }
        setSlug(data.slug || '');
        setKonten(data.konten || '');
        setFolderId(data.folder_id || '');
      }
      setLoading(false);
    };

    fetchData();
  }, [id, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    if (!judul.trim() || !tahun.trim() || !slug.trim() || !konten.trim() || !folderId) {
      setErrorMsg('Semua kolom (termasuk koleksi tematik dan isi brosur) wajib diisi.');
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('brosur')
      .update({
        judul: judul.trim(),
        tahun: parseInt(tahun, 10),
        slug: slug.trim(),
        konten: konten.trim(),
        folder_id: folderId
      })
      .eq('id', id);

    if (error) {
      setErrorMsg(`Gagal menyimpan perubahan: ${error.message}`);
      setSaving(false);
    } else {
      router.push(`/admin/data-brosur?success=updated&title=${encodeURIComponent(judul.trim())}`);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Hapus brosur "${judul}" secara permanen?`)) return;
    setDeleting(true);
    try {
      await supabase.from('brosur_chunks').delete().eq('brosur_id', id);
      const { error } = await supabase.from('brosur').delete().eq('id', id);
      if (error) throw error;
      router.push(`/admin/data-brosur?success=deleted&title=${encodeURIComponent(judul.trim())}`);
    } catch (err: any) {
      alert(`Gagal menghapus brosur: ${err.message}`);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-emerald-600" size={24} />
        <p className="text-xs text-zinc-400 font-medium">Memuat data brosur...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      
      {/* Top Header Clean Gemini */}
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
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                Sunting Brosur
              </h1>
              <span className="text-[11px] font-mono text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">
                ID: {id.slice(0, 8)}
              </span>
            </div>
            <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">
              Perbarui judul, metadata tahun, kategori koleksi, dan konten teks brosur.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Link
            href={`/bap/${tahun || '2026'}/${slug || id}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-zinc-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition"
            title="Buka brosur di tab baru"
          >
            <span>Pratinjau Publik</span>
            <ArrowUpRight size={14} />
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || deleting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            <span>Simpan Perubahan</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200/80 text-red-700 rounded-xl text-xs font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-500 hover:text-red-800">×</button>
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
                onChange={(e) => setTahun(e.target.value)}
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
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Judul brosur..."
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
            <span className="text-[11px] text-zinc-400">Pengenal unik URL tautan brosur</span>
          </div>
          <input
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full bg-[#FAFAFA] border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-xs text-zinc-800 font-mono outline-none focus:bg-white focus:border-emerald-500 transition"
          />
          <p className="text-[11px] text-zinc-400">
            Tautan publik saat ini: <code className="bg-zinc-100 px-1 py-0.5 rounded text-zinc-600">/bap/{tahun}/{slug}</code>
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

        {/* Bottom Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-zinc-100">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 active:bg-red-100 transition disabled:opacity-50"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            <span>Hapus Brosur Ini</span>
          </button>

          <div className="flex items-center justify-end gap-2.5">
            <Link
              href="/admin/data-brosur"
              className="px-4 py-2.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition text-center"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={saving || deleting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shadow-sm"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>

      </form>

    </div>
  );
}
