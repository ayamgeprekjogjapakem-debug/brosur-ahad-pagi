'use client';

import React, { useState } from 'react';
import { Search, Loader2, Book, Library } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const searchType = pathname?.startsWith('/hadist') || pathname?.startsWith('/makstabah-hadist') ? 'hadist' : 'brosur';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    // Kita biarkan tombol terus berputar (karena ini akan berpindah halaman)
    if (searchType === 'brosur') {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    } else if (searchType === 'hadist') {
      router.push(`/makstabah-hadist?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative mt-8">
      {/* Tabs untuk Tipe Pencarian */}
      <div className="flex justify-center gap-2 mb-4">
        <Link
          href="/"
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            searchType === 'brosur' 
              ? 'bg-teal-600 text-white shadow-md' 
              : 'bg-white text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200'
          }`}
        >
          <Library size={16} />
          <span>Brosur MTA</span>
        </Link>
        <Link
          href="/hadist"
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            searchType === 'hadist' 
              ? 'bg-emerald-600 text-white shadow-md' 
              : 'bg-white text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 border border-zinc-200'
          }`}
        >
          <Book size={16} />
          <span>Hadist Shahih</span>
        </Link>
      </div>

      {/* Form Pencarian */}
      <form onSubmit={handleSearch} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-emerald-500 transition-colors">
          <Search size={22} />
        </div>
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchType === 'brosur' ? "Cari tema, judul, atau isi brosur dari seluruh arsip..." : "Cari kata kunci terjemahan atau lafaz arab hadist..."} 
          className="w-full bg-white  border border-black/10  rounded-[20px] py-4 pl-14 pr-32 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 shadow-sm transition-all"
        />
        <button 
          type="submit"
          disabled={!query.trim() || isSearching}
          className={`absolute inset-y-2 right-2 px-6 font-bold rounded-[14px] transition-colors disabled:opacity-50 flex items-center justify-center min-w-[100px] text-white ${
            searchType === 'brosur' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {isSearching ? <Loader2 className="animate-spin" size={20} /> : 'Cari'}
        </button>
      </form>
    </div>
  );
}
