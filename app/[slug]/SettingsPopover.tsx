'use client';

import React, { useState } from 'react';
import { Settings2, X, Type } from 'lucide-react';
import { useSettings } from '../SettingsContext';

export default function SettingsPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    latinFontSize, setLatinFontSize,
    arabicFontSize, setArabicFontSize,
    latinFontFamily, setLatinFontFamily,
    arabicFontFamily, setArabicFontFamily 
  } = useSettings();

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-3 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        title="Pengaturan Font"
      >
        <Settings2 size={20} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Popover */}
          <div className="absolute right-0 top-14 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl shadow-black/10 border border-black/5 dark:border-white/10 p-5 z-50 flex flex-col gap-6 animate-in slide-in-from-top-2 fade-in duration-200">
            
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Type size={18} className="text-accent" />
                Tampilan Teks
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
                <X size={18} />
              </button>
            </div>

            {/* Latin Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Teks Latin</span>
                <span className="text-xs bg-black/5 dark:bg-white/10 px-2 py-1 rounded text-zinc-500">{latinFontSize}px</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setLatinFontSize(Math.max(12, latinFontSize - 2))} className="flex-1 py-1 bg-black/5 dark:bg-white/5 rounded hover:bg-black/10 dark:hover:bg-white/10">-</button>
                <input 
                  type="range" 
                  min="12" max="32" step="2" 
                  value={latinFontSize} 
                  onChange={(e) => setLatinFontSize(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <button onClick={() => setLatinFontSize(Math.min(32, latinFontSize + 2))} className="flex-1 py-1 bg-black/5 dark:bg-white/5 rounded hover:bg-black/10 dark:hover:bg-white/10">+</button>
              </div>
              <div className="flex gap-2 text-sm">
                <button 
                  onClick={() => setLatinFontFamily('sans-serif')}
                  className={`flex-1 py-1.5 rounded border transition-colors ${latinFontFamily === 'sans-serif' ? 'border-accent text-accent bg-accent/5' : 'border-zinc-200 dark:border-zinc-800'}`}
                >Modern</button>
                <button 
                  onClick={() => setLatinFontFamily('serif')}
                  className={`flex-1 py-1.5 rounded border transition-colors ${latinFontFamily === 'serif' ? 'border-accent text-accent bg-accent/5' : 'border-zinc-200 dark:border-zinc-800'}`}
                >Klasik</button>
              </div>
            </div>

            <hr className="border-black/5 dark:border-white/10" />

            {/* Arabic Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Teks Arab</span>
                <span className="text-xs bg-black/5 dark:bg-white/10 px-2 py-1 rounded text-zinc-500">{arabicFontSize}px</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setArabicFontSize(Math.max(16, arabicFontSize - 2))} className="flex-1 py-1 bg-black/5 dark:bg-white/5 rounded hover:bg-black/10 dark:hover:bg-white/10">-</button>
                <input 
                  type="range" 
                  min="16" max="48" step="2" 
                  value={arabicFontSize} 
                  onChange={(e) => setArabicFontSize(Number(e.target.value))}
                  className="flex-1 accent-accent"
                />
                <button onClick={() => setArabicFontSize(Math.min(48, arabicFontSize + 2))} className="flex-1 py-1 bg-black/5 dark:bg-white/5 rounded hover:bg-black/10 dark:hover:bg-white/10">+</button>
              </div>
              <div className="flex gap-2 text-sm">
                <button 
                  onClick={() => setArabicFontFamily('amiri')}
                  className={`flex-1 py-1.5 rounded border transition-colors font-serif ${arabicFontFamily === 'amiri' ? 'border-accent text-accent bg-accent/5' : 'border-zinc-200 dark:border-zinc-800'}`}
                >Amiri</button>
                <button 
                  onClick={() => setArabicFontFamily('trad-arabic')}
                  className={`flex-1 py-1.5 rounded border transition-colors font-serif ${arabicFontFamily === 'trad-arabic' ? 'border-accent text-accent bg-accent/5' : 'border-zinc-200 dark:border-zinc-800'}`}
                >Traditional</button>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
