import React from 'react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-50/80  backdrop-blur-sm transition-all duration-500">
      <div className="relative flex items-center justify-center w-16 h-16">
        {/* Lingkaran dasar yang sangat tipis dan elegan */}
        <div className="absolute w-full h-full border-[1.5px] border-teal-500/10 rounded-full"></div>
        
        {/* Lingkaran berputar (spinner) dengan warna hijau toska tipis */}
        <div className="absolute w-full h-full border-[1.5px] border-transparent border-t-teal-500 rounded-full animate-spin" style={{ animationDuration: '1s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
      </div>
      <p className="mt-4 text-xs font-medium text-teal-600/70 tracking-widest uppercase animate-pulse">Memuat...</p>
    </div>
  );
}
