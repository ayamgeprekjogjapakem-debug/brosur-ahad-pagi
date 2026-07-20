'use client';

import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    // Kita biarkan tombol terus berputar (karena ini akan berpindah halaman)
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <form onSubmit={handleSearch} className="w-full max-w-2xl mx-auto relative mt-8">
      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-accent transition-colors">
          <Search size={22} />
        </div>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari tema, judul, atau isi brosur dari seluruh arsip..." 
          className="w-full bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-[20px] py-4 pl-14 pr-32 text-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent shadow-sm transition-all"
        />
        <button 
          type="submit"
          disabled={!query.trim() || isSearching}
          className="absolute inset-y-2 right-2 px-6 bg-accent text-white font-bold rounded-[14px] hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px]"
        >
          {isSearching ? <Loader2 className="animate-spin" size={20} /> : 'Cari'}
        </button>
      </div>
    </form>
  );
}
