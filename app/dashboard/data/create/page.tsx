'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ArrowLeft, Save, FolderArchive } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function CreateBrosurForm() {
  const [judul, setJudul] = useState('');
  const [tahun, setTahun] = useState(new Date().getFullYear().toString());
  const [slug, setSlug] = useState('');
  const [konten, setKonten] = useState('');
  const [folderId, setFolderId] = useState('');
  
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const router = useRouter();
  const supabase = createClient();
  
  const searchParams = useSearchParams();
  const pdfFile = searchParams?.get('pdf');

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
      
      const { data: publicUrlData } = supabase.storage.from('chm-uploads').getPublicUrl(pdfFile);
      setKonten('Sedang memparsing teks dari PDF... Mohon tunggu.');
      
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
        }
      };
      
      parsePdf();
    }
  }, [pdfFile, supabase]);

  useEffect(() => {
    const fetchFolders = async () => {
      const { data } = await supabase.from('folders').select('id, name').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setFolders(data);
        setFolderId(data[0].id); // Default to first folder
      }
    };
    fetchFolders();
  }, [supabase]);

  // Auto-generate slug dari judul
  const handleJudulChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setJudul(val);
    
    // Format slug: BAP-(Brosur-Ahad-Pagi)-[tahun]-[judul]
    const cleanJudul = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const currentYear = tahun || new Date().getFullYear();
    setSlug(`BAP-(Brosur-Ahad-Pagi)-${currentYear}-${cleanJudul}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!judul || !tahun || !slug || !konten || !folderId) {
      setErrorMsg('Semua kolom (termasuk koleksi) harus diisi.');
      setLoading(false);
      return;
    }

    // Generate unique ID since this is manual
    const id = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const { error } = await supabase.from('brosur').insert({
      id,
      judul,
      tahun: parseInt(tahun, 10),
      slug,
      konten,
      folder_id: folderId
    });

    if (error) {
      setErrorMsg(`Gagal menyimpan: ${error.message}`);
      setLoading(false);
    } else {
      router.push('/dashboard/data');
    }
  };

  return (
    <main className="p-8 md:p-12 w-full max-w-4xl mx-auto">
      <header className="mb-10 flex items-center gap-4">
        <Link 
          href="/dashboard/data" 
          className="p-3 bg-black/5  hover:bg-black/10  rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold mb-1">Tambah Brosur Baru</h1>
          <p className="text-zinc-500">Ketik brosur secara manual ke dalam sistem.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="bg-white  border border-black/5  rounded-3xl p-8 shadow-sm">
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl font-bold">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-bold text-zinc-500 mb-2">Tahun Terbit</label>
            <input 
              type="number" 
              required
              value={tahun}
              onChange={(e) => setTahun(e.target.value)}
              className="w-full bg-zinc-50  border border-zinc-200  rounded-xl py-3 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-zinc-500 mb-2">Judul Brosur</label>
            <input 
              type="text" 
              required
              value={judul}
              onChange={handleJudulChange}
              placeholder="Contoh: Keutamaan Shalat Subuh"
              className="w-full bg-zinc-50  border border-zinc-200  rounded-xl py-3 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-zinc-500 mb-2">Master Koleksi (Kategori)</label>
          <div className="relative">
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              required
              className="w-full bg-zinc-50  border border-zinc-200  rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent appearance-none cursor-pointer"
            >
              <option value="" disabled>-- Pilih Koleksi --</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <FolderArchive className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-zinc-500 mb-2">Slug / URL (Otomatis)</label>
          <input 
            type="text" 
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full bg-zinc-50  border border-zinc-200  rounded-xl py-3 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono text-sm"
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm font-bold text-zinc-500 mb-2">Konten HTML Brosur</label>
          <textarea 
            required
            value={konten}
            onChange={(e) => setKonten(e.target.value)}
            placeholder="<h1>Judul</h1><p>Isi teks...</p>"
            rows={15}
            className="w-full bg-zinc-50  border border-zinc-200  rounded-xl py-3 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono text-sm custom-scrollbar resize-y"
          ></textarea>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-accent text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Simpan Brosur
          </button>
        </div>
      </form>
    </main>
  );
}

export default function CreateBrosurPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-zinc-500">Memuat...</div>}>
      <CreateBrosurForm />
    </Suspense>
  );
}
