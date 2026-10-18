'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Book, Search, UploadCloud, Folder, Cpu } from 'lucide-react';

export default function Hadist9ImamNavTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const navItems = [
    { name: 'Koleksi Hadist', href: '/dashboard/hadist9imam', icon: Book, tab: 'hadist_chm' },
    { name: 'Kategori Kitab', href: '/dashboard/hadist9imam?tab=folder', icon: Folder, tab: 'folder' },
    { name: 'Sinkronisasi AI', href: '/dashboard/hadist9imam?tab=vektor', icon: Cpu, tab: 'vektor' },
    { name: 'Cari Hadist', href: '/dashboard/hadist9imam/search', icon: Search },
    { name: 'Upload Kitab CHM', href: '/dashboard/hadist9imam/upload', icon: UploadCloud },
  ];

  return (
    <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0">
      {navItems.map((item) => {
        let isActive = false;
        if (item.tab) {
          const currentTab = searchParams?.get('tab') || 'hadist_chm';
          isActive = pathname === '/dashboard/hadist9imam' && currentTab === item.tab;
        } else {
          isActive = pathname === item.href;
        }

        const Icon = item.icon;

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 border border-transparent'
            }`}
          >
            <Icon size={14} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
