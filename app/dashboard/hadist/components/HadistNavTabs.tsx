'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileText, BookOpen, Layers, BookMarked, Sparkles 
} from 'lucide-react';

export default function HadistNavTabs() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Hadist Sumber Brosur', href: '/dashboard/hadist', icon: FileText, exact: true },
    { name: 'Master Kitab', href: '/dashboard/hadist/kitab', icon: BookOpen, exact: false },
    { name: 'Master Sahabat', href: '/dashboard/hadist/sahabat', icon: BookOpen, exact: false },
    { name: 'Master Sanad (Rijal)', href: '/dashboard/hadist/rijal', icon: BookOpen, exact: false },
    { name: 'Kelompok / Tema', href: '/dashboard/hadist/kelompok', icon: Layers, exact: false },
    { name: 'Master Brosur', href: '/dashboard/hadist/brosur', icon: BookMarked, exact: false },
    { name: 'Generate SQL', href: '/dashboard/hadist/generate', icon: Sparkles, exact: false },
  ];

  return (
    <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0">
      {navItems.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
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
