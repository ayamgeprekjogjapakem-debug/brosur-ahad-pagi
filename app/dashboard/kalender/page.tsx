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
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6 md:space-y-8 font-sans">
      
      {/* SECTION: Waktu Dunia & Pengaturan */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* World Clocks */}
        <div className="xl:col-span-2 bg-white/60  backdrop-blur-xl border border-zinc-200/50  rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-accent/10  flex items-center justify-center text-accent">
              <Globe className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900  tracking-tight">Jam Dunia</h2>
              <p className="text-xs font-medium text-zinc-500 ">Real-time sinkronisasi zona waktu</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-auto">
            {timezones.map(tz => {
              const time = getTimeParts(tz.tz);
              return (
                <div key={tz.name} className="flex-grow flex flex-col p-5 bg-white [#0c0c0e] rounded-2xl border border-zinc-200/80 [0.04] shadow-sm hover:border-accent/40  hover:-translate-y-0.5 transition-all min-w-[140px]">
                  <span className="text-[10px] font-extrabold text-zinc-400  uppercase tracking-widest mb-1.5">{tz.name}</span>
                  <div className="flex items-baseline font-mono tracking-tighter">
                    <span className="text-3xl font-black text-zinc-900 ">{time.h}:{time.m}</span>
                    <span className="text-sm font-bold text-zinc-400  ml-1">:{time.s}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendar Settings */}
        <div className="bg-white/60  backdrop-blur-xl border border-zinc-200/50  rounded-[2rem] p-6 shadow-sm flex flex-col gap-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-zinc-100  flex items-center justify-center text-zinc-600 ">
              <Settings2 className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900  tracking-tight">Pengaturan</h3>
              <p className="text-xs font-medium text-zinc-500 ">Konfigurasi sumber kalender</p>
            </div>
          </div>
          
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400  uppercase tracking-widest px-1">Wilayah / Kota</label>
              <select 
                className="w-full bg-white  border border-zinc-200  text-zinc-800  text-sm font-medium rounded-xl p-3 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all cursor-pointer shadow-sm appearance-none"
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400  uppercase tracking-widest px-1">Sumber API</label>
                <select 
                  className="w-full bg-white  border border-zinc-200  text-zinc-800  text-sm font-medium rounded-xl p-3 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all cursor-pointer shadow-sm appearance-none truncate"
                  value={selectedApi}
                  onChange={(e) => setSelectedApi(e.target.value)}
                >
                  {API_SOURCES.map(api => (
                    <option key={api.id} value={api.id}>{api.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400  uppercase tracking-widest px-1">Metode</label>
                <select 
                  className="w-full bg-white  border border-zinc-200  text-zinc-800  text-sm font-medium rounded-xl p-3 outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all cursor-pointer shadow-sm appearance-none disabled:opacity-50 disabled:bg-zinc-50  truncate"
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
            
            <div className="space-y-1.5 mt-2">
              <label className="text-[10px] font-bold text-zinc-400  uppercase tracking-widest px-1 flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  Koreksi Hijriah
                  {isCalibrating && <span className="animate-pulse w-2 h-2 rounded-full bg-accent inline-block"></span>}
                </span>
                <span className="text-accent font-black">{hijriAdjustment > 0 ? `+${hijriAdjustment}` : hijriAdjustment} Hari</span>
              </label>
              <div className="flex items-center gap-3 bg-white  p-2 rounded-xl border border-zinc-200  shadow-sm relative overflow-hidden group">
                <button onClick={() => setHijriAdjustment(prev => prev - 1)} className="w-8 h-8 flex items-center justify-center bg-zinc-100  rounded-lg hover:bg-zinc-200  transition text-zinc-600  font-bold shrink-0 z-10">-</button>
                <input 
                  type="range" 
                  min="-3" 
                  max="3" 
                  step="1" 
                  value={hijriAdjustment}
                  onChange={(e) => setHijriAdjustment(parseInt(e.target.value))}
                  className="w-full accent-accent bg-zinc-200  h-1 rounded-full outline-none appearance-none cursor-pointer z-10"
                />
                <button onClick={() => setHijriAdjustment(prev => prev + 1)} className="w-8 h-8 flex items-center justify-center bg-zinc-100  rounded-lg hover:bg-zinc-200  transition text-zinc-600  font-bold shrink-0 z-10">+</button>
                
                {/* Auto Sync Button Overlay */}
                <div className="absolute inset-0 bg-white/95  backdrop-blur-sm z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto">
                  <button 
                    onClick={autoCalibrate}
                    disabled={isCalibrating}
                    className="text-[10px] font-bold text-accent uppercase tracking-widest hover:text-emerald-500 transition-colors flex items-center gap-1.5"
                  >
                    {isCalibrating ? 'Menyinkronkan...' : 'Auto Sinkron Kemenag'}
                  </button>
                </div>
              </div>
            </div>

            {/* Filtrasi Event & Tampilan */}
            <div className="space-y-3 mt-4 pt-4 border-t border-zinc-200 ">
              <label className="text-[10px] font-bold text-zinc-400  uppercase tracking-widest px-1">Filtrasi Event & Tampilan</label>
              
              <div className="space-y-2">
                {[
                  { id: 'showSunnah', label: 'Tampilkan Puasa Sunnah (Ayyamul Bidh & Senin Kamis)' },
                  { id: 'showRamadhan', label: 'Tampilkan Puasa Ramadhan' },
                  { id: 'showWeton', label: 'Tampilkan Weton (Pasaran Jawa)' },
                  { id: 'showHolidays', label: 'Tampilkan Libur Nasional' }
                ].map(toggle => (
                  <label key={toggle.id} className="flex items-center gap-3 bg-zinc-50  p-2.5 rounded-xl border border-zinc-100  cursor-pointer hover:border-accent/30 transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-accent rounded focus:ring-accent accent-accent"
                      checked={filters[toggle.id as keyof typeof filters]}
                      onChange={(e) => setFilters({...filters, [toggle.id]: e.target.checked})}
                    />
                    <span className="text-xs font-semibold text-zinc-700 ">{toggle.label}</span>
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
              className="mt-4 w-full py-3 bg-zinc-900  text-white  rounded-xl font-bold hover:bg-accent  hover:text-white transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              Simpan Standar Publik
            </button>
          </div>
        </div>
      </div>

      {/* SECTION: Analisis Akurasi & Publikasi */}
      <div className="bg-emerald-50  border border-emerald-200  rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex-1">
           <h3 className="text-emerald-900  font-bold text-lg mb-3 flex items-center gap-2">
             <Sparkles className="w-5 h-5 text-emerald-600 "/> Analisis Akurasi Hari Ini
           </h3>
           <div className="text-emerald-800  text-sm leading-relaxed max-w-3xl space-y-2">
             <p>Secara Astronomi Murni (Global API), hari ini terdeteksi sebagai tanggal <b>{aladhanTodayRaw || '...'} Hijriah</b>.</p>
             <p>Menurut Keputusan Sidang Isbat Kemenag (Mabims API), hari ini adalah tanggal <b>{mabimsTodayRaw || '...'} Hijriah</b>.</p>
             <div className="font-semibold bg-emerald-100  p-3 rounded-xl mt-3 inline-block border border-emerald-200 ">
               {aladhanTodayRaw !== null && mabimsTodayRaw !== null 
                 ? aladhanTodayRaw === mabimsTodayRaw
                    ? "✨ Kedua sistem tersinkronisasi. Anda dapat membiarkan Slider Koreksi di angka 0."
                    : `⚠️ Terdapat selisih ${Math.abs(aladhanTodayRaw - mabimsTodayRaw)} hari. Anda disarankan menekan tombol "Auto Sinkron" pada panel pengaturan atau menggeser slider koreksi ke angka ${mabimsTodayRaw - aladhanTodayRaw} agar sesuai dengan kalender Kemenag.`
                 : "Menganalisa data satelit..."}
             </div>
           </div>
        </div>

        <div className="bg-white [#111113] p-5 rounded-2xl border border-emerald-100  min-w-[300px] shadow-sm w-full md:w-auto shrink-0">
          <h4 className="text-[11px] font-black text-emerald-500  uppercase tracking-widest mb-4">Live: Status Kalender Publik</h4>
          {publicStandard ? (
            <div className="space-y-3 text-sm text-zinc-600  font-medium">
              <div className="flex justify-between items-center border-b border-zinc-100  pb-2">
                <span>API Aktif:</span> 
                <span className="font-bold text-emerald-700 ">{API_SOURCES.find(a => a.id === publicStandard.api)?.name || publicStandard.api}</span>
              </div>
              <div className="flex justify-between items-center border-b border-zinc-100  pb-2">
                <span>Wilayah:</span> 
                <span className="font-bold text-emerald-700 ">{publicStandard.city}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Nilai Koreksi:</span> 
                <span className="font-black text-emerald-700 ">{publicStandard.adjustment > 0 ? `+${publicStandard.adjustment}` : publicStandard.adjustment} Hari</span>
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-400  italic py-4 text-center">Belum ada standar publik yang disimpan. Tekan tombol "Simpan Standar Publik" pada menu pengaturan di atas.</div>
          )}
        </div>
      </div>

      {/* SECTION: Kalender Utama */}
      <div className="bg-white [#0c0c0e] border border-zinc-200/50 [0.05] rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-zinc-200/20  relative min-h-[600px] flex flex-col">
        
        {/* Header Kalender */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b border-zinc-100 ">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-accent to-accent/80 flex items-center justify-center text-white shadow-lg shadow-accent/20">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900  tracking-tight">Jadwal & Penamaan</h1>
              <div className="flex items-center mt-1.5 gap-2 text-sm font-medium text-zinc-500 ">
                <MapPin className="w-3.5 h-3.5 text-accent" />
                {selectedLocation.label}
                <span className="w-1 h-1 rounded-full bg-zinc-300 "></span>
                <span className="text-xs bg-zinc-100  px-2 py-0.5 rounded-full text-zinc-600 ">
                  {METHODS.find(m => m.value === (selectedApi !== 'aladhan' ? 20 : selectedMethod))?.label}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-50/80  backdrop-blur-md p-2 rounded-2xl border border-zinc-200/80  shrink-0 shadow-sm">
            <button 
              onClick={handlePrevMonth}
              className="p-2 hover:bg-white  hover:shadow-sm rounded-xl transition-all text-zinc-500 hover:text-zinc-900  "
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-1 bg-white  px-3 py-1.5 rounded-xl border border-zinc-100  shadow-sm">
              <select 
                value={currentDate.getMonth()}
                onChange={(e) => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(parseInt(e.target.value));
                  setCurrentDate(newDate);
                }}
                className="bg-transparent font-extrabold text-[15px] text-zinc-900  capitalize tracking-tight outline-none cursor-pointer appearance-none hover:text-accent  transition-colors"
              >
                {Array.from({length: 12}).map((_, i) => (
                  <option key={i} value={i} className="text-black">{format(new Date(2020, i, 1), 'MMMM', {locale: id})}</option>
                ))}
              </select>
              <select 
                value={currentDate.getFullYear()}
                onChange={(e) => {
                  const newDate = new Date(currentDate);
                  newDate.setFullYear(parseInt(e.target.value));
                  setCurrentDate(newDate);
                }}
                className="bg-transparent text-[14px] font-bold text-zinc-500  outline-none cursor-pointer appearance-none hover:text-accent  transition-colors"
              >
                {Array.from({length: 30}).map((_, i) => {
                  const y = new Date().getFullYear() - 15 + i;
                  return <option key={y} value={y} className="text-black">{y}</option>
                })}
              </select>
            </div>

            <button 
              onClick={handleNextMonth}
              className="p-2 hover:bg-white  hover:shadow-sm rounded-xl transition-all text-zinc-500 hover:text-zinc-900  "
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50  text-red-600  p-4 rounded-2xl mb-8 text-sm font-medium flex items-center border border-red-100 ">
            <X className="w-4 h-4 mr-2 shrink-0" /> {error}
          </div>
        )}

        {/* Grid Kalender */}
        <div className="w-full relative flex-1 flex flex-col">
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/60 [#0c0c0e]/60 backdrop-blur-sm flex justify-center items-center rounded-3xl">
              <div className="w-12 h-12 rounded-2xl border-4 border-zinc-100  border-t-accent  animate-spin"></div>
            </div>
          )}

          {/* Header Hari */}
          <div className="grid grid-cols-7 gap-3 md:gap-4 mb-4">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day, idx) => (
              <div key={day} className={`text-center font-bold text-[11px] md:text-xs tracking-widest uppercase py-2 ${idx === 0 ? 'text-red-500 ' : 'text-zinc-400 '}`}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3 md:gap-4 auto-rows-fr flex-1">
            {/* Empty cells sebelum awal bulan */}
            {emptyCellsPrefix.map((i) => (
              <div key={`empty-${i}`} className="min-h-[90px] md:min-h-[120px] rounded-2xl bg-zinc-50/50  border border-zinc-100/50  opacity-40"></div>
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
              else if (ayyamulBidh && seninKamis) puasaLabel = 'Ayyamul Bidh & Senin Kamis';
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
                  className={`relative min-h-[110px] md:min-h-[130px] p-2 md:p-3 rounded-2xl border text-left group overflow-hidden ${
                    holidayLabel ? 'bg-rose-50/50  border-rose-200 ' :
                    isPuasa ? 'bg-emerald-50/50  border-emerald-200 ' :
                    isToday 
                      ? 'border-accent bg-accent/[0.03]  ring-2 ring-accent/20  shadow-[0_4px_20px_rgba(0,0,0,0.03)] ' 
                      : 'border-zinc-200/80  bg-white [#111113] hover:border-accent/40  hover:shadow-lg hover:shadow-zinc-200/40  transition-all duration-300 hover:-translate-y-0.5'
                  }`}
                >
                  <div className="flex flex-col h-full justify-between">
                    <div className="flex justify-between items-start">
                      <span className={`text-xl md:text-3xl font-black tracking-tight ${isSunday || holidayLabel ? 'text-red-500 ' : isToday ? 'text-accent' : 'text-zinc-800 '}`}>
                        {dateNum}
                      </span>
                      <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-lg ${
                        holidayLabel ? 'bg-rose-100 text-rose-700  ' :
                        isPuasa ? 'bg-emerald-100 text-emerald-700  ' :
                        isToday ? 'bg-accent/20 text-accent  ' : 
                        'bg-zinc-100 text-zinc-500   group-hover:bg-accent/10 group-hover:text-accent transition-colors'
                      }`}>
                        {day.date.hijri.day}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1 mt-1">
                      {pasaran && <span className="text-[10px] font-bold text-amber-600  tracking-wider uppercase">{pasaran}</span>}
                      {holidayLabel && <span className="text-[9px] font-bold bg-rose-100  text-rose-700  px-1.5 py-0.5 rounded-md inline-block max-w-max truncate border border-rose-200 ">{holidayLabel}</span>}
                      {isPuasa && <span className="text-[9px] font-bold bg-emerald-100  text-emerald-700  px-1.5 py-0.5 rounded-md inline-block max-w-max truncate border border-emerald-200 ">{puasaLabel}</span>}
                    </div>

                    <div className="mt-auto hidden md:block">
                      {isToday && !holidayLabel && !isPuasa && (
                        <div className="text-[10px] font-black text-accent uppercase tracking-widest mt-2">
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

      {/* POPUP MODAL */}
      {selectedDay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40  backdrop-blur-md transition-opacity" onClick={() => setSelectedDay(null)}>
          <div 
            className="bg-white [#0c0c0e] rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full shadow-2xl    relative transform transition-all scale-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setSelectedDay(null)}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-zinc-100  text-zinc-500 hover:text-red-500 hover:bg-red-50  rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="mb-8 pr-6">
              <h3 className="text-4xl font-black text-zinc-900  mb-2 tracking-tight">
                {selectedDay.date.gregorian.day} {selectedDay.date.gregorian.month.en}
              </h3>
              <p className="text-accent font-bold text-lg border-b border-zinc-100  pb-5">
                {selectedDay.date.hijri.day} {selectedDay.date.hijri.month.en} {selectedDay.date.hijri.year} H
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-bold text-zinc-400  uppercase tracking-widest text-[10px] flex items-center gap-2 mb-2">
                <Clock className="w-3.5 h-3.5" /> Jadwal Sholat {selectedLocation.city}
              </h4>
              
              <div className="flex flex-col gap-2.5">
                {[
                  { name: 'Subuh', time: selectedDay.timings.Fajr },
                  { name: 'Dzuhur', time: selectedDay.timings.Dhuhr },
                  { name: 'Ashar', time: selectedDay.timings.Asr },
                  { name: 'Maghrib', time: selectedDay.timings.Maghrib },
                  { name: 'Isya', time: selectedDay.timings.Isha },
                ].map((sholat) => (
                  <div key={sholat.name} className="flex justify-between items-center px-5 py-3.5 bg-zinc-50  rounded-2xl border border-zinc-100/50  hover:border-accent/30 transition-colors">
                    <span className="font-bold text-sm text-zinc-600 ">{sholat.name}</span>
                    <span className="text-xl font-black text-zinc-900  font-mono tracking-tight">{sholat.time.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              onClick={() => setSelectedDay(null)}
              className="mt-8 w-full py-4 bg-zinc-900  text-white  rounded-2xl font-bold hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Tutup Jadwal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
