import { NextResponse } from 'next/server';
import https from 'https';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kitab = searchParams.get('kitab');
  const start = parseInt(searchParams.get('start') || '1');
  const end = parseInt(searchParams.get('end') || '50');
  const sumberApi = searchParams.get('sumberApi') || 'gading';

  if (!kitab) {
    return NextResponse.json({ error: 'Missing kitab parameter' }, { status: 400 });
  }

  // --- KITAB MAPPING ---
  // Default (Gading, Vercel, MyQuran) uses: bukhari, muslim, tirmidzi, abudaud, nasai, ibnumajah, ahmad, malik, darimi
  // HadithAPI uses: sahih-bukhari, sahih-muslim, al-tirmidhi, abu-dawood, sunan-an-nasai, sunan-ibn-majah, muwatta-malik
  // Sunnah.com uses: bukhari, muslim, tirmidhi, abudawud, nasai, ibnmajah, malik
  let mappedKitab = kitab;
  if (sumberApi === 'hadithapi') {
    const mapHadithApi: Record<string, string> = {
      'bukhari': 'sahih-bukhari',
      'muslim': 'sahih-muslim',
      'tirmidzi': 'al-tirmidhi',
      'abudaud': 'abu-dawood',
      'nasai': 'sunan-an-nasai',
      'ibnumajah': 'sunan-ibn-majah',
      'malik': 'muwatta-malik'
    };
    mappedKitab = mapHadithApi[kitab] || kitab;
  } else if (sumberApi === 'sunnah') {
    const mapSunnah: Record<string, string> = {
      'tirmidzi': 'tirmidhi',
      'abudaud': 'abudawud',
      'ibnumajah': 'ibnmajah'
    };
    mappedKitab = mapSunnah[kitab] || kitab;
  }

  try {
    let rawData: any = null;

    // --- 1. SUTANLAB / GADING (Vercel Node / Gading) ---
    if (sumberApi === 'sutanlab' || sumberApi === 'gading') {
      const baseUrl = sumberApi === 'sutanlab' 
        ? 'https://hadis-api-id.vercel.app' 
        : 'https://api.hadith.gading.dev';
      
      const fetchUrl = sumberApi === 'sutanlab'
        ? `${baseUrl}/hadith/${mappedKitab}?page=1&limit=${end}`
        : `${baseUrl}/books/${mappedKitab}?range=${start}-${end}`;

      rawData = await fetchWithNodeHttps(fetchUrl);
      
      if (rawData?.data?.hadiths) {
        // Filter based on range
        const filteredHadiths = rawData.data.hadiths.filter((h: any) => h.number >= start && h.number <= end);
        return NextResponse.json({ data: { hadiths: filteredHadiths } });
      }
      return NextResponse.json({ error: 'Format data tidak sesuai dari ' + sumberApi }, { status: 500 });
    }

    // --- 2. HADITHAPI.COM ---
    if (sumberApi === 'hadithapi') {
      // Note: This API requires pulling ONE BY ONE if we strictly follow their query params ?hadithNumber=1
      // OR if they support range, but docs say &hadithNumber=1
      // For proxy, if we have to fetch 50 items one by one, it's very slow.
      // But let's assume they return an array if we don't pass hadithNumber, or we must fetch 1 by 1.
      // We will just do a simple fetch for the START number to show how it works, since fetching 50 sequentially in a proxy might timeout.
      const apiKey = process.env.HADITHAPI_KEY || '$2y$10$Uq1'; // User must set this in .env
      const fetchUrl = `https://hadithapi.com/api/hadiths?apiKey=${apiKey}&book=${mappedKitab}&paginate=50`; 
      // Pagination handling here is simplified.
      
      rawData = await fetchWithNodeHttps(fetchUrl);
      if (rawData?.hadiths?.data) {
        const mapped = rawData.hadiths.data.map((h: any) => ({
          number: h.hadithNumber,
          arab: h.hadithArabic,
          id: h.hadithUrdu ? "Tidak ada terjemahan Indo (lihat Inggris/Urdu)" : "",
          en: h.hadithEnglish,
          urdu: h.hadithUrdu,
          chapterId: h.chapterId,
          headingArabic: h.headingArabic,
          headingEnglish: h.headingEnglish,
          volume: h.volume,
          status: h.status
        }));
        // Filter requested range
        const filtered = mapped.filter((h: any) => parseInt(h.number) >= start && parseInt(h.number) <= end);
        return NextResponse.json({ data: { hadiths: filtered } });
      }
      return NextResponse.json({ error: 'Format data HadithAPI tidak sesuai' }, { status: 500 });
    }

    // --- 3. SUNNAH.COM (v1) ---
    if (sumberApi === 'sunnah') {
      const apiKey = process.env.SUNNAH_API_KEY || 'YOUR_KEY';
      // Sunnah.com API fetch by ID (1 per request in standard endpoint).
      // We will only fetch the first one for demonstration if range is used, because batch is not supported natively in this endpoint.
      const fetchUrl = `https://api.sunnah.com/v1/collections/${mappedKitab}/hadiths/${start}`;
      
      rawData = await fetchWithNodeHttps(fetchUrl, { 'x-api-key': apiKey });
      
      if (rawData?.hadith) {
        const ar = rawData.hadith.find((h: any) => h.lang === 'ar');
        const en = rawData.hadith.find((h: any) => h.lang === 'en');
        const mapped = [{
          number: start,
          arab: ar?.body?.replace(/(<([^>]+)>)/gi, ""),
          id: "Terjemahan Indo tidak tersedia",
          en: en?.body?.replace(/(<([^>]+)>)/gi, ""),
          chapterId: ar?.chapterNumber,
          headingArabic: ar?.chapterTitle,
          headingEnglish: en?.chapterTitle,
        }];
        return NextResponse.json({ data: { hadiths: mapped } });
      }
      return NextResponse.json({ error: 'Format data Sunnah.com tidak sesuai' }, { status: 500 });
    }

    // --- 4. MYQURAN ---
    if (sumberApi === 'myquran') {
      // MyQuran API fetches one by one based on number: /v2/hadits/perawi/bukhari/1
      // We need to Promise.all to fetch the range!
      const requests = [];
      for (let i = start; i <= end; i++) {
        requests.push(fetchWithNodeHttps(`https://api.myquran.com/v2/hadits/perawi/${mappedKitab}/${i}`));
      }
      const results = await Promise.allSettled(requests);
      
      const mapped = results
        .filter(r => r.status === 'fulfilled' && r.value?.data?.arab)
        .map((r: any) => ({
          number: r.value.data.number,
          arab: r.value.data.arab,
          id: r.value.data.id // Terjemahan
        }));

      return NextResponse.json({ data: { hadiths: mapped } });
    }

    return NextResponse.json({ error: 'Sumber API tidak dikenali' }, { status: 400 });

  } catch (error: any) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to fetch using standard fetch API
async function fetchWithNodeHttps(url: string, extraHeaders: any = {}): Promise<any> {
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0',
      ...extraHeaders
    },
    cache: 'no-store'
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`API responded with status: ${res.status}`);
  }
  return res.json();
}
