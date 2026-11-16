'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Database, BookOpen, Calendar, Bell,
  User, UserCog, LogOut, Sparkles, X, ScrollText, Library,
  KeyRound, Shield, CheckCircle2, ShieldAlert, BellRing, Megaphone, MessageSquare,
  FolderArchive, ChevronDown, ChevronRight, FileText, Plus
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

function AdminSidebarInner() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string; name?: string; role?: string } | null>(null);

  // State dropdown kelompok Data Brosur di sidebar
  const [isBrosurDropdownOpen, setIsBrosurDropdownOpen] = useState(true);

  const supabase = createClient();

  // Fetch Current User Profile
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, role')
            .eq('id', user.id)
            .single();

          setCurrentUser({
            email: user.email,
            name: profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
            role: profile?.role || 'admin',
          });
        }
      } catch (e) {
        console.error('Failed to fetch user in sidebar:', e);
      }
    };
    fetchCurrentUser();
  }, [supabase]);

  // Otomatis buka dropdown jika sedang berada di rute /admin/data-brosur
  useEffect(() => {
    if (pathname.startsWith('/admin/data-brosur')) {
      setIsBrosurDropdownOpen(true);
    }
  }, [pathname]);

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
      label: 'RINGKASAN',
      items: [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      label: 'KONTEN DAKWAH',
      items: [
        { name: 'Data Brosur', href: '/admin/data-brosur', icon: Database, hasDropdown: true },
        { name: 'Data Quran', href: '/admin/data-quran', icon: BookOpen },
        { name: 'Hadist Brosur', href: '/admin/hadist', icon: ScrollText },
        { name: 'Hadist 9 Imam', href: '/admin/hadist-9-imam', icon: Library },
        { name: 'Kalender Kajian', href: '/admin/kalender', icon: Calendar },
      ],
    },
    {
      label: 'KOMUNIKASI & JAMAAH',
      items: [
        { name: 'Pengumuman', href: '/admin/pengumuman', icon: Megaphone, badge: 'Warta' },
        { name: 'Konsultasi Hadist', href: '/admin/help', icon: MessageSquare, badge: 'WA' },
        { name: 'Kotak Masukan', href: '/admin/notifikasi', icon: Bell },
      ],
    },
    {
      label: 'PENGATURAN & AKSES',
      items: [
        { name: 'Pengaturan Kode Akses', href: '/admin/kode-akses', icon: KeyRound, badge: 'Akses' },
        { name: 'Akun Saya', href: '/admin/akun', icon: User },
        { name: 'Manajemen Akun', href: '/admin/management-akun', icon: UserCog },
        ...(currentUser?.role === 'super-admin' 
          ? [{ name: 'Super Admin', href: '/dashboard', icon: ShieldAlert }] 
          : []),
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
        {/* Brand Header Clean dengan Logo Utama logo_rb.png */}
        <div className={`h-16 px-4 flex items-center ${isMinimized ? 'justify-center' : 'justify-between'}`}>
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Image
                src="/images/logo_rb.png"
                alt="Logo Pustaka"
                fill
                sizes="32px"
                className="object-contain"
              />
            </div>
            {(!isMinimized || isMobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm tracking-tight text-zinc-900 truncate">
                  Admin Console
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  Brosur Ahad Pagi
                </span>
              </div>
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/50 md:hidden transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Navigation Clean Gemini Style */}
        <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto custom-scrollbar">
          {navGroups.map((group, groupIdx) => (
            <div 
              key={group.label} 
              className={`space-y-1 ${groupIdx > 0 ? 'pt-3 border-t border-zinc-200/50' : ''}`}
            >
              {(!isMinimized || isMobileOpen) && (
                <div className="px-3 py-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {group.label}
                  </span>
                  <span className="text-[9px] font-medium text-zinc-300">
                    {group.items.length}
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = item.href === '/admin' 
                    ? pathname === '/admin' 
                    : pathname === item.href || 
                      pathname.startsWith(`${item.href}/`) ||
                      (item.href === '/admin/kode-akses' && pathname.startsWith('/admin/access-codes'));
                  const Icon = item.icon;
                  const badge = (item as any).badge;
                  const hasDropdown = (item as any).hasDropdown;

                  return (
                    <div key={item.name} className="space-y-0.5">
                      <div className="flex items-center">
                        <Link 
                          href={item.href}
                          onClick={() => {
                            if (hasDropdown) {
                              setIsBrosurDropdownOpen(true);
                            }
                          }}
                          title={isMinimized && !isMobileOpen ? item.name : undefined}
                          className={`flex-1 flex items-center ${
                            isMinimized && !isMobileOpen ? 'justify-center px-0 h-10' : 'gap-3 px-3 py-2'
                          } rounded-xl text-xs sm:text-sm font-medium transition-all duration-150 ${
                            isActive 
                              ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-2xs' 
                              : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'
                          }`}
                        >
                          <Icon 
                            size={17} 
                            strokeWidth={isActive ? 2.2 : 1.8} 
                            className={`shrink-0 transition-colors ${
                              isActive ? 'text-emerald-600' : 'text-zinc-400 group-hover:text-zinc-600'
                            }`} 
                          />
                          {(!isMinimized || isMobileOpen) && (
                            <>
                              <span className="truncate">{item.name}</span>
                              {badge ? (
                                <span className="ml-auto px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200/60 shrink-0">
                                  {badge}
                                </span>
                              ) : isActive && !hasDropdown ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 ml-auto shrink-0" />
                              ) : null}
                            </>
                          )}
                        </Link>

                        {/* Tombol Toggle Dropdown Khusus Kelompok Data Brosur */}
                        {hasDropdown && (!isMinimized || isMobileOpen) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsBrosurDropdownOpen(!isBrosurDropdownOpen);
                            }}
                            className="p-2 ml-0.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition cursor-pointer"
                            title={isBrosurDropdownOpen ? 'Tutup Menu Brosur' : 'Buka Menu Brosur'}
                          >
                            {isBrosurDropdownOpen ? (
                              <ChevronDown size={14} className="text-zinc-500" />
                            ) : (
                              <ChevronRight size={14} className="text-zinc-400" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* DROPDOWN SUBMENU DATA BROSUR (Slug Pages: Semua Brosur, Koleksi, Tahun, Tambah) */}
                      {hasDropdown && isBrosurDropdownOpen && (!isMinimized || isMobileOpen) && (
                        <div className="ml-3 pl-2.5 border-l-2 border-emerald-200/60 my-1 space-y-0.5">
                          <Link
                            href="/admin/data-brosur"
                            onClick={() => { if (isMobileOpen) setIsMobileOpen(false); }}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition ${
                              pathname === '/admin/data-brosur'
                                ? 'bg-emerald-100/80 text-emerald-900 font-bold'
                                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                          >
                            <FileText size={13} className={pathname === '/admin/data-brosur' ? 'text-emerald-700' : 'text-zinc-400'} />
                            <span>Semua Brosur</span>
                          </Link>

                          <Link
                            href="/admin/data-brosur/koleksi"
                            onClick={() => { if (isMobileOpen) setIsMobileOpen(false); }}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition ${
                              pathname.includes('/data-brosur/koleksi')
                                ? 'bg-emerald-100/80 text-emerald-900 font-bold'
                                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                          >
                            <FolderArchive size={13} className={pathname.includes('/data-brosur/koleksi') ? 'text-emerald-700' : 'text-zinc-400'} />
                            <span>Koleksi Tematik</span>
                          </Link>

                          <Link
                            href="/admin/data-brosur/tahun"
                            onClick={() => { if (isMobileOpen) setIsMobileOpen(false); }}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition ${
                              pathname.includes('/data-brosur/tahun')
                                ? 'bg-emerald-100/80 text-emerald-900 font-bold'
                                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                          >
                            <Calendar size={13} className={pathname.includes('/data-brosur/tahun') ? 'text-emerald-700' : 'text-zinc-400'} />
                            <span>Kategori Tahun</span>
                          </Link>

                          <Link
                            href="/admin/data-brosur/new"
                            onClick={() => { if (isMobileOpen) setIsMobileOpen(false); }}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition ${
                              pathname === '/admin/data-brosur/new'
                                ? 'bg-emerald-100/80 text-emerald-900 font-bold'
                                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                            }`}
                          >
                            <Plus size={13} className={pathname === '/admin/data-brosur/new' ? 'text-emerald-700' : 'text-zinc-400'} />
                            <span>Tambah Brosur</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Minimalist Gemini Style with Active User & Password Change */}
        <div className="p-3 border-t border-zinc-200/60 bg-zinc-50/50 space-y-2">
          {(!isMinimized || isMobileOpen) ? (
            <div className="p-2.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {(currentUser?.name || currentUser?.email || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-zinc-900 truncate">
                      {currentUser?.name || 'Admin'}
                    </p>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Akun Aktif" />
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {currentUser?.email || 'admin@brosurahad.id'}
                  </p>
                </div>
              </div>

              {/* Status Aktif & Role Tag */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[10px]">
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 size={11} />
                  <span>Akun Aktif</span>
                </span>
                <span className="uppercase font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">
                  {currentUser?.role || 'admin'}
                </span>
              </div>

              {/* Action: Ubah Password untuk Akses Web & Mobile */}
              <Link
                href="/admin/akun"
                title="Ubah Password Akun (Akses Web & Mobile)"
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 font-semibold text-[11px] rounded-xl transition border border-emerald-200/60"
              >
                <KeyRound size={12} />
                <span>Ubah Password (Web & Mobile)</span>
              </Link>
            </div>
          ) : (
            <Link
              href="/admin/akun"
              title={`Akun Aktif: ${currentUser?.email} - Klik untuk Ubah Password`}
              className="w-full flex items-center justify-center h-10 rounded-xl bg-white border border-zinc-200/80 text-emerald-600 hover:bg-emerald-50 transition shadow-2xs relative"
            >
              <KeyRound size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </Link>
          )}

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={isMinimized && !isMobileOpen ? 'Keluar' : undefined}
            className={`w-full flex items-center ${
              isMinimized && !isMobileOpen ? 'justify-center px-0 h-9' : 'gap-2.5 px-3 py-2'
            } rounded-xl text-xs font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50/60 transition-all duration-150 disabled:opacity-50`}
          >
            <LogOut size={15} strokeWidth={1.8} />
            {(!isMinimized || isMobileOpen) && <span>{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default function AdminSidebar() {
  return (
    <Suspense fallback={
      <aside className="hidden md:block w-64 bg-[#FAFAFA] h-screen" />
    }>
      <AdminSidebarInner />
    </Suspense>
  );
}
