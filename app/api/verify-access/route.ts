import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    console.log("=> [API] Menerima request verifikasi dari aplikasi mobile...");
    const supabase = await createClient();
    
    // Get request body
    const body = await request.json().catch(() => ({}));
    console.log("=> [API] Body diterima:", body);
    const appVersion = body.app_version || 'unknown';
    const deviceInfo = body.device_info || 'unknown';

    // Extract IP address (this depends on your hosting provider, Vercel sets x-forwarded-for)
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    let ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown');

    // Jika di localhost (::1 atau 127.0.0.1) atau unknown, gunakan IP dari client jika ada
    if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress === 'unknown') {
      ipAddress = body.client_ip || ipAddress;
    }

    // Extract Location
    let city = request.headers.get('x-vercel-ip-city');
    let region = request.headers.get('x-vercel-ip-country-region');
    let country = request.headers.get('x-vercel-ip-country');
    let location = 'Unknown';

    if (city && region) {
      location = `${city}, ${region}, ${country}`;
    } else if (ipAddress !== '::1' && ipAddress !== '127.0.0.1' && ipAddress !== 'unknown') {
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

    // 1. Check if IP is blocked
    const { data: blockedIp } = await supabase
      .from('blocked_ips')
      .select('id, reason')
      .eq('ip_address', ipAddress)
      .maybeSingle();

    if (blockedIp) {
      // Log the rejected access
      await supabase.from('access_logs').insert({
        ip_address: ipAddress,
        app_version: appVersion,
        device_info: `${deviceInfo} (BLOCKED)`,
        location: location
      });

      return NextResponse.json({
        allowed: false,
        reason: blockedIp.reason || 'IP Address Anda telah diblokir karena aktivitas mencurigakan.',
        requires_update: false
      }, { status: 403 });
    }

    // 2. Log the access
    const { error: insertError } = await supabase.from('access_logs').insert({
      ip_address: ipAddress,
      app_version: appVersion,
      device_info: deviceInfo,
      location: location
    });

    if (insertError) {
      console.error("=> [API] ERROR Insert Access Log:", insertError);
    } else {
      console.log("=> [API] Access Log tersimpan untuk IP:", ipAddress);
    }

    // 3. Check App Settings (Maintenance & Version)
    const { data: settings } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settings) {
      if (settings.is_maintenance) {
        return NextResponse.json({
          allowed: false,
          reason: 'Aplikasi sedang dalam perbaikan (Maintenance). Silakan coba lagi nanti.',
          requires_update: false
        }, { status: 503 });
      }

      // Whitelist version check using allowed_versions table
      const { data: allowedVersionsData } = await supabase
        .from('allowed_versions')
        .select('version')
        .eq('is_active', true);
        
      const allowedVersions = allowedVersionsData ? allowedVersionsData.map((v: any) => v.version) : [];
      
      if (appVersion !== 'unknown' && appVersion !== 'Web' && !allowedVersions.includes(appVersion)) {
        return NextResponse.json({
          allowed: false,
          reason: `Versi aplikasi Anda tidak didukung. Versi yang diizinkan: ${allowedVersions.join(', ')}. Harap update aplikasi Anda.`,
          requires_update: true
        }, { status: 426 }); // 426 Upgrade Required
      }
    }

    // Allow access
    return NextResponse.json({
      allowed: true,
      settings: settings
    }, { status: 200 });
    
  } catch (error) {
    console.error('Verify Access Error:', error);
    return NextResponse.json({ 
      allowed: true, // Fail open so users aren't locked out if DB errors
      error: 'Terjadi kesalahan pada server' 
    }, { status: 500 });
  }
}
