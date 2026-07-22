import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, userAgent } = body;

    const supabase = await createClient();

    // Extract IP address
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    let ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown');

    if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress === 'unknown') {
      ipAddress = '127.0.0.1'; // local dev fallback
    }

    // Extract Location
    let city = request.headers.get('x-vercel-ip-city');
    let region = request.headers.get('x-vercel-ip-country-region');
    let country = request.headers.get('x-vercel-ip-country');
    let location = 'Unknown';

    if (city && region) {
      location = `${city}, ${region}, ${country}`;
    } else if (ipAddress !== '127.0.0.1' && ipAddress !== 'unknown') {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ipAddress}`);
        const geoData = await geoRes.json();
        if (geoData.status === 'success') {
          location = `${geoData.city}, ${geoData.regionName}, ${geoData.country}`;
        }
      } catch (e) {
        console.error("=> [API] Failed to fetch geo data", e);
      }
    }

    await supabase.from('access_logs').insert({
      ip_address: ipAddress,
      app_version: 'Web',
      device_info: userAgent || 'Web Browser',
      location: location
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

