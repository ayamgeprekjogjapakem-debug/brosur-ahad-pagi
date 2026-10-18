import { NextRequest, NextResponse } from 'next/server';

// Helper pasaran Jawa
function getPasaran(dateStr: string) {
  const [d, m, y] = dateStr.split('-');
  const date = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0));
  const diffDays = Math.floor(date.getTime() / 86400000);
  const pasaranArr = ['Wage', 'Kliwon', 'Legi', 'Pahing', 'Pon'];
  let index = diffDays % 5;
  if (index < 0) index += 5;
  return pasaranArr[index];
}

// Helper fetch Aladhan kalender per bulan
async function fetchMonthCalendar(year: number, month: number, city: string, country: string, method: number, adjustment: number) {
  const url = `https://api.aladhan.com/v1/calendarByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&month=${month}&year=${year}`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Aladhan API error: ${res.statusText}`);
  const result = await res.json();
  if (result.code !== 200 || !result.data) return [];

  return result.data.map((dayItem: any, index: number, arr: any[]) => {
    let hijriData = dayItem.date.hijri;
    if (adjustment !== 0) {
      const sourceIndex = index + adjustment;
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
    }

    const gregorianDate = dayItem.date.gregorian.date; // DD-MM-YYYY
    const gregorianDayName = dayItem.date.gregorian.weekday.en;
    const hijriDayNum = parseInt(hijriData.day, 10);
    const hijriMonthNum = hijriData.month.number;

    const pasaran = getPasaran(gregorianDate);
    const ayyamulBidh = [13, 14, 15].includes(hijriDayNum) && hijriMonthNum !== 9;
    const seninKamis = (gregorianDayName === 'Monday' || gregorianDayName === 'Thursday') && hijriMonthNum !== 9;
    const ramadhan = hijriMonthNum === 9;

    let puasa = null;
    if (ramadhan) puasa = 'Puasa Ramadhan';
    else if (ayyamulBidh && seninKamis) puasa = 'Ayyamul Bidh & Senin-Kamis';
    else if (ayyamulBidh) puasa = 'Puasa Ayyamul Bidh';
    else if (seninKamis) puasa = 'Puasa Sunnah';

    return {
      tanggal_masehi: gregorianDate,
      hari: gregorianDayName,
      tanggal_hijriah: `${hijriData.day} ${hijriData.month.en} ${hijriData.year} H`,
      detail_hijriah: {
        hari: hijriData.day,
        bulan: hijriData.month.number,
        nama_bulan: hijriData.month.en,
        nama_arab: hijriData.month.ar,
        tahun: hijriData.year,
      },
      pasaran_jawa: pasaran,
      puasa_sunnah: puasa,
      waktu_sholat: {
        subuh: dayItem.timings.Fajr.split(' ')[0],
        terbit: dayItem.timings.Sunrise.split(' ')[0],
        dzuhur: dayItem.timings.Dhuhr.split(' ')[0],
        ashar: dayItem.timings.Asr.split(' ')[0],
        maghrib: dayItem.timings.Maghrib.split(' ')[0],
        isya: dayItem.timings.Isha.split(' ')[0],
      }
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Filter Type: 'today' | 'month' | 'year' | 'range'
    const filter = searchParams.get('filter') || 'today';
    const city = searchParams.get('city') || 'Yogyakarta';
    const country = searchParams.get('country') || 'Indonesia';
    const method = parseInt(searchParams.get('method') || '20', 10); // 20: Kemenag
    const adjustment = parseInt(searchParams.get('adjustment') || '-1', 10);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // 1. FILTER: HARI INI (today)
    if (filter === 'today') {
      const monthData = await fetchMonthCalendar(currentYear, currentMonth, city, country, method, adjustment);
      const dayStr = now.getDate().toString().padStart(2, '0');
      const monthStr = currentMonth.toString().padStart(2, '0');
      const targetDate = `${dayStr}-${monthStr}-${currentYear}`;

      const todayData = monthData.find((d: any) => d.tanggal_masehi === targetDate) || monthData[now.getDate() - 1] || null;

      return NextResponse.json({
        success: true,
        filter: 'today',
        parameter: { city, country, method, adjustment, target_date: targetDate },
        data: todayData
      });
    }

    // 2. FILTER: BULANAN (month)
    if (filter === 'month') {
      const year = parseInt(searchParams.get('year') || currentYear.toString(), 10);
      const month = parseInt(searchParams.get('month') || currentMonth.toString(), 10);

      const monthData = await fetchMonthCalendar(year, month, city, country, method, adjustment);

      return NextResponse.json({
        success: true,
        filter: 'month',
        parameter: { year, month, city, country, method, adjustment },
        total_hari: monthData.length,
        data: monthData
      });
    }

    // 3. FILTER: TAHUNAN (year)
    if (filter === 'year') {
      const year = parseInt(searchParams.get('year') || currentYear.toString(), 10);
      
      // Ambil 12 bulan secara paralel
      const monthPromises = Array.from({ length: 12 }, (_, i) => 
        fetchMonthCalendar(year, i + 1, city, country, method, adjustment)
      );

      const allMonths = await Promise.all(monthPromises);
      const flatYearData = allMonths.flat();

      return NextResponse.json({
        success: true,
        filter: 'year',
        parameter: { year, city, country, method, adjustment },
        total_hari: flatYearData.length,
        data: flatYearData
      });
    }

    // 4. FILTER: RANGE TAHUN (range)
    if (filter === 'range') {
      const startYear = parseInt(searchParams.get('start_year') || currentYear.toString(), 10);
      const endYear = parseInt(searchParams.get('end_year') || (currentYear + 1).toString(), 10);

      // Batasi max rentang 3 tahun demi efisiensi response
      const safeEndYear = Math.min(endYear, startYear + 2);

      const yearPromises = [];
      for (let y = startYear; y <= safeEndYear; y++) {
        for (let m = 1; m <= 12; m++) {
          yearPromises.push(fetchMonthCalendar(y, m, city, country, method, adjustment));
        }
      }

      const allMonths = await Promise.all(yearPromises);
      const flatRangeData = allMonths.flat();

      return NextResponse.json({
        success: true,
        filter: 'range',
        parameter: { start_year: startYear, end_year: safeEndYear, city, country, method, adjustment },
        total_hari: flatRangeData.length,
        data: flatRangeData
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Parameter filter tidak valid. Gunakan salah satu dari: today, month, year, atau range.'
    }, { status: 400 });

  } catch (error: any) {
    console.error('API Kalender Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Terjadi kesalahan saat memproses data kalender.'
    }, { status: 500 });
  }
}
