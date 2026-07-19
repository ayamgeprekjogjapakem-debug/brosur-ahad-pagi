'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CreateKoleksiPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const router = useRouter();
  const supabase = createClient();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (!name || !slug) {
      setErrorMsg('Nama Koleksi dan Slug harus diisi.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('folders').insert({
      name,
      slug,
      description
    });

    if (error) {
      setErrorMsg(`Gagal menyimpan: ${error.message}`);
      setLoading(false);
    } else {
      router.push('/dashboard/data');
    }
  };

  return (
    <main className="p-8 md:p-12 w-full max-w-2xl mx-auto">
      <header className="mb-10 flex items-center gap-4">
        <Link 
          href="/dashboard/data" 
          className="p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold mb-1">Buat Master Koleksi</h1>
          <p className="text-zinc-500">Buat kategori baru untuk mengelompokkan brosur.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-8 shadow-sm">
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl font-bold">
            {errorMsg}
          </div>
        )}

        <div className="mb-6">
          <label className="block text-sm font-bold text-zinc-500 mb-2">Nama Koleksi (Kategori)</label>
          <input 
            type="text" 
            required
            value={name}
            onChange={handleNameChange}
            placeholder="Contoh: Brosur Ahad Pagi"
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-zinc-500 mb-2">Slug / URL (Otomatis)</label>
          <input 
            type="text" 
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent font-mono text-sm"
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm font-bold text-zinc-500 mb-2">Deskripsi Singkat</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tuliskan keterangan singkat mengenai koleksi ini yang akan tampil di halaman utama..."
            rows={4}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm custom-scrollbar resize-none"
          ></textarea>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Simpan Koleksi
          </button>
        </div>
      </form>
    </main>
  );
}
