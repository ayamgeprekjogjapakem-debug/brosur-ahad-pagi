'use client';

import React, { useState, useEffect } from 'react';
import {
  Megaphone, Plus, Bell, BellRing, Sparkles, Pin, CheckCircle2,
  Trash2, RefreshCw, Send, Calendar, BookOpen, AlertTriangle,
  Info, ExternalLink, Search, Clock, ShieldCheck, X, Layers,
  ChevronLeft, ChevronRight, FileText, Check
} from 'lucide-react';

export interface PengumumanItem {
  id: string;
  judul: string;
  slug: string;
  ringkasan: string;
  konten: string;
  kategori: 'kajian' | 'brosur' | 'info' | 'urgent';
  banner_url?: string;
  is_pinned: boolean;
  is_active: boolean;
  send_push_notification: boolean;
  fcm_message_id?: string;
  notified_at?: string;
  author_name?: string;
  brosur_slug?: string;
  created_at: string;
}

interface BrosurSearchResult {
  id: string;
  judul: string;
  slug: string;
  tahun?: number;
}

interface Props {
  role: 'admin' | 'super-admin';
}

export default function PengumumanManager({ role }: Props) {
  const [items, setItems] = useState<PengumumanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<PengumumanItem | null>(null);

  // Form Fields
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState<'kajian' | 'brosur' | 'info' | 'urgent'>('kajian');
  const [ringkasan, setRingkasan] = useState('');
  const [konten, setKonten] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [sendPush, setSendPush] = useState(true);
  const [targetTopic, setTargetTopic] = useState('semua_pengguna');
  const [brosurSlug, setBrosurSlug] = useState('');

  // Brosur Selector State
  const [brosurSearch, setBrosurSearch] = useState('');
  const [brosurResults, setBrosurResults] = useState<BrosurSearchResult[]>([]);
  const [isSearchingBrosur, setIsSearchingBrosur] = useState(false);
  const [showBrosurDropdown, setShowBrosurDropdown] = useState(false);
  const [selectedBrosurTitle, setSelectedBrosurTitle] = useState('');

  // Resend State
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [fcmStatus, setFcmStatus] = useState<{ configured: boolean; projectId?: string | null } | null>(null);

  const fetchFcmStatus = async () => {
    try {
      const res = await fetch('/api/notifications/status');
      const data = await res.json();
      if (data.success) {
        setFcmStatus(data);
      }
    } catch {
      // ignore
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pengumuman');
      const json = await res.json();
      if (json.success && json.data) {
        setItems(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch pengumuman:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchFcmStatus();
  }, []);

  // Reset page to 1 when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory, searchQuery]);

  // Live search brosur dari database
  useEffect(() => {
    if (!brosurSearch.trim()) {
      setBrosurResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingBrosur(true);
      try {
        const res = await fetch(`/api/brosurs/search?q=${encodeURIComponent(brosurSearch.trim())}&limit=10`);
        const json = await res.json();
        if (json.success && json.data) {
          setBrosurResults(json.data);
        }
      } catch (err) {
        console.error('Error searching brosurs:', err);
      } finally {
        setIsSearchingBrosur(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [brosurSearch]);

  const resetForm = () => {
    setJudul('');
    setKategori('kajian');
    setRingkasan('');
    setKonten('');
    setBannerUrl('');
    setIsPinned(false);
    setSendPush(true);
    setTargetTopic('semua_pengguna');
    setBrosurSlug('');
    setSelectedBrosurTitle('');
    setBrosurSearch('');
    setBrosurResults([]);
    setShowBrosurDropdown(false);
    setEditingItem(null);
  };

  const handleOpenModal = (item?: PengumumanItem) => {
    if (item) {
      setEditingItem(item);
      setJudul(item.judul);
      setKategori(item.kategori);
      setRingkasan(item.ringkasan || '');
      setKonten(item.konten);
      setBannerUrl(item.banner_url || '');
      setIsPinned(item.is_pinned);
      setSendPush(false); // Default false saat edit agar tidak broadcast ulang tanpa sengaja
      setBrosurSlug(item.brosur_slug || '');
      setSelectedBrosurTitle('');
      setBrosurSearch('');
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSelectBrosur = (b: BrosurSearchResult) => {
    setBrosurSlug(b.slug);
    setSelectedBrosurTitle(b.judul);
    setShowBrosurDropdown(false);
    setBrosurSearch('');

    // Otomatis ubah kategori menjadi 'brosur'
    setKategori('brosur');

    // Sisipkan link markdown standar /brosur/[slug] yang dikenali Flutter
    const linkMarkdown = `\n\n[**Buka Brosur Terkait**](/brosur/${b.slug})`;
    if (!konten.includes(`/brosur/${b.slug}`)) {
      setKonten((prev) => {
        const cleaned = prev.replace(/\n\n\[\*\*Buka Brosur Terkait\*\*\]\(\/brosur\/[^\)]+\)/g, '');
        return cleaned + linkMarkdown;
      });
    }

    // Isi judul otomatis jika masih kosong
    if (!judul.trim()) {
      setJudul(`Edisi Brosur: ${b.judul}`);
    }

    // Isi ringkasan jika masih kosong
    if (!ringkasan.trim()) {
      setRingkasan(`Telah terbit materi brosur dakwah: ${b.judul}. Ketuk untuk membaca selengkapnya.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul.trim() || !konten.trim()) {
      alert('Judul dan isi pengumuman wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        // Update existing
        const res = await fetch(`/api/pengumuman/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            judul,
            kategori,
            ringkasan,
            konten,
            banner_url: bannerUrl.trim() || null,
            is_pinned: isPinned,
            brosur_slug: brosurSlug.trim() || null,
          }),
        });
        if (res.ok) {
          setIsModalOpen(false);
          fetchItems();
        }
      } else {
        // Create new
        const res = await fetch('/api/pengumuman', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            judul,
            kategori,
            ringkasan,
            konten,
            bannerUrl: bannerUrl.trim() || null,
            isPinned,
            sendPushNotification: sendPush,
            targetTopic,
            brosurSlug: brosurSlug.trim() || null,
          }),
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setIsModalOpen(false);
          fetchItems();
          if (sendPush) {
            alert('Pengumuman berhasil disimpan dan disiarkan ke ponsel jamaah!');
          }
        } else {
          alert(json.error || 'Gagal menyimpan pengumuman');
        }
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) return;
    try {
      await fetch(`/api/pengumuman/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResendPush = async (item: PengumumanItem) => {
    if (!confirm(`Kirim ulang notifikasi untuk "${item.judul}" ke ponsel jamaah?`)) return;
    setResendingId(item.id);
    const itemBrosurSlug = item.brosur_slug || null;
    const isBrosur = item.kategori === 'brosur' && itemBrosurSlug;

    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'topic',
          target: 'semua_pengguna',
          title: item.judul,
          body: item.ringkasan || item.konten.substring(0, 140) + '...',
          screen: isBrosur ? 'detail_brosur' : 'detail_pengumuman',
          slug: isBrosur ? itemBrosurSlug : item.slug,
          imageUrl: item.banner_url || undefined,
          extraData: {
            type: isBrosur ? 'brosur' : 'pengumuman',
            kategori: item.kategori,
            ...(itemBrosurSlug ? { brosur_slug: itemBrosurSlug, slug_brosur: itemBrosurSlug } : {}),
            pengumuman_slug: item.slug,
          },
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        alert('Notifikasi berhasil disiarkan ulang!');
        fetchItems();
      } else {
        alert(json.error || 'Gagal menyiarkan ulang');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan');
    } finally {
      setResendingId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = filterCategory === 'all' || item.kategori === filterCategory;
    const matchesSearch =
      item.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.konten.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.brosur_slug && item.brosur_slug.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'kajian':
        return {
          label: 'Kajian Ahad Pagi',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: Calendar,
        };
      case 'brosur':
        return {
          label: 'Edisi Brosur',
          className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: BookOpen,
        };
      case 'urgent':
        return {
          label: 'Mendesak / Penting',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: AlertTriangle,
        };
      default:
        return {
          label: 'Informasi Umum',
          className: 'bg-sky-50 text-sky-700 border-sky-200',
          icon: Info,
        };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner Bersih Sesuai Standar Konsol Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-100">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
            <Megaphone size={12} className="text-emerald-600" />
            <span>Pusat Pengumuman & Siaran</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
            Kelola Pengumuman Resmi
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 max-w-2xl leading-relaxed">
            Publikasikan warta kajian, edisi khusus brosur, dan siarkan secara otomatis sebagai Push Notifikasi ke aplikasi ponsel jamaah.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {fcmStatus && (
            <div
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold ${fcmStatus.configured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
            >
              <span className={`w-2 h-2 rounded-full ${fcmStatus.configured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span>{fcmStatus.configured ? `FCM Aktif (${fcmStatus.projectId})` : 'FCM Simulasi'}</span>
            </div>
          )}

          <button
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs sm:text-sm shadow-xs transition"
          >
            <Plus size={16} />
            <span>Buat Pengumuman Baru</span>
          </button>
        </div>
      </div>

      {/* 2. Filter & Pencarian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-zinc-200/80 rounded-2xl shadow-2xs">
        {/* Category Chips with Lucide Icons (No Emojis) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Semua', icon: Layers },
            { id: 'kajian', label: 'Kajian Ahad Pagi', icon: Calendar },
            { id: 'brosur', label: 'Edisi Brosur', icon: BookOpen },
            { id: 'info', label: 'Info Umum', icon: Info },
            { id: 'urgent', label: 'Penting', icon: AlertTriangle },
          ].map((c) => {
            const Icon = c.icon;
            const isSelected = filterCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setFilterCategory(c.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${isSelected
                    ? 'bg-zinc-900 text-white font-semibold'
                    : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
                  }`}
              >
                <Icon size={13} className={isSelected ? 'text-white' : 'text-zinc-500'} />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, isi, atau slug brosur..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 3. Daftar Pengumuman */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-2">
          <RefreshCw size={24} className="animate-spin text-emerald-600" />
          <span className="text-xs font-medium">Memuat pengumuman...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white border border-zinc-200/80 rounded-2xl shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
            <Megaphone size={22} />
          </div>
          <h3 className="text-sm font-semibold text-zinc-800">Belum Ada Pengumuman</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Klik tombol "Buat Pengumuman Baru" di atas untuk menambahkan berita atau informasi resmi bagi jamaah.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3.5">
            {paginatedItems.map((item) => {
              const badge = getCategoryBadge(item.kategori);
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={item.id}
                  className={`p-5 bg-white border rounded-2xl transition space-y-3 shadow-2xs ${item.is_pinned
                      ? 'border-emerald-300 ring-1 ring-emerald-400/20 bg-emerald-50/[0.03]'
                      : 'border-zinc-200/80 hover:border-zinc-300'
                    }`}
                >
                  {/* Header Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {item.is_pinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Pin size={10} className="fill-amber-600" />
                          Disematkan
                        </span>
                      )}

                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}>
                        <BadgeIcon size={11} />
                        {badge.label}
                      </span>

                      {item.brosur_slug && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <BookOpen size={10} className="text-indigo-600" />
                          Brosur Terhubung
                        </span>
                      )}

                      <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                        <Clock size={11} />
                        {new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {/* Status Notifikasi */}
                    <div className="flex items-center gap-2">
                      {item.notified_at ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <BellRing size={11} className="text-emerald-600" />
                          Tersiar ke HP
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-500">
                          <Bell size={11} />
                          Hanya Web
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Judul & Isi */}
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 mb-1 leading-snug">
                      {item.judul}
                    </h3>
                    {item.brosur_slug && (
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 mb-2 bg-zinc-50 px-2 py-1 rounded-lg border border-zinc-200/60 w-fit">
                        <BookOpen size={11} className="text-indigo-600 shrink-0" />
                        <span className="truncate max-w-md">slug: {item.brosur_slug}</span>
                      </div>
                    )}
                    <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                      {item.ringkasan || item.konten}
                    </p>
                  </div>

                  {/* Footer Action */}
                  <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <span className="text-[11px] text-zinc-400">
                      Oleh: <strong className="text-zinc-600 font-medium">{item.author_name || 'Admin'}</strong>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResendPush(item)}
                        disabled={resendingId === item.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 bg-[#FAFAFA] hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-zinc-600 text-[11px] font-medium transition disabled:opacity-50"
                        title="Siarkan ulang notifikasi ke smartphone"
                      >
                        <Send size={12} className={resendingId === item.id ? 'animate-spin' : ''} />
                        <span>{resendingId === item.id ? 'Mengirim...' : 'Kirim Notifikasi Ulang'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenModal(item)}
                        className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-medium transition"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 rounded-lg text-red-500 hover:bg-red-50 transition"
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. Kontrol Paginasi */}
          {filteredItems.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-zinc-200/80 text-xs">
              <div className="text-zinc-500 text-center sm:text-left">
                Menampilkan{' '}
                <span className="font-semibold text-zinc-800">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{' '}
                –{' '}
                <span className="font-semibold text-zinc-800">
                  {Math.min(currentPage * itemsPerPage, filteredItems.length)}
                </span>{' '}
                dari <span className="font-semibold text-zinc-800">{filteredItems.length}</span> pengumuman
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium shadow-2xs text-xs"
                  >
                    <ChevronLeft size={13} />
                    <span>Sebelumnya</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((pageNum, idx, arr) => {
                        const prev = arr[idx - 1];
                        return (
                          <React.Fragment key={pageNum}>
                            {prev && pageNum - prev > 1 && (
                              <span className="px-1 text-zinc-400">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-7 h-7 rounded-xl text-xs font-semibold transition ${currentPage === pageNum
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                                }`}
                            >
                              {pageNum}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition font-medium shadow-2xs text-xs"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Modal Pembuatan & Pengeditan Pengumuman */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 border border-zinc-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Megaphone size={18} className="text-emerald-600" />
                <h3 className="text-sm font-semibold text-zinc-900">
                  {editingItem ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 transition"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Contoh: Majelis Kajian Ahad Pagi Spesial Pekan Ini"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">
                    Kategori Pengumuman
                  </label>
                  <select
                    value={kategori}
                    onChange={(e) => setKategori(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="kajian">Kajian Ahad Pagi</option>
                    <option value="brosur">Edisi Brosur</option>
                    <option value="info">Informasi Umum</option>
                    <option value="urgent">Penting / Mendesak</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-zinc-700 block mb-1">
                    Target Notifikasi
                  </label>
                  <select
                    value={targetTopic}
                    onChange={(e) => setTargetTopic(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="semua_pengguna">Semua Pengguna</option>
                    <option value="kajian_info">Jamaah Kajian</option>
                    <option value="brosur_baru">Pembaca Brosur</option>
                  </select>
                </div>
              </div>

              {/* Brosur Selector Cerdas yang terhubung ke database asli */}
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-zinc-800 flex items-center gap-1.5 text-xs">
                    <BookOpen size={14} className="text-emerald-600" />
                    <span>Pilih Brosur Terkait (Aplikasi  & Web)</span>
                  </label>
                  {brosurSlug && (
                    <button
                      type="button"
                      onClick={() => {
                        setBrosurSlug('');
                        setSelectedBrosurTitle('');
                      }}
                      className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                    >
                      Lepas Tautan
                    </button>
                  )}
                </div>

                {brosurSlug ? (
                  /* Tampilan Kartu Saat Brosur Telah Terpilih */
                  <div className="p-3 bg-white rounded-xl border border-emerald-300 shadow-2xs space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                          Brosur Terhubung
                        </span>
                        <h4 className="font-semibold text-zinc-900 text-xs">
                          {selectedBrosurTitle || brosurSlug}
                        </h4>
                        <p className="text-[10px] font-mono text-zinc-500 break-all select-all">
                          {brosurSlug}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        <Check size={10} />
                        Valid
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-[11px]">
                      <span className="text-zinc-500">Aplikasi otomatis mengenali dan membuka brosur ini</span>
                      <button
                        type="button"
                        onClick={() => {
                          const linkMarkdown = `\n\n[**Buka Brosur Terkait**](/brosur/${brosurSlug.trim()})`;
                          if (!konten.includes(`/brosur/${brosurSlug.trim()}`)) {
                            setKonten((prev) => prev + linkMarkdown);
                          }
                        }}
                        className="text-emerald-600 font-semibold hover:underline"
                      >
                        + Sisipkan Link
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Form Pencarian Brosur Real-time dari Database */
                  <div className="space-y-2 relative">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={brosurSearch}
                        onChange={(e) => {
                          setBrosurSearch(e.target.value);
                          setShowBrosurDropdown(true);
                        }}
                        onFocus={() => setShowBrosurDropdown(true)}
                        placeholder="Ketik judul brosur atau tahun (misal: Muhaasabah, 2022)..."
                        className="w-full pl-8 pr-8 py-2 rounded-xl border border-zinc-200 bg-white text-xs focus:outline-none focus:border-emerald-500"
                      />
                      {isSearchingBrosur && (
                        <RefreshCw size={12} className="animate-spin text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      )}
                    </div>

                    {/* Dropdown Hasil Pencarian Brosur Asli */}
                    {showBrosurDropdown && brosurResults.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-52 overflow-y-auto z-20 divide-y divide-zinc-100">
                        {brosurResults.map((b) => (
                          <div
                            key={b.id || b.slug}
                            onClick={() => handleSelectBrosur(b)}
                            className="p-2.5 hover:bg-emerald-50/70 cursor-pointer transition text-left space-y-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-zinc-900 text-xs">
                                {b.judul}
                              </span>
                              {b.tahun && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 rounded text-zinc-600 font-medium">
                                  {b.tahun}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-mono text-zinc-400 truncate">
                              slug: {b.slug}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 px-0.5">
                      <span>Pilih dari arsip resmi agar link baca di Aplikasi 100% pas</span>
                      <button
                        type="button"
                        onClick={() => {
                          const manual = prompt('Masukkan slug brosur manual (misal: BAP-(Brosur-Ahad-Pagi)-...):', brosurSlug);
                          if (manual !== null && manual.trim()) {
                            setBrosurSlug(manual.trim());
                            setSelectedBrosurTitle(manual.trim());
                            setKategori('brosur');
                            const linkMarkdown = `\n\n[**Buka Brosur Terkait**](/brosur/${manual.trim()})`;
                            if (!konten.includes(`/brosur/${manual.trim()}`)) {
                              setKonten((prev) => prev + linkMarkdown);
                            }
                          }
                        }}
                        className="text-zinc-500 hover:text-zinc-800 underline"
                      >
                        Input Manual
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-zinc-700">Ringkasan Notifikasi</label>
                  <span className="text-[10px] text-zinc-400">{ringkasan.length}/140</span>
                </div>
                <input
                  type="text"
                  maxLength={140}
                  value={ringkasan}
                  onChange={(e) => setRingkasan(e.target.value)}
                  placeholder="Ringkasan singkat yang akan tampil di bar notifikasi ponsel..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  Isi Pengumuman Lengkap
                </label>
                <textarea
                  rows={4}
                  value={konten}
                  onChange={(e) => setKonten(e.target.value)}
                  placeholder="Tuliskan isi pengumuman secara detail..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500 leading-relaxed"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">
                  URL Gambar Banner (Opsional)
                </label>
                <input
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  placeholder="https://domain.com/poster-kajian.jpg"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Opsi Checkbox */}
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-medium text-zinc-700">Sematkan di paling atas (Pin)</span>
                </label>

                {!editingItem && (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendPush}
                      onChange={(e) => setSendPush(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 mt-0.5"
                    />
                    <div>
                      <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                        <BellRing size={13} className="text-emerald-600 shrink-0" />
                        <span>Kirim langsung sebagai Push Notifikasi ke smartphone jamaah</span>
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        Otomatis menyiarkan pesan ke seluruh perangkat Android & iOS yang terpasang aplikasi Pustaka.
                      </span>
                    </div>
                  </label>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>{editingItem ? 'Simpan Perubahan' : 'Terbitkan Pengumuman'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
