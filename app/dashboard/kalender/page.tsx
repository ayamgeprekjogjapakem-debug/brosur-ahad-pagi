'use client';

import { useState, useEffect } from 'react';
import { Clock, MapPin, ChevronLeft, ChevronRight, X, Globe, Settings2, CalendarDays, Sparkles } from 'lucide-react';
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
      format: string;
      day: string;
      weekday: {
        en: string;
      };
      month: {
        number: number;
        en: string;
      };
      year: string;
    };
    hijri: {
      date: string;
      format: string;
      day: string;
      month: {
        number: number;
        en: string;
        ar: string;
      };
      year: string;
      designation: {
        abbreviated: string;
        expanded: string;
      };
    };
  };
}

const LOCATIONS = [
  { city: 'Jakarta', country: 'Indonesia', label: 'Jakarta, Indonesia' },
  { city: 'Yogyakarta', country: 'Indonesia', label: 'Yogyakarta, Indonesia' },
  { city: 'Bandung', country: 'Indonesia', label: 'Bandung, Indonesia' },
  { city: 'Surabaya', country: 'Indonesia', label: 'Surabaya, Indonesia' },
  { city: 'Makassar', country: 'Indonesia', label: 'Makassar, Indonesia' },
  { city: 'Makkah', country: 'Saudi Arabia', label: 'Makkah, Saudi Arabia' },
  { city: 'Madinah', country: 'Saudi Arabia', label: 'Madinah, Saudi Arabia' },
  { city: 'Kuala Lumpur', country: 'Malaysia', label: 'Kuala Lumpur, Malaysia' },
  { city: 'London', country: 'United Kingdom', label: 'London, UK' },
];

const METHODS = [
  { value: 20, label: 'Kementerian Agama RI' },
  { value: 3, label: 'Muslim World League' },
  { value: 4, label: 'Umm Al-Qura Univ, Makkah' },
  { value: 2, label: 'ISNA (North America)' },
  { value: 5, label: 'Egyptian General Authority' },
  { value: 11, label: 'Majelis Ugama Islam Singapura' },
];

const API_SOURCES = [
  { id: 'aladhan', name: 'Aladhan API (Global)' },
  { id: 'mabims', name: 'Mabims.dev (Kemenag)' },
  { id: 'myquran', name: 'API myQuran' },
];

export function getPasaran(dateStr: string) {
  const [d, m, y] = dateStr.split('-');
  const date = new Date(Date.UTC(parseInt(y), parseInt(m)-1, parseInt(d), 12, 0, 0));
  const diffDays = Math.floor(date.getTime() / 86400000);
  const pasaranArr = ['Wage', 'Kliwon', 'Legi', 'Pahing', 'Pon'];
  let index = diffDays % 5;
  if (index < 0) index += 5;
  return pasaranArr[index];
}

