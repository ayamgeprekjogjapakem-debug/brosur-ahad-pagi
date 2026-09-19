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

  let fetchUrl = '';
  if (sumberApi === 'vercel') {
    // Vercel API uses pagination page & limit
    // We approximate it: if user wants 1 to 50, it's page 1 limit 50.
    // If they want 51 to 100, we could calculate it, but for simplicity let's just fetch all up to 'end' and slice it.
    fetchUrl = `https://hadis-api-id.vercel.app/hadith/${kitab}?page=1&limit=${end}`;
  } else {
    // Default Gading
    fetchUrl = `https://api.hadith.gading.dev/books/${kitab}?range=${start}-${end}`;
  }

  try {
    const data: any = await new Promise((resolve, reject) => {
      const options = {
        family: 4, // Force IPv4 to prevent Node 18+ ENOTFOUND issues
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      };

      https.get(fetchUrl, options, (res) => {
        let body = '';
        if (res.statusCode !== 200) {
          reject(new Error(`API responded with status: ${res.statusCode}`));
          return;
        }
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e: any) {
            reject(new Error('Failed to parse JSON'));
          }
        });
      }).on('error', reject);
    });

    // Normalize output so frontend always gets { data: { hadiths: [...] } }
    if (sumberApi === 'vercel') {
      if (data && data.data && data.data.items) {
        // Slice the array to match the requested range (start to end)
        // items array is 0-indexed, so start 1 is index 0.
        const slicedItems = data.data.items.filter((h: any) => h.number >= start && h.number <= end);
        return NextResponse.json({
          data: {
            hadiths: slicedItems
          }
        });
      }
      return NextResponse.json({ error: 'Invalid format from Vercel API' }, { status: 500 });
    }

    // Return original Gading format
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
