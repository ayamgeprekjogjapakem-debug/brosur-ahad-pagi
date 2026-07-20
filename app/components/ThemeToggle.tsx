'use client';

import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Cek apakah class 'dark' sudah ada di html tag saat load
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const isCurrentlyDark = html.classList.contains('dark');
    const newTheme = isCurrentlyDark ? 'light' : 'dark';
    
    if (newTheme === 'dark') {
      html.classList.add('dark');
      setIsDark(true);
    } else {
      html.classList.remove('dark');
      setIsDark(false);
    }

    // Simpan di cookie dengan masa berlaku 1 tahun (365 hari)
    document.cookie = `theme=${newTheme}; path=/; max-age=${365 * 24 * 60 * 60}`;
  };

  return (
    <button
      onClick={toggleTheme}
      className="fixed left-4 bottom-8 md:bottom-12 z-50 p-3.5 rounded-full shadow-xl shadow-black/10 backdrop-blur-md bg-white/80 dark:bg-zinc-800/80 border border-black/5 dark:border-white/10 text-zinc-600 dark:text-zinc-300 hover:scale-110 active:scale-95 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group"
      aria-label="Toggle Theme"
      title="Ubah Mode Gelap/Terang"
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        <Sun 
          className={`absolute transition-all duration-500 ${
            isDark ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
          } group-hover:text-amber-500`} 
        />
        <Moon 
          className={`absolute transition-all duration-500 ${
            isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
          } group-hover:text-blue-400`} 
        />
      </div>
    </button>
  );
}