export default function KalenderPage() {
  const [data, setData] = useState<AladhanTiming[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<AladhanTiming | null>(null);

  // Filter States
  const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);
  const [selectedMethod, setSelectedMethod] = useState(METHODS[0].value);
  const [selectedApi, setSelectedApi] = useState(API_SOURCES[0].id);
  const [hijriAdjustment, setHijriAdjustment] = useState(-1);

  // Analysis States
  const [publicStandard, setPublicStandard] = useState<any>(null);
  const [aladhanTodayRaw, setAladhanTodayRaw] = useState<number | null>(null);
  const [mabimsTodayRaw, setMabimsTodayRaw] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    showSunnah: true,
    showRamadhan: true,
    showWeton: true,
    showHolidays: true
  });

  useEffect(() => {
    // Load public standard
    const std = localStorage.getItem('kalender_standard');
    if (std) {
      try {
        const parsed = JSON.parse(std);
        setPublicStandard(parsed);
        if (parsed.filters) setFilters(parsed.filters);
      } catch(e) {}
    }

    // Load raw comparison for analysis
    const loadAnalysis = async () => {
      try {
        const mabimsRes = await fetch('https://api.mabims.dev/api/v1/today');
        const mabimsData = await mabimsRes.json();
        setMabimsTodayRaw(mabimsData.output.day);

        const todayDate = format(new Date(), 'dd-MM-yyyy');
        const aladhanRes = await fetch(`https://api.aladhan.com/v1/timingsByCity/${todayDate}?city=Jakarta&country=Indonesia&method=20`);
        const aladhanData = await aladhanRes.json();
        setAladhanTodayRaw(parseInt(aladhanData.data.date.hijri.day, 10));
      } catch(e) {
        console.error('Failed to load analysis', e);
      }
    };
    loadAnalysis();
  }, []);

  // Waktu dunia aktual
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchCalendar = async (year: number, month: number, city: string, country: string, method: number, adjustment: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.aladhan.com/v1/calendarByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&month=${month}&year=${year}`
      );
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data kalender');
      }
      
      const result = await response.json();
      if (result.code === 200) {
        // Terapkan penyesuaian Hijriah secara manual dengan menggeser array (Client-side Shift)
        const adjustedData = result.data.map((dayItem: any, index: number, arr: any[]) => {
          if (adjustment === 0) return dayItem;
          
          const sourceIndex = index + adjustment;
          let hijriData = dayItem.date.hijri;
          
          if (sourceIndex >= 0 && sourceIndex < arr.length) {
            hijriData = arr[sourceIndex].date.hijri;
          } else {
            // Fallback sederhana jika indeks di luar bulan saat ini
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
            date: {
              ...dayItem.date,
              hijri: hijriData
            }
          };
        });
        
        setData(adjustedData);
      } else {
        throw new Error(result.data || 'Terjadi kesalahan');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-Calibrate Hijri based on Mabims (Kemenag Real Data)
  const [isCalibrating, setIsCalibrating] = useState(false);
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
      }
    } catch (e) {
      console.error('Gagal auto-kalibrasi', e);
    } finally {
      setIsCalibrating(false);
    }
  };

  useEffect(() => {
    if (selectedApi === 'mabims') {
      autoCalibrate();
    }
  }, [selectedApi]);

  useEffect(() => {
    const methodToUse = (selectedApi === 'mabims' || selectedApi === 'myquran') ? 20 : selectedMethod;
    fetchCalendar(
      currentDate.getFullYear(), 
      currentDate.getMonth() + 1, 
      selectedLocation.city, 
      selectedLocation.country, 
      methodToUse,
      hijriAdjustment
    );
  }, [currentDate, selectedLocation, selectedMethod, selectedApi, hijriAdjustment]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const todayDateStr = format(new Date(), 'dd-MM-yyyy');
  const monthStart = startOfMonth(currentDate);
  const startingDayIndex = getDay(monthStart);
  const daysInMonth = getDaysInMonth(currentDate);
  const emptyCellsPrefix = Array.from({ length: startingDayIndex }).map((_, i) => i);
  
  const timezones = [
    { name: 'Jakarta', tz: 'Asia/Jakarta' },
    { name: 'Makkah', tz: 'Asia/Riyadh' },
    { name: 'London', tz: 'Europe/London' },
    { name: 'New York', tz: 'America/New_York' },
    { name: 'Tokyo', tz: 'Asia/Tokyo' },
  ];

  const getTimeParts = (tz: string) => {
    try {
      const timeStr = new Intl.DateTimeFormat('id-ID', { 
        timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit'
      }).format(now).replace(/\./g, ':');
      const [h, m, s] = timeStr.split(':');
      return { h, m, s };
    } catch {
      return { h: '--', m: '--', s: '--' };
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto py-6 md:py-8 font-sans antialiased text-slate-800 select-none space-y-6">
      
      {/* Header Banner Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-medium mb-2">
            <CalendarDays size={12} className="text-emerald-600" />
            <span>Kalender & Jadwal Sholat</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Kalender Hijriah &{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 bg-clip-text text-transparent font-extrabold">
              Waktu Sholat
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal leading-relaxed">
            Sinkronisasi kalender astronomi global, penanggalan Hijriah Kemenag RI, pasaran Jawa, dan jadwal sholat terpadu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={autoCalibrate}
            disabled={isCalibrating}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition shrink-0"
          >
            <Sparkles size={13} className={isCalibrating ? "animate-spin text-emerald-600" : "text-emerald-600"} />
            <span>{isCalibrating ? 'Menyinkronkan...' : 'Auto Sinkron Kemenag'}</span>
          </button>
          <button
            onClick={handleToday}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shrink-0 active:scale-[0.98]"
          >
            <span>Hari Ini</span>
          </button>
        </div>
      </div>

      {/* SECTION: Waktu Dunia & Pengaturan */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Jam Dunia */}
        <div className="xl:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-none flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Jam Dunia</h3>
              <p className="text-xs text-slate-500">Sinkronisasi langsung zona waktu internasional</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-auto">
            {timezones.map(tz => {
              const time = getTimeParts(tz.tz);
              return (
                <div key={tz.name} className="flex flex-col p-3 bg-slate-50/70 rounded-xl border border-slate-200/70 hover:border-emerald-300 transition-colors">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tz.name}</span>
                  <div className="flex items-baseline font-mono tracking-tight">
                    <span className="text-xl sm:text-2xl font-bold text-slate-900">{time.h}:{time.m}</span>
                    <span className="text-[11px] font-semibold text-slate-400 ml-0.5">:{time.s}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pengaturan Kalender */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-none flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
              <Settings2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pengaturan Kalender</h3>
              <p className="text-xs text-slate-500">Konfigurasi lokasi dan metode hisab</p>
            </div>
          </div>
          
          <div className="space-y-3 flex-1 flex flex-col justify-center text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600">Wilayah / Kota</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl p-2.5 outline-none focus:border-emerald-500 transition cursor-pointer"
                value={selectedLocation.city}
                onChange={(e) => {
                  const loc = LOCATIONS.find(l => l.city === e.target.value);
                  if (loc) setSelectedLocation(loc);
                }}
              >
                {LOCATIONS.map(loc => (
                  <option key={loc.city} value={loc.city}>{loc.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Sumber API</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl p-2.5 outline-none focus:border-emerald-500 transition cursor-pointer truncate"
                  value={selectedApi}
                  onChange={(e) => setSelectedApi(e.target.value)}
                >
                  {API_SOURCES.map(api => (
                    <option key={api.id} value={api.id}>{api.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Metode</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl p-2.5 outline-none focus:border-emerald-500 transition cursor-pointer truncate disabled:opacity-50"
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(Number(e.target.value))}
                  disabled={selectedApi !== 'aladhan'}
                >
                  {METHODS.map(method => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-1 pt-1">
              <label className="text-[11px] font-semibold text-slate-600 flex justify-between items-center">
                <span>Koreksi Hijriah</span>
                <span className="font-bold text-emerald-700 font-mono">{hijriAdjustment > 0 ? `+${hijriAdjustment}` : hijriAdjustment} Hari</span>
              </label>
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setHijriAdjustment(prev => prev - 1)} 
                  className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition text-slate-700 font-bold shrink-0 text-xs"
                >
                  -
                </button>
                <input 
                  type="range" 
                  min="-3" 
                  max="3" 
                  step="1" 
                  value={hijriAdjustment}
                  onChange={(e) => setHijriAdjustment(parseInt(e.target.value))}
                  className="w-full accent-emerald-600 bg-slate-200 h-1 rounded-full outline-none cursor-pointer"
                />
                <button 
                  onClick={() => setHijriAdjustment(prev => prev + 1)} 
                  className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition text-slate-700 font-bold shrink-0 text-xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Filtrasi Event & Tampilan */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-[11px] font-semibold text-slate-600">Filtrasi Event & Tampilan</label>
              
              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: 'showSunnah', label: 'Puasa Sunnah (Ayyamul Bidh & Senin-Kamis)' },
                  { id: 'showRamadhan', label: 'Puasa Ramadhan' },
                  { id: 'showWeton', label: 'Weton Pasaran Jawa' },
                  { id: 'showHolidays', label: 'Libur Nasional' }
                ].map(toggle => (
                  <label key={toggle.id} className="flex items-center gap-2.5 bg-slate-50/70 p-2 rounded-lg border border-slate-200/60 cursor-pointer hover:border-emerald-300 transition">
                    <input 
                      type="checkbox" 
                      className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                      checked={filters[toggle.id as keyof typeof filters]}
                      onChange={(e) => setFilters({...filters, [toggle.id]: e.target.checked})}
                    />
                    <span className="text-[11px] font-medium text-slate-700">{toggle.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Simpan Standar Publik */}
            <button 
              onClick={() => {
                const newData = {
                  city: selectedLocation.city,
                  country: selectedLocation.country,
                  label: selectedLocation.label,
                  method: selectedMethod,
                  api: selectedApi,
                  adjustment: hijriAdjustment,
                  filters: filters
                };
                localStorage.setItem('kalender_standard', JSON.stringify(newData));
                setPublicStandard(newData);
                alert('Berhasil disimpan sebagai Standar Publik!');
              }}
              className="mt-2 w-full py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2"
            >
              <span>Simpan Standar Publik</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION: Analisis Akurasi & Publikasi */}
      <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5 shadow-none flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex-1 space-y-1.5 text-xs text-emerald-950">
          <h3 className="text-emerald-900 font-bold text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" /> 
            <span>Analisis Akurasi Hari Ini</span>
          </h3>
          <p>Secara Astronomi Murni (Global API): hari ini terdeteksi sebagai tanggal <b className="font-mono">{aladhanTodayRaw || '...'} Hijriah</b>.</p>
          <p>Menurut Keputusan Sidang Isbat Kemenag (Mabims API): hari ini adalah tanggal <b className="font-mono">{mabimsTodayRaw || '...'} Hijriah</b>.</p>
          <div className="font-medium bg-emerald-100/70 p-2.5 rounded-xl border border-emerald-200/80 text-[11px] text-emerald-900 mt-2">
            {aladhanTodayRaw !== null && mabimsTodayRaw !== null 
              ? aladhanTodayRaw === mabimsTodayRaw
                ? "✨ Kedua sistem tersinkronisasi. Anda dapat membiarkan Slider Koreksi di angka 0."
                : `⚠️ Terdapat selisih ${Math.abs(aladhanTodayRaw - mabimsTodayRaw)} hari. Anda disarankan menekan tombol "Auto Sinkron Kemenag" agar kalender sesuai dengan keputusan Kemenag.`
              : "Menganalisa data satelit..."}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 min-w-[280px] w-full md:w-auto shrink-0 text-xs">
          <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-3">Live: Status Kalender Publik</h4>
          {publicStandard ? (
            <div className="space-y-2 text-slate-600 font-medium text-xs">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                <span className="text-slate-400">API Aktif:</span> 
                <span className="font-semibold text-emerald-700">{API_SOURCES.find(a => a.id === publicStandard.api)?.name || publicStandard.api}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                <span className="text-slate-400">Wilayah:</span> 
                <span className="font-semibold text-emerald-700">{publicStandard.city}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Nilai Koreksi:</span> 
                <span className="font-bold text-emerald-700 font-mono">{publicStandard.adjustment > 0 ? `+${publicStandard.adjustment}` : publicStandard.adjustment} Hari</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-2 text-center">Belum ada standar publik yang disimpan.</div>
          )}
        </div>
      </div>

      {/* SECTION: Kalender Utama Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 md:p-6 shadow-none relative min-h-[500px] flex flex-col">
        
        {/* Header Kalender */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
              <CalendarDays size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Jadwal & Penanggalan</h3>
              <div className="flex items-center mt-0.5 gap-2 text-xs text-slate-500">
                <MapPin size={12} className="text-emerald-600" />
                <span>{selectedLocation.label}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[11px] text-slate-600 font-medium">
                  {METHODS.find(m => m.value === (selectedApi !== 'aladhan' ? 20 : selectedMethod))?.label}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white rounded-lg transition text-slate-500 hover:text-slate-900"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-xs">
              <select 
                value={currentDate.getMonth()}
                onChange={(e) => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(parseInt(e.target.value));
                  setCurrentDate(newDate);
                }}
                className="bg-transparent font-bold text-slate-900 outline-none cursor-pointer appearance-none hover:text-emerald-700 transition"
              >
                {Array.from({length: 12}).map((_, i) => (
                  <option key={i} value={i}>{format(new Date(2020, i, 1), 'MMMM', {locale: id})}</option>
                ))}
              </select>
              <select 
                value={currentDate.getFullYear()}
                onChange={(e) => {
                  const newDate = new Date(currentDate);
                  newDate.setFullYear(parseInt(e.target.value));
                  setCurrentDate(newDate);
                }}
                className="bg-transparent text-xs font-semibold text-slate-500 outline-none cursor-pointer appearance-none hover:text-emerald-700 transition font-mono"
              >
                {Array.from({length: 30}).map((_, i) => {
                  const y = new Date().getFullYear() - 15 + i;
                  return <option key={y} value={y}>{y}</option>
                })}
              </select>
            </div>

            <button 
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white rounded-lg transition text-slate-500 hover:text-slate-900"
              title="Bulan Berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 text-rose-700 p-3 rounded-xl mb-4 text-xs font-medium flex items-center border border-rose-200">
            <X size={14} className="mr-1.5 shrink-0" /> {error}
          </div>
        )}

        {/* Grid Kalender */}
        <div className="w-full relative flex-1 flex flex-col">
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-xs flex justify-center items-center rounded-2xl">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-200 border-t-emerald-600 animate-spin"></div>
            </div>
          )}

          {/* Header Hari */}
          <div className="grid grid-cols-7 gap-2 md:gap-3 mb-2">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day, idx) => (
              <div key={day} className={`text-center font-bold text-[10px] md:text-xs tracking-wider uppercase py-1 ${idx === 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 md:gap-3 auto-rows-fr flex-1">
            {/* Empty cells sebelum awal bulan */}
            {emptyCellsPrefix.map((i) => (
              <div key={`empty-${i}`} className="min-h-[80px] md:min-h-[105px] rounded-xl bg-slate-50/50 border border-slate-100 opacity-40"></div>
            ))}
            
            {/* Sel hari dari data */}
            {data.slice(0, daysInMonth).map((day, index) => {
              const isToday = day.date.gregorian.date === todayDateStr;
              const dateNum = parseInt(day.date.gregorian.day, 10);
              const isSunday = (startingDayIndex + index) % 7 === 0;

              // Filter Logic
              const gregorianDayName = day.date.gregorian.weekday.en;
              const hijriDayNum = parseInt(day.date.hijri.day, 10);
              const hijriMonthNum = day.date.hijri.month.number;

              const pasaran = filters.showWeton ? getPasaran(day.date.gregorian.date) : null;
              const ayyamulBidh = filters.showSunnah && [13, 14, 15].includes(hijriDayNum) && hijriMonthNum !== 9;
              const seninKamis = filters.showSunnah && (gregorianDayName === 'Monday' || gregorianDayName === 'Thursday') && hijriMonthNum !== 9;
              const ramadhan = filters.showRamadhan && hijriMonthNum === 9;

              const isPuasa = ayyamulBidh || seninKamis || ramadhan;
              let puasaLabel = '';
              if (ramadhan) puasaLabel = 'Ramadhan';
              else if (ayyamulBidh && seninKamis) puasaLabel = 'Ayyamul Bidh & Senin-Kamis';
              else if (ayyamulBidh) puasaLabel = 'Ayyamul Bidh';
              else if (seninKamis) puasaLabel = 'Puasa Sunnah';

              const dMy = day.date.gregorian.date.substring(0, 5); // "DD-MM"
              const hDm = `${hijriDayNum.toString().padStart(2, '0')}-${hijriMonthNum.toString().padStart(2, '0')}`;
              
              const holidaysObj: Record<string, string> = {
                "01-01": "Tahun Baru Masehi", "01-05": "Hari Buruh", "01-06": "Hari Lahir Pancasila",
                "17-08": "Hari Kemerdekaan RI", "25-12": "Hari Raya Natal",
              };
              const hijriHolidaysObj: Record<string, string> = {
                "01-01": "Tahun Baru Islam", "12-03": "Maulid Nabi", "27-07": "Isra' Mi'raj",
                "01-10": "Idul Fitri", "02-10": "Cuti Bersama", "10-12": "Idul Adha",
              };
              
              const holidayLabel = filters.showHolidays ? (holidaysObj[dMy] || hijriHolidaysObj[hDm]) : null;

              return (
                <button 
                  key={index}
                  onClick={() => setSelectedDay(day)}
                  className={`relative min-h-[90px] md:min-h-[110px] p-2 rounded-xl border text-left group overflow-hidden transition ${
                    holidayLabel ? 'bg-rose-50/50 border-rose-200' :
                    isPuasa ? 'bg-emerald-50/40 border-emerald-200' :
                    isToday 
                      ? 'border-emerald-600 bg-emerald-50/30 ring-1 ring-emerald-500/30' 
                      : 'border-slate-200/80 bg-white hover:border-emerald-300 hover:bg-slate-50/40'
                  }`}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex justify-between items-start">
                      <span className={`text-lg md:text-2xl font-bold tracking-tight font-mono ${isSunday || holidayLabel ? 'text-rose-600' : isToday ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {dateNum}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md font-mono ${
                        holidayLabel ? 'bg-rose-100 text-rose-700' :
                        isPuasa ? 'bg-emerald-100 text-emerald-800' :
                        isToday ? 'bg-emerald-600 text-white' : 
                        'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition'
                      }`}>
                        {day.date.hijri.day}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-0.5 mt-1">
                      {pasaran && <span className="text-[9px] font-bold text-amber-700 tracking-wider uppercase">{pasaran}</span>}
                      {holidayLabel && <span className="text-[9px] font-semibold bg-rose-100 text-rose-700 px-1 py-0.2 rounded inline-block max-w-max truncate border border-rose-200">{holidayLabel}</span>}
                      {isPuasa && <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded inline-block max-w-max truncate border border-emerald-200">{puasaLabel}</span>}
                    </div>

                    <div className="mt-auto hidden md:block">
                      {isToday && !holidayLabel && !isPuasa && (
                        <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider mt-1">
                          Hari Ini
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* POPUP MODAL JADWAL SHOLAT */}
      {selectedDay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedDay(null)}>
          <div 
            className="bg-white rounded-2xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedDay(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X size={16} />
            </button>
            
            <div className="mb-5 pr-6">
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                {selectedDay.date.gregorian.day} {selectedDay.date.gregorian.month.en}
              </h3>
              <p className="text-emerald-700 font-semibold text-sm border-b border-slate-100 pb-3 mt-0.5">
                {selectedDay.date.hijri.day} {selectedDay.date.hijri.month.en} {selectedDay.date.hijri.year} H
              </p>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5 mb-1">
                <Clock size={12} className="text-emerald-600" /> 
                <span>Jadwal Sholat {selectedLocation.city}</span>
              </h4>
              
              <div className="flex flex-col gap-1.5">
                {[
                  { name: 'Subuh', time: selectedDay.timings.Fajr },
                  { name: 'Dzuhur', time: selectedDay.timings.Dhuhr },
                  { name: 'Ashar', time: selectedDay.timings.Asr },
                  { name: 'Maghrib', time: selectedDay.timings.Maghrib },
                  { name: 'Isya', time: selectedDay.timings.Isha },
                ].map((sholat) => (
                  <div key={sholat.name} className="flex justify-between items-center px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200/60">
                    <span className="font-semibold text-xs text-slate-700">{sholat.name}</span>
                    <span className="text-base font-bold text-slate-900 font-mono">{sholat.time.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedDay(null)}
              className="mt-6 w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-semibold transition"
            >
              Tutup Jadwal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
