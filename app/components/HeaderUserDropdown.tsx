'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LogOut, UserCircle2, ShieldAlert } from 'lucide-react';

export default function HeaderUserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChangeAccess = () => {
    if (confirm('Apakah Anda yakin ingin mengganti kode akses? Anda akan diminta untuk memasukkan kode baru.')) {
      localStorage.removeItem('mta_premium_access');
      localStorage.removeItem('mta_premium_role');
      localStorage.removeItem('mta_premium_features');
      window.location.href = '/';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white border border-slate-200 py-1.5 pl-4 pr-1.5 rounded-full shadow-sm hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
      >
        <span className="text-xs font-semibold text-slate-600 hidden sm:inline-block">Guru Daerah MTA</span>
        <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] font-bold">
          GD
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-slate-100 mb-2">
            <p className="text-sm font-bold text-slate-800">Guru Daerah MTA</p>
            <p className="text-xs text-slate-500 truncate">Hak Akses Tersimpan</p>
          </div>
          
          <button 
            onClick={handleChangeAccess}
            className="w-full text-left px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors flex items-center gap-2"
          >
            <ShieldAlert className="w-4 h-4" />
            Ubah / Hapus Kode Akses
          </button>
        </div>
      )}
    </div>
  );
}
