'use client';

import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Plus, Bell, BellRing, Sparkles, Pin, CheckCircle2, 
  Trash2, RefreshCw, Send, Calendar, BookOpen, AlertTriangle, 
  Info, ExternalLink, Search, Clock, ShieldCheck, X
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
  created_at: string;
}

interface Props {
  role: 'admin' | 'super-admin';
}

export default function PengumumanManager({ role }: Props) {
  const [items, setItems] = useState<PengumumanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Resend State
  const [resendingId, setResendingId] = useState<string | null>(null);

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
  }, []);

  const resetForm = () => {
    setJudul('');
    setKategori('kajian');
    setRingkasan('');
    setKonten('');
    setBannerUrl('');
    setIsPinned(false);
    setSendPush(true);
    setTargetTopic('semua_pengguna');
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
    } else {
      resetForm();
    }
    setIsModalOpen(true);
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
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'topic',
          target: 'semua_pengguna',
          title: `📢 ${item.judul}`,
          body: item.ringkasan || item.konten.substring(0, 140) + '...',
          screen: 'detail_pengumuman',
          slug: item.slug,
          imageUrl: item.banner_url || undefined,
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
      item.konten.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs sm:text-sm shadow-xs transition shrink-0"
        >
          <Plus size={16} />
          <span>Buat Pengumuman Baru</span>
        </button>
      </div>

      {/* 2. Filter & Pencarian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border border-zinc-200/80 rounded-2xl shadow-2xs">
        {/* Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Semua' },
            { id: 'kajian', label: '🕌 Kajian Ahad Pagi' },
            { id: 'brosur', label: '📖 Edisi Brosur' },
            { id: 'info', label: '📢 Info Umum' },
            { id: 'urgent', label: '⚠️ Penting' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                filterCategory === c.id
                  ? 'bg-zinc-900 text-white font-semibold'
                  : 'bg-zinc-100 text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari pengumuman..."
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
        <div className="grid grid-cols-1 gap-3.5">
          {filteredItems.map((item) => {
            const badge = getCategoryBadge(item.kategori);
            const BadgeIcon = badge.icon;
            return (
              <div
                key={item.id}
                className={`p-5 bg-white border rounded-2xl transition space-y-3 shadow-2xs ${
                  item.is_pinned
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
      )}

      {/* 4. Modal Pembuatan & Pengeditan Pengumuman */}
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
                className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 text-xs"
              >
                ✕
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
                      <span className="font-semibold text-emerald-800 block">
                        🔔 Kirim langsung sebagai Push Notifikasi ke smartphone jamaah
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
