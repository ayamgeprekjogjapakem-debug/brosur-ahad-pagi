'use client';

import React, { useEffect, useState, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EditKoleksiPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error || !data) {
        setErrorMsg('Koleksi tidak ditemukan.');
      } else {
        setName(data.name);
        setSlug(data.slug);
        setDescription(data.description || '');
      }
      setLoading(false);
    };
    
    fetchData();
  }, [id, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    if (!name || !slug) {
      setErrorMsg('Nama Koleksi dan Slug harus diisi.');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('folders').update({
      name,
      slug,
      description
    }).eq('id', id);

    if (error) {
      setErrorMsg(`Gagal menyimpan: ${error.message}`);
      setSaving(false);
    } else {
      router.push('/dashboard/data');
    }
  };

  if (loading) {
    return (
      <main className="p-12 w-full flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </main>
    );
  }

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
          <h1 className="text-3xl font-extrabold mb-1">Edit Master Koleksi</h1>
          <p className="text-zinc-500">Ubah nama atau deskripsi dari master koleksi ini.</p>
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
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-zinc-500 mb-2">Slug / URL</label>
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
            rows={4}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-sm custom-scrollbar resize-none"
          ></textarea>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={saving}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Simpan Perubahan
          </button>
        </div>
      </form>
    </main>
  );
}
