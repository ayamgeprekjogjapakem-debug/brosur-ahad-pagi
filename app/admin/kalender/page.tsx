'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, 
  X, Globe, Settings2, Sparkles, RefreshCw, CheckCircle2, 
  Moon, Sun, Compass, SlidersHorizontal, Check, ShieldCheck,
  Code2, Copy, Play, ArrowRight, ExternalLink
} from 'lucide-react';
import { format, startOfMonth, getDay, getDaysInMonth } from 'date-fns';
import { id } from 'date-fns/locale';

interface AladhanTiming {
  timings: {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Sunset: string;
    Maghrib: string;
    Isha: string;
  };
  date: {
    readable: string;
    timestamp: string;
    gregorian: {
      date: string;
      day: string;
      weekday: { en: string };
      month: { number: number; en: string };
      year: string;
    };
    hijri: {
      date: string;
      day: string;
      month: { number: number; en: string; ar: string };
      year: string;
    };
  };
}

const LOCATIONS = [
  { city: 'Yogyakarta', country: 'Indonesia', label: 'Yogyakarta, Indonesia' },
  { city: 'Jakarta', country: 'Indonesia', label: 'Jakarta, Indonesia' },
  { city: 'Bandung', country: 'Indonesia', label: 'Bandung, Indonesia' },
  { city: 'Surabaya', country: 'Indonesia', label: 'Surabaya, Indonesia' },
  { city: 'Makassar', country: 'Indonesia', label: 'Makassar, Indonesia' },
  { city: 'Makkah', country: 'Saudi Arabia', label: 'Makkah, Saudi Arabia' },
  { city: 'Madinah', country: 'Saudi Arabia', label: 'Madinah, Saudi Arabia' },
];

const METHODS = [
  { value: 20, label: 'Kementerian Agama RI' },
  { value: 3, label: 'Muslim World League' },
  { value: 4, label: 'Umm Al-Qura, Makkah' },
  { value: 11, label: 'MUIS Singapura' },
];

export function getPasaran(dateStr: string) {
  const [d, m, y] = dateStr.split('-');
  const date = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0));
  const diffDays = Math.floor(date.getTime() / 86400000);
  const pasaranArr = ['Wage', 'Kliwon', 'Legi', 'Pahing', 'Pon'];
  let index = diffDays % 5;
  if (index < 0) index += 5;
  return pasaranArr[index];
}

