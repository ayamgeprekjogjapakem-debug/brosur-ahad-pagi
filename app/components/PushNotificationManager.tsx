'use client';

import React, { useState, useEffect } from 'react';
import { 
  Send, Smartphone, Bell, BellRing, Sparkles, CheckCircle2, 
  AlertCircle, History, RefreshCw, Layers, HelpCircle, Eye, 
  BookOpen, ScrollText, Calendar, Check, ShieldCheck, Radio,
  ArrowRight, ExternalLink
} from 'lucide-react';

interface RecentBrosur {
  id: string;
  judul: string;
  slug: string;
  tahun: number;
}

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  target_type: string;
  target: string;
  screen: string;
  slug?: string;
  item_id?: string;
  sender_name?: string;
  status: 'sent' | 'simulated' | 'failed';
  created_at: string;
}

interface Props {
  role: 'admin' | 'super-admin';
}

export default function PushNotificationManager({ role }: Props) {
  // Form State
  const [targetType, setTargetType] = useState<'topic' | 'token'>('topic');
  const [topic, setTopic] = useState('semua_pengguna');
  const [customTopic, setCustomTopic] = useState('');
  const [deviceToken, setDeviceToken] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [screen, setScreen] = useState('detail_brosur');
  const [selectedBrosurSlug, setSelectedBrosurSlug] = useState('');
  const [itemId, setItemId] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // UI State
  const [previewPlatform, setPreviewPlatform] = useState<'android' | 'ios'>('android');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string; mode?: string } | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [recentBrosur, setRecentBrosur] = useState<RecentBrosur[]>([]);
  const [firebaseConfig, setFirebaseConfig] = useState<{ isConfigured: boolean; projectId: string | null }>({
    isConfigured: false,
    projectId: null,
  });
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Fetch initial history & recent data
  const loadData = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/notifications/history');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setRecentBrosur(data.recentBrosur || []);
        if (data.firebaseConfig) {
          setFirebaseConfig(data.firebaseConfig);
        }
        if (data.recentBrosur && data.recentBrosur.length > 0 && !selectedBrosurSlug) {
          setSelectedBrosurSlug(data.recentBrosur[0].slug);
        }
      }
    } catch (e) {
      console.error('Failed to load notification history:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Preset Templates
  const applyPreset = (preset: 'brosur' | 'hadits' | 'kajian' | 'info') => {
    if (preset === 'brosur') {
      const latest = recentBrosur[0];
      setTitle('📖 Brosur Ahad Pagi Edisi Terbaru');
      setBody(latest ? `Edisi: "${latest.judul}". Ketuk untuk membaca kajian selengkapnya.` : 'Brosur dakwah kajian Ahad Pagi edisi terbaru telah terbit. Ketuk untuk membaca.');
      setScreen('detail_brosur');
      setTopic('brosur_baru');
      if (latest) setSelectedBrosurSlug(latest.slug);
    } else if (preset === 'hadits') {
      setTitle('📜 Mutiara Hadits Hari Ini');
      setBody('Rasulullah ﷺ bersabda: "Barangsiapa menempuh jalan untuk mencari ilmu, maka Allah akan memudahkan baginya jalan ke surga." (HR. Muslim)');
      setScreen('detail_hadits');
      setTopic('hadits_update');
      setItemId('1');
    } else if (preset === 'kajian') {
      setTitle('🕌 Pengingat Majelis Kajian Ahad Pagi');
      setBody('Hadirilah kajian Ahad Pagi besok pukul 06.00 WIB di Masjid Gedhe Kauman / Siaran Live.');
      setScreen('kalender');
      setTopic('kajian_info');
    } else if (preset === 'info') {
      setTitle('📢 Pembaruan Data Aplikasi Pustaka');
      setBody('Pembaruan data arsip brosur dakwah kini telah selesai. Buka aplikasi untuk mengecek koleksi terbaru.');
      setScreen('beranda');
      setTopic('semua_pengguna');
    }
  };

  // Submit Handler
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      alert('Judul dan isi pesan notifikasi wajib diisi!');
      return;
    }

    const finalTarget = targetType === 'token' 
      ? deviceToken 
      : (topic === 'custom' ? customTopic : topic);

    if (!finalTarget) {
      alert(targetType === 'token' ? 'Token perangkat wajib diisi!' : 'Nama topik wajib dipilih!');
      return;
    }

    if (!confirm(`Kirim notifikasi ini ke target: ${finalTarget}?`)) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          target: finalTarget,
          title,
          body,
          screen,
          slug: screen === 'detail_brosur' ? selectedBrosurSlug : undefined,
          itemId: screen === 'detail_hadits' ? itemId : undefined,
          imageUrl: imageUrl.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSendResult({
          success: true,
          mode: json.mode,
          message: json.mode === 'live'
            ? 'Notifikasi berhasil disiarkan ke Firebase Cloud Messaging!'
            : 'Notifikasi dicatat (Mode Uji Coba). Masukkan kredensial Firebase di .env.local untuk live broadcast.',
        });
        loadData(); // Refresh history
      } else {
        setSendResult({
          success: false,
          message: json.error || 'Gagal mengirim notifikasi.',
        });
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err.message || 'Terjadi kesalahan jaringan.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner Bersih Sesuai Standar Konsol Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-100">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
            <Sparkles size={12} className="text-emerald-600" />
            <span>Broadcast Notifikasi Mobile</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
            Push Notifikasi Smartphone
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 max-w-2xl leading-relaxed">
            Kirim pengumuman rilis brosur, mutiara hadits, dan info jadwal kajian langsung ke layar ponsel jamaah (Android & iOS).
          </p>
        </div>

        {/* Status Indikator Firebase */}
        <div className="flex items-center gap-2 shrink-0">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium ${
            firebaseConfig.isConfigured 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700' 
              : 'bg-amber-50/80 border-amber-200 text-amber-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${firebaseConfig.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{firebaseConfig.isConfigured ? `FCM Aktif (${firebaseConfig.projectId})` : 'Mode Uji Coba'}</span>
          </div>

          <button
            onClick={() => setShowSetupGuide(true)}
            className="p-1.5 rounded-xl border border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 transition text-xs font-medium flex items-center gap-1"
            title="Panduan Setup Firebase"
          >
            <HelpCircle size={15} />
            <span className="hidden md:inline">Bantuan</span>
          </button>
        </div>
      </div>

      {/* 2. Template Cepat (Quick Presets) */}
      <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-zinc-200/70 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Sparkles size={12} className="text-amber-500" />
            Template Cepat (1-Klik Isi)
          </span>
          <span className="text-[11px] text-zinc-400">Klik untuk memuat format otomatis</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => applyPreset('brosur')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-emerald-50/50 border border-zinc-200 hover:border-emerald-300 text-zinc-700 hover:text-emerald-800 text-xs font-medium transition text-left shadow-2xs"
          >
            <BookOpen size={14} className="text-emerald-600 shrink-0" />
            <span className="truncate">Brosur Baru Terbit</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('hadits')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-indigo-50/50 border border-zinc-200 hover:border-indigo-300 text-zinc-700 hover:text-indigo-800 text-xs font-medium transition text-left shadow-2xs"
          >
            <ScrollText size={14} className="text-indigo-600 shrink-0" />
            <span className="truncate">Mutiara Hadits</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('kajian')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-amber-50/50 border border-zinc-200 hover:border-amber-300 text-zinc-700 hover:text-amber-800 text-xs font-medium transition text-left shadow-2xs"
          >
            <Calendar size={14} className="text-amber-600 shrink-0" />
            <span className="truncate">Pengingat Ahad Pagi</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('info')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-sky-50/50 border border-zinc-200 hover:border-sky-300 text-zinc-700 hover:text-sky-800 text-xs font-medium transition text-left shadow-2xs"
          >
            <Bell size={14} className="text-sky-600 shrink-0" />
            <span className="truncate">Pengumuman Jemaah</span>
          </button>
        </div>
      </div>

      {/* 3. Grid Form & Live Mobile Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom Kiri: Form Composer (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-zinc-200/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
          <form onSubmit={handleSend} className="space-y-4">
            {/* Target Audience */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-700 block">
                Target Penerima
              </label>

              <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTargetType('topic')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                    targetType === 'topic'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Radio size={13} />
                  Topik Massal (Broadcast)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetType('token')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                    targetType === 'token'
                      ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  <Smartphone size={13} />
                  Token Perangkat (Tes HP)
                </button>
              </div>

              {targetType === 'topic' ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { id: 'semua_pengguna', label: '📢 Semua Pengguna', desc: 'Seluruh instalasi' },
                    { id: 'brosur_baru', label: '📖 Brosur Baru', desc: 'Pembaca brosur' },
                    { id: 'hadits_update', label: '📜 Hadits Harian', desc: 'Kutipan mutiara' },
                    { id: 'kajian_info', label: '🕌 Jadwal Kajian', desc: 'Info Ahad Pagi' },
                  ].map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setTopic(t.id)}
                      className={`cursor-pointer p-2.5 rounded-xl border transition text-left flex items-start justify-between ${
                        topic === t.id
                          ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900 ring-1 ring-emerald-500'
                          : 'border-zinc-200 bg-[#FAFAFA] hover:border-zinc-300'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-semibold block">{t.label}</span>
                        <span className="text-[11px] text-zinc-400 mt-0.5 block">{t.desc}</span>
                      </div>
                      {topic === t.id && <Check size={14} className="text-emerald-600 shrink-0 mt-0.5" />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pt-1">
                  <input
                    type="text"
                    value={deviceToken}
                    onChange={(e) => setDeviceToken(e.target.value)}
                    placeholder="Masukkan FCM Registration Token..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Gunakan opsi token untuk uji coba langsung ke smartphone pribadi Anda.
                  </p>
                </div>
              )}
            </div>

            {/* Isi Notifikasi */}
            <div className="space-y-3 pt-2 border-t border-zinc-100">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-zinc-700">Judul Notifikasi</span>
                  <span className="text-[11px] text-zinc-400">{title.length}/65</span>
                </div>
                <input
                  type="text"
                  value={title}
                  maxLength={65}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: 📖 Brosur Ahad Pagi Edisi 25 Oktober 2026"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-zinc-700">Isi Pesan Notifikasi</span>
                  <span className="text-[11px] text-zinc-400">{body.length}/180</span>
                </div>
                <textarea
                  rows={3}
                  maxLength={180}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Tulis ringkasan isi brosur atau faedah kajian..."
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                  required
                />
              </div>

              <div>
                <span className="text-xs font-semibold text-zinc-700 mb-1 block">
                  URL Gambar Banner (Opsional)
                </span>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://domain.com/banner.jpg"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-[#FAFAFA] text-xs focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Deep Linking Target di Mobile */}
            <div className="space-y-2.5 pt-2 border-t border-zinc-100">
              <label className="text-xs font-semibold text-zinc-700 block">
                Aksi Saat Notifikasi Diketuk (Deep Link)
              </label>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'detail_brosur', label: 'Brosur', icon: BookOpen },
                  { id: 'detail_hadits', label: 'Hadits', icon: ScrollText },
                  { id: 'kalender', label: 'Kalender', icon: Calendar },
                  { id: 'beranda', label: 'Beranda', icon: Layers },
                ].map((sc) => {
                  const Icon = sc.icon;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setScreen(sc.id)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-medium transition ${
                        screen === sc.id
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs font-semibold'
                          : 'border-zinc-200 bg-[#FAFAFA] text-zinc-600 hover:border-zinc-300'
                      }`}
                    >
                      <Icon size={13} />
                      <span className="truncate">{sc.label}</span>
                    </button>
                  );
                })}
              </div>

              {screen === 'detail_brosur' && (
                <div className="p-2.5 bg-[#FAFAFA] rounded-xl border border-zinc-200 space-y-1">
                  <span className="text-[11px] font-medium text-zinc-500">Pilih Brosur Target:</span>
                  <select
                    value={selectedBrosurSlug}
                    onChange={(e) => setSelectedBrosurSlug(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    {recentBrosur.map((b) => (
                      <option key={b.id} value={b.slug}>
                        [{b.tahun}] {b.judul}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {screen === 'detail_hadits' && (
                <div className="p-2.5 bg-[#FAFAFA] rounded-xl border border-zinc-200 space-y-1">
                  <span className="text-[11px] font-medium text-zinc-500">ID / Nomor Hadits:</span>
                  <input
                    type="text"
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                    placeholder="Contoh: 1, 40, atau kitab"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Alert Status Pengiriman */}
            {sendResult && (
              <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                sendResult.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {sendResult.success 
                  ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" /> 
                  : <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />}
                <div>
                  <span className="font-semibold block mb-0.5">
                    {sendResult.success ? (sendResult.mode === 'live' ? 'Berhasil Disiarkan (FCM Live)' : 'Tercatat dalam Mode Simulasi') : 'Gagal Mengirim'}
                  </span>
                  {sendResult.message}
                </div>
              </div>
            )}

            {/* Tombol Eksekusi Bersih */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSending}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Menghubungi FCM Server...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Broadcast Notifikasi Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Kolom Kanan: Live Mobile Mockup Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <Eye size={13} className="text-zinc-400" />
                Live Preview Smartphone
              </span>

              {/* Platform Switcher */}
              <div className="flex items-center gap-1 p-0.5 bg-zinc-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('android')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    previewPlatform === 'android' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500'
                  }`}
                >
                  Android
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('ios')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                    previewPlatform === 'ios' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500'
                  }`}
                >
                  iOS
                </button>
              </div>
            </div>

            {/* Smartphone Bezel */}
            <div className="relative mx-auto w-full max-w-[290px] aspect-[9/17] bg-zinc-900 rounded-[38px] p-2.5 shadow-xl ring-1 ring-black/10 overflow-hidden flex flex-col justify-between">
              {/* Dynamic Island / Notch */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-20 h-3.5 bg-black rounded-full z-20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-zinc-800 ml-8" />
              </div>

              {/* Status Bar */}
              <div className="pt-2 px-3.5 flex items-center justify-between text-[10px] text-zinc-400 font-medium z-10">
                <span>06:00</span>
                <div className="flex items-center gap-1 text-[9px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Lockscreen Wall & Notification Bubble */}
              <div className="flex-1 flex flex-col justify-start pt-10 px-1 relative z-10">
                {/* Clock */}
                <div className="text-center text-white/90 mb-6">
                  <div className="text-3xl font-extralight tracking-tight">06:00</div>
                  <div className="text-[10px] text-white/60">Ahad, 25 Oktober</div>
                </div>

                {/* THE NOTIFICATION BUBBLE */}
                <div className="w-full bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-lg text-zinc-900 text-left border border-white/20">
                  {/* Header Bubble */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded bg-emerald-600 flex items-center justify-center text-white font-bold text-[9px]">
                        📖
                      </div>
                      <span className="text-[10px] font-bold text-zinc-900">
                        Brosur Ahad Pagi
                      </span>
                    </div>
                    <span className="text-[9px] text-zinc-400">Baru saja</span>
                  </div>

                  {/* Title */}
                  <div className="text-[11px] font-bold leading-snug line-clamp-2 text-zinc-900">
                    {title || 'Judul Notifikasi'}
                  </div>

                  {/* Body */}
                  <div className="text-[10px] text-zinc-600 mt-0.5 leading-relaxed line-clamp-3">
                    {body || 'Isi pesan pemberitahuan yang diketik di form akan muncul secara live di sini...'}
                  </div>

                  {/* Banner jika ada */}
                  {imageUrl && (
                    <div className="mt-2 rounded-lg overflow-hidden aspect-[16/9] bg-zinc-200 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  {/* Route Indicator */}
                  <div className="mt-2 pt-1.5 border-t border-zinc-100 flex items-center justify-between text-[9px] text-emerald-600 font-semibold">
                    <span>Aksi: Buka {screen.replace('detail_', '').toUpperCase()}</span>
                    <span>Ketuk untuk baca →</span>
                  </div>
                </div>
              </div>

              {/* Bottom Home Indicator */}
              <div className="pb-0.5 flex justify-center z-10">
                <div className="w-24 h-1 bg-white/30 rounded-full" />
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 text-center mt-3">
              Pratinjau tampilan push notifikasi pada layar kunci ponsel.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Tabel Riwayat Pengiriman Bersih */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-zinc-100 text-zinc-600 rounded-lg">
              <History size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Riwayat Pengiriman Notifikasi
              </h2>
              <p className="text-xs text-zinc-400">
                Daftar siaran notifikasi yang pernah dikirimkan.
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            disabled={isLoadingHistory}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-600 hover:bg-zinc-50 transition"
          >
            <RefreshCw size={12} className={isLoadingHistory ? 'animate-spin' : ''} />
            <span>Segarkan</span>
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-zinc-200 rounded-xl">
            <Bell size={24} className="mx-auto text-zinc-300 mb-1.5" />
            <p className="text-xs font-medium text-zinc-600">Belum ada riwayat pengiriman</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Notifikasi yang Anda kirim akan tercatat rapi di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400 font-medium uppercase text-[10px] tracking-wider">
                  <th className="pb-2.5 pl-1">Waktu</th>
                  <th className="pb-2.5">Judul & Pesan</th>
                  <th className="pb-2.5">Target</th>
                  <th className="pb-2.5">Rute</th>
                  <th className="pb-2.5">Pengirim</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5 text-right pr-1">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/70 transition">
                    <td className="py-2.5 pl-1 text-zinc-500 whitespace-nowrap text-[11px]">
                      {new Date(log.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 max-w-[260px]">
                      <div className="font-medium text-zinc-900 truncate">{log.title}</div>
                      <div className="text-[11px] text-zinc-400 truncate">{log.body}</div>
                    </td>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 font-mono text-[10px] text-zinc-600">
                        {log.target}
                      </span>
                    </td>
                    <td className="py-2.5 text-zinc-600 text-[11px]">
                      {log.screen || '-'}
                    </td>
                    <td className="py-2.5 text-zinc-500 text-[11px]">
                      {log.sender_name || 'Admin'}
                    </td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        log.status === 'sent'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : log.status === 'simulated'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {log.status === 'sent' ? 'Live FCM' : log.status === 'simulated' ? 'Simulasi' : 'Gagal'}
                      </span>
                    </td>
                    <td className="py-2.5 text-right pr-1">
                      <button
                        onClick={() => {
                          setTitle(log.title);
                          setBody(log.body);
                          if (log.screen) setScreen(log.screen);
                          if (log.slug) setSelectedBrosurSlug(log.slug);
                          if (log.target) setTopic(log.target);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-2 py-1 rounded-md bg-zinc-100 hover:bg-emerald-600 hover:text-white transition text-[11px] font-medium"
                      >
                        Gunakan Lagi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Bantuan Firebase */}
      {showSetupGuide && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-zinc-100">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600" />
                <h3 className="text-sm font-semibold text-zinc-900">
                  Status Koneksi Firebase (FCM)
                </h3>
              </div>
              <button
                onClick={() => setShowSetupGuide(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-900 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-zinc-600">
              <p>
                Aplikasi ini terhubung langsung dengan <strong>Google Firebase Cloud Messaging (FCM) HTTP v1 API</strong> untuk menyiarkan notifikasi ke seluruh perangkat smartphone (Android & iOS).
              </p>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 font-mono text-[11px] space-y-1">
                <div className="font-sans font-medium text-zinc-700">Project Terhubung:</div>
                <div className="text-emerald-700 font-bold">pustakamta</div>
              </div>

              <p className="text-[11px] text-zinc-500">
                Kredensial Service Account telah aktif. Setiap notifikasi yang Anda kirim akan langsung diproses dan disiarkan ke pengguna aplikasi mobile.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowSetupGuide(false)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-medium hover:bg-zinc-800 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
