'use client';

import { useState, useEffect } from 'react';
import { Clock, MapPin, ChevronLeft, ChevronRight, X, CalendarDays, ArrowLeft } from 'lucide-react';
import { format, startOfMonth, getDay, getDaysInMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

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
    gregorian: { date: string; format: string; day: string; weekday: { en: string; }; month: { number: number; en: string; }; year: string; };
    hijri: { date: string; format: string; day: string; month: { number: number; en: string; ar: string; }; year: string; };
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

export default function PublicKalenderPage() {
  const router = useRouter();
  const params = useParams();
  const slugArray = params?.slug as string[] | undefined;
  const initialMode = (slugArray && slugArray[0] && ['hari', 'bulan', 'tahun'].includes(slugArray[0])) ? slugArray[0] : 'bulan';

  const [data, setData] = useState<AladhanTiming[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<AladhanTiming | null>(null);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);

  // Load from local storage standard
  const [settings, setSettings] = useState({
    city: 'Jakarta',
    country: 'Indonesia',
    label: 'Jakarta, Indonesia',
    method: 20,
    api: 'mabims',
    adjustment: -1,
    filters: {
      showSunnah: true, showRamadhan: true, showWeton: true, showHolidays: true
    }
  });

  useEffect(() => {
    const std = localStorage.getItem('kalender_standard');
    if (std) {
      try {
        setSettings(JSON.parse(std));
      } catch(e) {}
    }

    // Minta lokasi pengguna
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCoords({ lat, lng });
          
          // Reverse geocoding sederhana menggunakan Nominatim (gratis)
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
            const data = await res.json();
            const city = data.address.city || data.address.town || data.address.county || "Lokasi Anda";
            setLocationName(city);
          } catch(e) {
            setLocationName("Lokasi Terdeteksi (GPS)");
          }
        },
        (error) => {
          console.warn("Geolocation denied or failed", error);
        }
      );
    }
  }, []);

  const fetchCalendar = async (year: number, month: number, city: string, country: string, method: number, adjustment: number, userCoords: {lat: number, lng: number} | null) => {
    setLoading(true);
    setError(null);
    try {
      let url = `https://api.aladhan.com/v1/calendarByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&month=${month}&year=${year}`;
      
      if (userCoords) {
        url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${userCoords.lat}&longitude=${userCoords.lng}&method=${method}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) throw new Error('Gagal mengambil data kalender');
      const result = await response.json();
      if (result.code === 200) {
        // Client-side Shift for accurate Hijri
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
            hijriData = { ...dayItem.date.hijri, day: newDay.toString().padStart(2, '0') };
          }
          return { ...dayItem, date: { ...dayItem.date, hijri: hijriData } };
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

  useEffect(() => {
    const methodToUse = (settings.api === 'mabims' || settings.api === 'myquran') ? 20 : settings.method;
    fetchCalendar(
      currentDate.getFullYear(), 
      currentDate.getMonth() + 1, 
      settings.city, 
      settings.country, 
      methodToUse,
      settings.adjustment,
      coords
    );
  }, [currentDate, settings, coords]);

  const [viewMode, setViewMode] = useState<'hari' | 'bulan' | 'tahun'>(initialMode as any);

  useEffect(() => {
    const mode = (slugArray && slugArray[0] && ['hari', 'bulan', 'tahun'].includes(slugArray[0])) ? slugArray[0] : 'bulan';
    if (mode !== viewMode) setViewMode(mode as any);
  }, [slugArray]);

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const handleToday = () => {
    setCurrentDate(new Date());
    router.push('/kalender/bulan');
  };

  const handlePrevDay = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1));
  const handleNextDay = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1));
  const handlePrevYear = () => setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1));
  const handleNextYear = () => setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1));

  const todayDateStr = format(new Date(), 'dd-MM-yyyy');
  const monthStart = startOfMonth(currentDate);
  const startingDayIndex = getDay(monthStart);
  const daysInMonth = getDaysInMonth(currentDate);
  const emptyCellsPrefix = Array.from({ length: startingDayIndex }).map((_, i) => i);

  // Helper for navigation based on viewMode
  const handlePrev = () => {
    if (viewMode === 'hari') handlePrevDay();
    else if (viewMode === 'bulan') handlePrevMonth();
    else handlePrevYear();
  };
  
  const handleNext = () => {
    if (viewMode === 'hari') handleNextDay();
    else if (viewMode === 'bulan') handleNextMonth();
    else handleNextYear();
  };

  const renderTitle = () => {
    if (viewMode === 'hari') return `Jadwal ${format(currentDate, 'dd MMMM yyyy', { locale: id })}`;
    if (viewMode === 'bulan') return `Jadwal & Penamaan`;
    return `Kalender Tahun ${currentDate.getFullYear()}`;
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#fafaf9] font-sans">
      {/* Header Terpisah untuk Publik */}
      <header className="sticky top-0 left-0 right-0 p-4 flex items-center justify-between z-20 bg-white/95 backdrop-blur-md border-b border-slate-200/50">
        <button
          onClick={() => router.push('/')}
          className="p-2 text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm font-medium transition"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>
        
        {/* View Mode Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mx-auto shadow-inner">
          <button onClick={() => router.push('/kalender/hari')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'hari' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Hari</button>
          <button onClick={() => router.push('/kalender/bulan')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'bulan' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Bulan</button>
          <button onClick={() => router.push('/kalender/tahun')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'tahun' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Tahun</button>
        </div>

        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-emerald-600 hidden md:block" />
          <h1 className="font-extrabold text-slate-800 hidden md:block">Kalender</h1>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-[1200px] w-full mx-auto space-y-6">
        
        <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-slate-200/30 relative min-h-[600px] flex flex-col">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                  {renderTitle()}
                </h2>
                <div className="flex items-center mt-1.5 gap-2 text-sm font-medium text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <select
                    className="bg-transparent font-medium text-slate-500 outline-none cursor-pointer hover:text-emerald-600"
                    value={coords ? 'gps' : settings.label}
                    onChange={(e) => {
                      if (e.target.value !== 'gps') {
                        setCoords(null);
                        setLocationName(null);
                        const selected = LOCATIONS.find(l => l.label === e.target.value);
                        if (selected) {
                          setSettings(prev => ({ ...prev, city: selected.city, country: selected.country, label: selected.label }));
                        }
                      }
                    }}
                  >
                    {coords && locationName && <option value="gps">📍 {locationName} (GPS)</option>}
                    {LOCATIONS.map(loc => <option key={loc.label} value={loc.label}>{loc.label}</option>)}
                  </select>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-600 cursor-pointer hover:bg-slate-200 transition" onClick={handleToday}>
                    Kembali ke Hari Ini
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200/80 shrink-0 shadow-sm">
              <button onClick={handlePrev} className="p-2 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-slate-800">
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                {(viewMode === 'bulan' || viewMode === 'hari') && (
                  <select 
                    value={currentDate.getMonth()}
                    onChange={(e) => {
                      const newDate = new Date(currentDate);
                      newDate.setMonth(parseInt(e.target.value));
                      setCurrentDate(newDate);
                    }}
                    className="bg-transparent font-extrabold text-[15px] text-slate-800 capitalize tracking-tight outline-none cursor-pointer appearance-none hover:text-emerald-600 transition-colors"
                  >
                    {Array.from({length: 12}).map((_, i) => (
                      <option key={i} value={i} className="text-black">{format(new Date(2020, i, 1), 'MMMM', {locale: id})}</option>
                    ))}
                  </select>
                )}
                <select 
                  value={currentDate.getFullYear()}
                  onChange={(e) => {
                    const newDate = new Date(currentDate);
                    newDate.setFullYear(parseInt(e.target.value));
                    setCurrentDate(newDate);
                  }}
                  className="bg-transparent text-[14px] font-bold text-slate-500 outline-none cursor-pointer appearance-none hover:text-emerald-600 transition-colors"
                >
                  {Array.from({length: 30}).map((_, i) => {
                    const y = new Date().getFullYear() - 15 + i;
                    return <option key={y} value={y} className="text-black">{y}</option>
                  })}
                </select>
              </div>

              <button onClick={handleNext} className="p-2 hover:bg-white rounded-xl transition-all text-slate-500 hover:text-slate-800">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl mb-8 text-sm font-medium flex items-center border border-rose-100">
              <X className="w-4 h-4 mr-2 shrink-0" /> {error}
            </div>
          )}

          {viewMode === 'tahun' && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12 flex-1 pt-4 pb-8">
              {Array.from({ length: 12 }).map((_, i) => {
                const date = new Date(currentDate.getFullYear(), i, 1);
                const startDay = getDay(date);
                const daysInMonth = getDaysInMonth(date);
                const monthName = format(date, 'MMMM', { locale: id });
                return (
                  <div key={i} className="flex flex-col cursor-pointer group" onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(i);
                    setCurrentDate(newDate);
                    router.push('/kalender/bulan');
                  }}>
                    <h3 className="text-rose-500 font-medium text-lg mb-4 pl-1 group-hover:text-rose-600 transition-colors">{monthName}</h3>
                    <div className="grid grid-cols-7 gap-y-2 mb-2 text-center text-slate-400 text-[10px] font-bold">
                      <span>M</span><span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span>
                    </div>
                    <div className="grid grid-cols-7 gap-y-3 text-center text-xs font-medium">
                      {Array.from({ length: startDay }).map((_, idx) => <span key={`empty-${idx}`}></span>)}
                      {Array.from({ length: daysInMonth }).map((_, idx) => {
                        const dayNum = idx + 1;
                        const isToday = currentDate.getFullYear() === new Date().getFullYear() && i === new Date().getMonth() && dayNum === new Date().getDate();
                        return (
                          <span key={dayNum} className={`w-6 h-6 mx-auto flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-500/30' : 'text-slate-700 group-hover:bg-slate-50'}`}>
                            {dayNum}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'hari' && (
            <div className="flex-1 flex items-center justify-center py-10">
              {(() => {
                const dayToRender = data.find(d => parseInt(d.date.gregorian.day, 10) === currentDate.getDate());
                if (!dayToRender) return <div className="text-slate-400 font-medium">Data hari ini tidak tersedia dalam rentang bulan ini. Silakan pindah ke tampilan bulan.</div>;

                const dMy = dayToRender.date.gregorian.date.substring(0, 5); 
                const hDm = `${parseInt(dayToRender.date.hijri.day, 10).toString().padStart(2, '0')}-${dayToRender.date.hijri.month.number.toString().padStart(2, '0')}`;
                
                const holidaysObj: Record<string, string> = {
                  "01-01": "Tahun Baru Masehi", "01-05": "Hari Buruh", "01-06": "Hari Lahir Pancasila",
                  "17-08": "Hari Kemerdekaan RI", "25-12": "Hari Raya Natal",
                };
                const hijriHolidaysObj: Record<string, string> = {
                  "01-01": "Tahun Baru Islam", "12-03": "Maulid Nabi", "27-07": "Isra' Mi'raj",
                  "01-10": "Idul Fitri", "02-10": "Cuti Bersama", "10-12": "Idul Adha",
                };
                
                const holidayLabel = (settings.filters?.showHolidays ?? true) ? (holidaysObj[dMy] || hijriHolidaysObj[hDm]) : null;

                return (
                  <div className="bg-white rounded-[2.5rem] p-8 md:p-12 w-full max-w-2xl border border-slate-200/60 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]">
                    <div className="mb-10 text-center">
                      <h3 className="text-5xl font-black text-slate-800 mb-4 tracking-tight">
                        {dayToRender.date.gregorian.day} {dayToRender.date.gregorian.month.en}
                      </h3>
                      <p className="text-emerald-600 font-bold text-2xl border-b border-slate-100 pb-8">
                        {dayToRender.date.hijri.day} {dayToRender.date.hijri.month.en} {dayToRender.date.hijri.year} H
                      </p>
                      {holidayLabel && (
                        <div className="mt-6 inline-block bg-rose-100 text-rose-700 font-bold px-4 py-2 rounded-xl border border-rose-200/50">
                          {holidayLabel}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-6">
                      <h4 className="font-bold text-slate-400 uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4" /> Jadwal Sholat {coords && locationName ? locationName : settings.city}
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { name: 'Subuh', time: dayToRender.timings.Fajr },
                          { name: 'Dzuhur', time: dayToRender.timings.Dhuhr },
                          { name: 'Ashar', time: dayToRender.timings.Asr },
                          { name: 'Maghrib', time: dayToRender.timings.Maghrib },
                          { name: 'Isya', time: dayToRender.timings.Isha },
                        ].map((sholat) => (
                          <div key={sholat.name} className="flex justify-between items-center px-6 py-4 bg-slate-50/80 rounded-2xl border border-slate-100 hover:border-emerald-300 hover:shadow-md transition-all">
                            <span className="font-bold text-slate-600">{sholat.name}</span>
                            <span className="text-2xl font-black text-slate-800 font-mono tracking-tight">{sholat.time.split(' ')[0]}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {viewMode === 'bulan' && (
          <div className="w-full relative flex-1 flex flex-col">
            {loading && (
              <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-md flex justify-center items-center rounded-[2.5rem]">
                <div className="w-12 h-12 rounded-full border-[3px] border-slate-200 border-t-emerald-500 animate-spin drop-shadow-sm"></div>
              </div>
            )}

            <div className="grid grid-cols-7 gap-3 md:gap-4 mb-4">
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day, idx) => (
                <div key={day} className={`text-center font-bold text-[11px] md:text-xs tracking-widest uppercase py-2 ${idx === 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-3 md:gap-4 auto-rows-fr flex-1">
              {emptyCellsPrefix.map((i) => (
                <div key={`empty-${i}`} className="min-h-[90px] md:min-h-[120px] rounded-2xl bg-slate-50/50 border border-slate-100/50 opacity-40"></div>
              ))}
              
              {data.slice(0, daysInMonth).map((day, index) => {
                const isToday = day.date.gregorian.date === todayDateStr;
                const dateNum = parseInt(day.date.gregorian.day, 10);
                const isSunday = (startingDayIndex + index) % 7 === 0;

                // Filter Logic
                const filters = settings.filters || {
                  showSunnah: true, showRamadhan: true, showWeton: true, showHolidays: true
                };

                const gregorianDayName = day.date.gregorian.weekday.en;
                const hijriDayNum = parseInt(day.date.hijri.day, 10);
                const hijriMonthNum = day.date.hijri.month.number;

                // Pasaran Calculation
                const getPasaran = (dateStr: string) => {
                  const [d, m, y] = dateStr.split('-');
                  const date = new Date(Date.UTC(parseInt(y), parseInt(m)-1, parseInt(d), 12, 0, 0));
                  const diffDays = Math.floor(date.getTime() / 86400000);
                  const pasaranArr = ['Wage', 'Kliwon', 'Legi', 'Pahing', 'Pon'];
                  let idx = diffDays % 5;
                  if (idx < 0) idx += 5;
                  return pasaranArr[idx];
                };

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

                const dMy = day.date.gregorian.date.substring(0, 5); 
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
                      holidayLabel ? 'bg-rose-50/50 border-rose-200' :
                      isPuasa ? 'bg-emerald-50/50 border-emerald-200' :
                      isToday 
                        ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20 shadow-sm' 
                        : 'border-slate-200/80 bg-white hover:border-emerald-600/40 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex flex-col h-full justify-between">
                      <div className="flex justify-between items-start">
                        <span className={`text-xl md:text-3xl font-black tracking-tight ${isSunday || holidayLabel ? 'text-rose-500' : isToday ? 'text-emerald-700' : 'text-slate-800'}`}>
                          {dateNum}
                        </span>
                        <span className={`text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-lg ${
                          holidayLabel ? 'bg-rose-100 text-rose-700' :
                          isPuasa ? 'bg-emerald-100 text-emerald-700' :
                          isToday ? 'bg-emerald-200/50 text-emerald-800' : 
                          'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-colors'
                        }`}>
                          {day.date.hijri.day}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-1 mt-1">
                        {pasaran && <span className="text-[10px] font-bold text-amber-600 tracking-wider uppercase">{pasaran}</span>}
                        {holidayLabel && <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md inline-block max-w-max truncate border border-rose-200">{holidayLabel}</span>}
                        {isPuasa && <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md inline-block max-w-max truncate border border-emerald-200">{puasaLabel}</span>}
                      </div>

                      <div className="mt-auto hidden md:block">
                        {isToday && !holidayLabel && !isPuasa && (
                          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-2">Hari Ini</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          )}
        </div>

        {/* POPUP MODAL */}
        {selectedDay && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedDay(null)}>
            <div className="bg-white rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full shadow-2xl relative transform transition-all scale-100 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedDay(null)} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
              
              <div className="mb-8 pr-6">
                <h3 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">
                  {selectedDay.date.gregorian.day} {selectedDay.date.gregorian.month.en}
                </h3>
                <p className="text-emerald-600 font-bold text-lg border-b border-slate-100 pb-5">
                  {selectedDay.date.hijri.day} {selectedDay.date.hijri.month.en} {selectedDay.date.hijri.year} H
                </p>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[10px] flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5" /> Jadwal Sholat {coords && locationName ? locationName : settings.city}
                </h4>
                
                <div className="flex flex-col gap-2.5">
                  {[
                    { name: 'Subuh', time: selectedDay.timings.Fajr },
                    { name: 'Dzuhur', time: selectedDay.timings.Dhuhr },
                    { name: 'Ashar', time: selectedDay.timings.Asr },
                    { name: 'Maghrib', time: selectedDay.timings.Maghrib },
                    { name: 'Isya', time: selectedDay.timings.Isha },
                  ].map((sholat) => (
                    <div key={sholat.name} className="flex justify-between items-center px-5 py-3.5 bg-slate-50 rounded-2xl border border-slate-100/50 hover:border-emerald-300 transition-colors">
                      <span className="font-bold text-sm text-slate-600">{sholat.name}</span>
                      <span className="text-xl font-black text-slate-800 font-mono tracking-tight">{sholat.time.split(' ')[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <button onClick={() => setSelectedDay(null)} className="mt-8 w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all">
                Tutup Jadwal
              </button>
            </div>
          </div>
        )}

        {/* Info & Disclaimer */}
        <div className="mt-6 p-6 bg-emerald-50/50 border border-emerald-100 rounded-[2rem] text-sm text-emerald-800/80 font-medium leading-relaxed max-w-4xl mx-auto text-center space-y-2">
          <p>
            Tampilan Kalender Hijriah dan Waktu Sholat di atas dihitung menggunakan algoritma berbasis satelit yang disinkronisasikan langsung dengan standar <b className="text-emerald-700">Almanak Kementrian Agama Republik Indonesia (Kemenag RI)</b>.
          </p>
          <p className="text-emerald-600/70 text-xs">
            {coords ? 'Sistem telah mendeteksi lokasi GPS Anda untuk menghasilkan jadwal sholat yang paling presisi.' : 'Izinkan akses lokasi pada browser Anda agar sistem dapat menampilkan jadwal sholat akurat sesuai posisi Anda.'} Data bersifat kalkulatif; perubahan visibilitas hilal (rukyatul hilal) dapat mempengaruhi penetapan tanggal aktual.
          </p>
        </div>
      </main>
    </div>
  );
}