export default function AdminKalenderPage() {
  const [activeTab, setActiveTab] = useState<'kalender' | 'api_docs'>('kalender');
  const [data, setData] = useState<AladhanTiming[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<AladhanTiming | null>(null);

  // Filter & Config States
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [selectedMethod, setSelectedMethod] = useState(METHODS[0].value);
  const [hijriAdjustment, setHijriAdjustment] = useState(-1);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // API Playground State
  const [apiFilterType, setApiFilterType] = useState<'today' | 'month' | 'year' | 'range'>('today');
  const [apiCity, setApiCity] = useState('Yogyakarta');
  const [apiYear, setApiYear] = useState('2026');
  const [apiMonth, setApiMonth] = useState('10');
  const [apiStartYear, setApiStartYear] = useState('2025');
  const [apiEndYear, setApiEndYear] = useState('2026');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Filter Flags
  const [filters, setFilters] = useState({
    showSunnah: true,
    showRamadhan: true,
    showWeton: true,
    showHolidays: true
  });

  // Waktu Live
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Calendar
  const fetchCalendar = async (year: number, month: number, city: string, country: string, method: number, adjustment: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.aladhan.com/v1/calendarByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&month=${month}&year=${year}`
      );
      if (!response.ok) throw new Error('Gagal mengambil data kalender');
      
      const result = await response.json();
      if (result.code === 200) {
        const adjustedData = result.data.map((dayItem: any, index: number, arr: any[]) => {
          if (adjustment === 0) return dayItem;
          const sourceIndex = index + adjustment;
          let hijriData = dayItem.date.hijri;
          
          if (sourceIndex >= 0 && sourceIndex < arr.length) {
            hijriData = arr[sourceIndex].date.hijri;
          } else {
            const rawDay = parseInt(dayItem.date.hijri.day, 10);
            let newDay = rawDay + adjustment;
            if (newDay <= 0) newDay = 30 + newDay; 
            if (newDay > 30) newDay = newDay - 30;
            hijriData = {
              ...dayItem.date.hijri,
              day: newDay.toString().padStart(2, '0')
            };
          }
          return {
            ...dayItem,
            date: { ...dayItem.date, hijri: hijriData }
          };
        });
        setData(adjustedData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Auto Sinkron Kemenag
  const autoCalibrate = async () => {
    setIsCalibrating(true);
    try {
      const mabimsRes = await fetch('https://api.mabims.dev/api/v1/today');
      const mabimsData = await mabimsRes.json();
      const mabimsDay = mabimsData.output.day;

      const todayDate = format(new Date(), 'dd-MM-yyyy');
      const aladhanRes = await fetch(`https://api.aladhan.com/v1/timingsByCity/${todayDate}?city=Jakarta&country=Indonesia&method=20`);
      const aladhanData = await aladhanRes.json();
      const aladhanDay = parseInt(aladhanData.data.date.hijri.day, 10);
      
      const diff = mabimsDay - aladhanDay;
      if (diff >= -3 && diff <= 3) {
        setHijriAdjustment(diff);
        setToastMessage(`Tersinkronisasi otomatis dengan Kemenag (koreksi ${diff > 0 ? '+' : ''}${diff} hari).`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCalibrating(false);
    }
  };

  useEffect(() => {
    fetchCalendar(
      currentDate.getFullYear(), 
      currentDate.getMonth() + 1, 
      selectedLocation.city, 
      selectedLocation.country, 
      selectedMethod,
      hijriAdjustment
    );
  }, [currentDate, selectedLocation, selectedMethod, hijriAdjustment]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const todayDateStr = format(new Date(), 'dd-MM-yyyy');
  const monthStart = startOfMonth(currentDate);
  const startingDayIndex = getDay(monthStart);
  const daysInMonth = getDaysInMonth(currentDate);
  const emptyCellsPrefix = Array.from({ length: startingDayIndex }).map((_, i) => i);

  // Time Clocks
  const timezones = [
    { name: 'WIB (Yogyakarta)', tz: 'Asia/Jakarta' },
    { name: 'Makkah', tz: 'Asia/Riyadh' },
    { name: 'London', tz: 'Europe/London' },
  ];

  const getTimeString = (tz: string) => {
    try {
      return new Intl.DateTimeFormat('id-ID', { 
        timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).format(now).replace(/\./g, ':');
    } catch {
      return '--:--:--';
    }
  };

  // Generate Endpoint URL untuk Playground
  const generatedApiUrl = (() => {
    const base = '/api/kalender';
    const params = new URLSearchParams();
    params.set('filter', apiFilterType);
    params.set('city', apiCity);

    if (apiFilterType === 'month') {
      params.set('year', apiYear);
      params.set('month', apiMonth);
    } else if (apiFilterType === 'year') {
      params.set('year', apiYear);
    } else if (apiFilterType === 'range') {
      params.set('start_year', apiStartYear);
      params.set('end_year', apiEndYear);
    }

    return `${base}?${params.toString()}`;
  })();

  const executeApiPlayground = async () => {
    setApiLoading(true);
    try {
      const res = await fetch(generatedApiUrl);
      const json = await res.json();
      setApiResponse(json);
    } catch (e: any) {
      setApiResponse({ success: false, error: e.message });
    } finally {
      setApiLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16 font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-lg border border-zinc-800 animate-in slide-in-from-bottom-5 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold">{toastMessage}</p>
        </div>
      )}

      {/* Header Clean Gemini */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Kalender & Waktu Sholat
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
              <ShieldCheck size={12} />
              <span>Standar Kemenag</span>
            </span>
          </div>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Sinkronisasi penanggalan Hijriah, pasaran Jawa, jadwal sholat, serta dokumentasi REST API lengkap.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={autoCalibrate}
            disabled={isCalibrating}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-medium transition shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={14} className={isCalibrating ? 'animate-spin' : ''} />
            <span>{isCalibrating ? 'Menyinkronkan...' : 'Auto Sinkron Kemenag'}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigasi: Tampilan Kalender & Dokumentasi API */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100/70 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('kalender')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'kalender'
              ? 'bg-white text-emerald-700 font-bold'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <CalendarIcon size={14} className={activeTab === 'kalender' ? 'text-emerald-600' : ''} />
          <span>Tampilan Kalender</span>
        </button>

        <button
          onClick={() => setActiveTab('api_docs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'api_docs'
              ? 'bg-white text-emerald-700 font-bold'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Code2 size={14} className={activeTab === 'api_docs' ? 'text-emerald-600' : ''} />
          <span>Dokumentasi API & Tester</span>
        </button>
      </div>

      {activeTab === 'kalender' ? (
        <>
          {/* Jam Dunia (Cards Flat Bersih) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {timezones.map(tz => (
              <div key={tz.name} className="p-4 rounded-2xl bg-[#FAFAFA] flex flex-col justify-between">
                <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">{tz.name}</span>
                <div className="text-2xl font-bold text-zinc-900 tracking-tight font-mono my-1">
                  {getTimeString(tz.tz)}
                </div>
                <span className="text-[10px] text-zinc-400">Waktu Aktual Real-time</span>
              </div>
            ))}
          </div>

          {/* Panel Pengaturan Ringkas & Flat (AI Agent Style) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAFAFA] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-emerald-600 shrink-0" />
              <span className="text-zinc-500 font-medium">Wilayah:</span>
              <select
                value={selectedLocation.city}
                onChange={(e) => {
                  const loc = LOCATIONS.find(l => l.city === e.target.value);
                  if (loc) setSelectedLocation(loc);
                }}
                className="bg-white px-3 py-1.5 rounded-xl border-none outline-none font-semibold text-zinc-800 cursor-pointer"
              >
                {LOCATIONS.map(loc => (
                  <option key={loc.city} value={loc.city}>{loc.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2.5">
              <SlidersHorizontal size={14} className="text-zinc-400 shrink-0" />
              <span className="text-zinc-500 font-medium">Koreksi Hijriah:</span>
              <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-xl">
                <button 
                  onClick={() => setHijriAdjustment(p => Math.max(-3, p - 1))}
                  className="text-zinc-400 hover:text-zinc-900 font-bold px-1"
                >
                  -
                </button>
                <span className="font-bold text-emerald-700 min-w-[48px] text-center">
                  {hijriAdjustment > 0 ? `+${hijriAdjustment}` : hijriAdjustment} Hari
                </span>
                <button 
                  onClick={() => setHijriAdjustment(p => Math.min(3, p + 1))}
                  className="text-zinc-400 hover:text-zinc-900 font-bold px-1"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFilters(f => ({ ...f, showSunnah: !f.showSunnah }))}
                className={`px-3 py-1.5 rounded-xl font-medium transition ${
                  filters.showSunnah ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-white text-zinc-500'
                }`}
              >
                Puasa Sunnah
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, showWeton: !f.showWeton }))}
                className={`px-3 py-1.5 rounded-xl font-medium transition ${
                  filters.showWeton ? 'bg-emerald-50 text-emerald-700 font-bold' : 'bg-white text-zinc-500'
                }`}
              >
                Weton Jawa
              </button>
            </div>
          </div>

          {/* Main Calendar Matrix Flat Clean */}
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-[#FAFAFA] p-2.5 sm:p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevMonth}
                  className="p-2 bg-white hover:bg-zinc-100 rounded-xl text-zinc-600 transition"
                  title="Bulan Sebelumnya"
                >
                  <ChevronLeft size={16} />
                </button>
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 px-2">
                  {format(currentDate, 'MMMM yyyy', { locale: id })}
                </h2>
                <button
                  onClick={handleNextMonth}
                  className="p-2 bg-white hover:bg-zinc-100 rounded-xl text-zinc-600 transition"
                  title="Bulan Berikutnya"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <button
                onClick={handleToday}
                className="px-3.5 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-xl transition"
              >
                Hari Ini
              </button>
            </div>

            <div className="rounded-2xl border border-zinc-100 overflow-hidden bg-white">
              <div className="grid grid-cols-7 border-b border-zinc-100 bg-[#FAFAFA] text-center text-[11px] font-bold py-2.5">
                <span className="text-red-500">Ahad</span>
                <span className="text-zinc-600">Senin</span>
                <span className="text-zinc-600">Selasa</span>
                <span className="text-zinc-600">Rabu</span>
                <span className="text-zinc-600">Kamis</span>
                <span className="text-emerald-700 font-extrabold">Jumat</span>
                <span className="text-zinc-600">Sabtu</span>
              </div>

              <div className="grid grid-cols-7 gap-[1px] bg-zinc-100">
                {emptyCellsPrefix.map((i) => (
                  <div key={`empty-${i}`} className="min-h-[85px] sm:min-h-[105px] bg-[#FAFAFA]/50 p-2" />
                ))}

                {data.slice(0, daysInMonth).map((day, index) => {
                  const isToday = day.date.gregorian.date === todayDateStr;
                  const dateNum = parseInt(day.date.gregorian.day, 10);
                  const isSunday = (startingDayIndex + index) % 7 === 0;

                  const hijriDayNum = parseInt(day.date.hijri.day, 10);
                  const hijriMonthNum = day.date.hijri.month.number;
                  const gregorianDayName = day.date.gregorian.weekday.en;

                  const pasaran = filters.showWeton ? getPasaran(day.date.gregorian.date) : null;
                  const ayyamulBidh = filters.showSunnah && [13, 14, 15].includes(hijriDayNum) && hijriMonthNum !== 9;
                  const seninKamis = filters.showSunnah && (gregorianDayName === 'Monday' || gregorianDayName === 'Thursday') && hijriMonthNum !== 9;
                  const isPuasa = ayyamulBidh || seninKamis;

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={`min-h-[85px] sm:min-h-[105px] p-2 text-left flex flex-col justify-between transition group relative ${
                        isToday 
                          ? 'bg-emerald-50/70 hover:bg-emerald-50' 
                          : 'bg-white hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <span className={`text-sm sm:text-base font-bold ${
                          isSunday ? 'text-red-500' : isToday ? 'text-emerald-700' : 'text-zinc-900'
                        }`}>
                          {dateNum}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md ${
                          isToday ? 'bg-emerald-600 text-white' : 'text-zinc-400 bg-zinc-100 group-hover:bg-zinc-200'
                        }`}>
                          {day.date.hijri.day}
                        </span>
                      </div>

                      <div className="space-y-0.5 mt-1">
                        {pasaran && (
                          <div className="text-[10px] font-semibold text-zinc-400 truncate">
                            {pasaran}
                          </div>
                        )}
                        {isPuasa && (
                          <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-1 py-0.2 rounded truncate max-w-full">
                            {ayyamulBidh ? 'A. Bidh' : 'Puasa'}
                          </span>
                        )}
                      </div>

                      {isToday && (
                        <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider mt-auto">
                          Hari Ini
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Tab 2: Dokumentasi API & Interactive Tester */
        <div className="space-y-6">
          
          {/* Dokumentasi Filter Spesifikasi */}
          <div className="p-5 rounded-2xl bg-[#FAFAFA] space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Spesifikasi Endpoint API Kalender</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Endpoint resmi untuk integrasi data kalender Masehi, Hijriah, pasaran Jawa, dan jadwal waktu sholat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-white rounded-xl border border-zinc-200/70 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800">GET</span>
                  <code className="font-mono text-zinc-800 font-bold">/api/kalender?filter=today</code>
                </div>
                <p className="text-zinc-500 text-[11px]">Mengambil data spesifik hari ini (tanggal Masehi, Hijriah, pasaran, jadwal sholat lengkap).</p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-zinc-200/70 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800">GET</span>
                  <code className="font-mono text-zinc-800 font-bold">/api/kalender?filter=month&year=2026&month=10</code>
                </div>
                <p className="text-zinc-500 text-[11px]">Filter data satu bulan penuh berdasarkan parameter bulan (1-12) dan tahun.</p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-zinc-200/70 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800">GET</span>
                  <code className="font-mono text-zinc-800 font-bold">/api/kalender?filter=year&year=2026</code>
                </div>
                <p className="text-zinc-500 text-[11px]">Filter data tahunan lengkap 12 bulan (365/366 hari) dalam satu payload.</p>
              </div>

              <div className="p-3.5 bg-white rounded-xl border border-zinc-200/70 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-100 text-emerald-800">GET</span>
                  <code className="font-mono text-zinc-800 font-bold">/api/kalender?filter=range&start_year=2025&end_year=2026</code>
                </div>
                <p className="text-zinc-500 text-[11px]">Filter rentang tahunan (range) antar tahun untuk perbandingan arsip.</p>
              </div>
            </div>
          </div>

          {/* Interactive API Tester / Playground */}
          <div className="p-5 rounded-2xl bg-[#FAFAFA] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-emerald-600" />
                <h3 className="text-sm font-bold text-zinc-900">Interactive API Playground</h3>
              </div>
              <span className="text-[11px] text-zinc-400">Uji endpoint langsung secara interaktif</span>
            </div>

            {/* Parameter Builder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-zinc-500 font-medium mb-1">Tipe Filter</label>
                <select
                  value={apiFilterType}
                  onChange={(e: any) => setApiFilterType(e.target.value)}
                  className="w-full bg-white p-2.5 rounded-xl border border-zinc-200/80 outline-none font-semibold text-zinc-800"
                >
                  <option value="today">Hari Ini (today)</option>
                  <option value="month">Bulanan (month)</option>
                  <option value="year">Tahunan (year)</option>
                  <option value="range">Range Tahun (range)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-500 font-medium mb-1">Kota / Wilayah</label>
                <input
                  type="text"
                  value={apiCity}
                  onChange={(e) => setApiCity(e.target.value)}
                  className="w-full bg-white p-2.5 rounded-xl border border-zinc-200/80 outline-none font-medium text-zinc-800"
                />
              </div>

              {apiFilterType === 'month' && (
                <>
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Bulan (1-12)</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={apiMonth}
                      onChange={(e) => setApiMonth(e.target.value)}
                      className="w-full bg-white p-2.5 rounded-xl border border-zinc-200/80 outline-none font-medium text-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Tahun</label>
                    <input
                      type="number"
                      value={apiYear}
                      onChange={(e) => setApiYear(e.target.value)}
                      className="w-full bg-white p-2.5 rounded-xl border border-zinc-200/80 outline-none font-medium text-zinc-800"
                    />
                  </div>
                </>
              )}

              {apiFilterType === 'year' && (
                <div>
                  <label className="block text-zinc-500 font-medium mb-1">Tahun</label>
                  <input
                    type="number"
                    value={apiYear}
                    onChange={(e) => setApiYear(e.target.value)}
                    className="w-full bg-white p-2.5 rounded-xl border border-zinc-200/80 outline-none font-medium text-zinc-800"
                  />
                </div>
              )}

              {apiFilterType === 'range' && (
                <>
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Tahun Awal</label>
                    <input
                      type="number"
                      value={apiStartYear}
                      onChange={(e) => setApiStartYear(e.target.value)}
                      className="w-full bg-white p-2.5 rounded-xl border border-zinc-200/80 outline-none font-medium text-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 font-medium mb-1">Tahun Akhir</label>
                    <input
                      type="number"
                      value={apiEndYear}
                      onChange={(e) => setApiEndYear(e.target.value)}
                      className="w-full bg-white p-2.5 rounded-xl border border-zinc-200/80 outline-none font-medium text-zinc-800"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Generated URL & Run Button */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
              <div className="flex-1 bg-white p-2.5 rounded-xl border border-zinc-200/80 flex items-center justify-between text-xs font-mono text-zinc-800 overflow-x-auto">
                <span className="truncate">{generatedApiUrl}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(window.location.origin + generatedApiUrl)}
                  className="p-1 text-zinc-400 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition shrink-0 ml-2"
                  title="Salin URL lengkap"
                >
                  {copiedUrl ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>

              <button
                type="button"
                onClick={executeApiPlayground}
                disabled={apiLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition shrink-0 shadow-sm disabled:opacity-50"
              >
                {apiLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Eksekusi Request</span>
              </button>
            </div>

            {/* Output Preview */}
            {apiResponse && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Hasil Respon JSON:</span>
                  {apiResponse.total_hari && (
                    <span className="font-semibold text-emerald-700">Total: {apiResponse.total_hari} data hari</span>
                  )}
                </div>
                <pre className="p-4 bg-zinc-900 text-emerald-400 rounded-2xl text-xs font-mono max-h-80 overflow-y-auto leading-relaxed custom-scrollbar">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            )}

          </div>

        </div>
      )}

      {/* Modal Popup Detail Jadwal Sholat Clean */}
      {selectedDay && (
        <div 
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedDay(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-5 shadow-xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {selectedDay.date.gregorian.day} {selectedDay.date.gregorian.month.en} {selectedDay.date.gregorian.year}
                </h3>
                <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                  {selectedDay.date.hijri.day} {selectedDay.date.hijri.month.en} {selectedDay.date.hijri.year} H
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded-xl hover:bg-zinc-100 transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Waktu Sholat ({selectedLocation.city})
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { name: 'Subuh', time: selectedDay.timings.Fajr },
                  { name: 'Terbit', time: selectedDay.timings.Sunrise },
                  { name: 'Dzuhur', time: selectedDay.timings.Dhuhr },
                  { name: 'Ashar', time: selectedDay.timings.Asr },
                  { name: 'Maghrib', time: selectedDay.timings.Maghrib },
                  { name: 'Isya', time: selectedDay.timings.Isha },
                ].map(item => (
                  <div key={item.name} className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#FAFAFA]">
                    <span className="text-xs font-medium text-zinc-600">{item.name}</span>
                    <span className="text-xs font-bold text-zinc-900 font-mono">{item.time.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelectedDay(null)}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
