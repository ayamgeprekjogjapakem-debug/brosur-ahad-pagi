'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Database, BookOpen, Calendar, Bell,
  User, UserCog, LogOut, Sparkles, X, ScrollText, Library
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_minimized');
    if (saved === 'true') {
      setIsMinimized(true);
      window.dispatchEvent(new CustomEvent('admin_sidebar_minimized_changed', { detail: true }));
    }
  }, []);

  // Listen to toggle event from header button
  useEffect(() => {
    const handleToggleEvent = () => {
      if (window.innerWidth < 768) {
        setIsMobileOpen(prev => !prev);
      } else {
        const nextState = !isMinimized;
        setIsMinimized(nextState);
        localStorage.setItem('admin_sidebar_minimized', String(nextState));
        window.dispatchEvent(new CustomEvent('admin_sidebar_minimized_changed', { detail: nextState }));
      }
    };

    window.addEventListener('toggle_admin_sidebar_minimized', handleToggleEvent);
    return () => window.removeEventListener('toggle_admin_sidebar_minimized', handleToggleEvent);
  }, [isMinimized]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navGroups = [
    {
      label: 'MENU UTAMA',
      items: [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Data Brosur', href: '/admin/data-brosur', icon: Database },
        { name: 'Data Quran', href: '/admin/data-quran', icon: BookOpen },
        { name: 'Hadist Brosur', href: '/admin/hadist', icon: ScrollText },
        { name: 'Hadist 9 Imam', href: '/admin/hadist-9-imam', icon: Library },
        { name: 'Kalender', href: '/admin/kalender', icon: Calendar },
        { name: 'Notifikasi', href: '/admin/notifikasi', icon: Bell },
      ],
    },
    {
      label: 'SETTING',
      items: [
        { name: 'Akun', href: '/admin/akun', icon: User },
        { name: 'Management Akun', href: '/admin/management-akun', icon: UserCog },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 md:hidden transition-opacity" 
        />
      )}

      {/* Sidebar Responsive Container */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-50 h-screen max-h-screen bg-[#FAFAFA] flex flex-col shrink-0 select-none transition-all duration-200 ease-out ${
          isMobileOpen ? 'translate-x-0 w-64 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0'
        } ${isMinimized ? 'md:w-[72px]' : 'md:w-64'}`}
      >
        {/* Brand Header Clean Tanpa Pemisah Garis Tebal */}
        <div className={`h-16 px-5 flex items-center ${isMinimized ? 'justify-center' : 'justify-between'}`}>
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Sparkles size={16} />
            </div>
            {(!isMinimized || isMobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm tracking-tight text-zinc-900 truncate">
                  Admin Console
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  Pusat Operasional
                </span>
              </div>
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/50 md:hidden transition"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Navigation Clean Gemini Style */}
        <nav className="flex-1 px-3 py-2 space-y-6 overflow-y-auto custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {(!isMinimized || isMobileOpen) && (
                <span className="block px-3 py-1 text-[11px] font-medium tracking-wider text-zinc-400">
                  {group.label}
                </span>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = item.href === '/admin' 
                    ? pathname === '/admin' 
                    : pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link 
                      key={item.name} 
                      href={item.href}
                      title={isMinimized && !isMobileOpen ? item.name : undefined}
                      className={`w-full flex items-center ${
                        isMinimized && !isMobileOpen ? 'justify-center px-0 h-10' : 'gap-3 px-3.5 py-2.5'
                      } rounded-xl text-sm font-medium transition-all duration-150 ${
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
                      }`}
                    >
                      <Icon 
                        size={18} 
                        strokeWidth={isActive ? 2.2 : 1.8} 
                        className={isActive ? 'text-emerald-600' : 'text-zinc-400 group-hover:text-zinc-600'} 
                      />
                      {(!isMinimized || isMobileOpen) && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Minimalist Gemini Style */}
        <div className="p-3">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={isMinimized && !isMobileOpen ? 'Keluar' : undefined}
            className={`w-full flex items-center ${
              isMinimized && !isMobileOpen ? 'justify-center px-0 h-10' : 'gap-3 px-3.5 py-2.5'
            } rounded-xl text-sm font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50/60 transition-all duration-150 disabled:opacity-50`}
          >
            <LogOut size={17} strokeWidth={1.8} />
            {(!isMinimized || isMobileOpen) && <span>{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
