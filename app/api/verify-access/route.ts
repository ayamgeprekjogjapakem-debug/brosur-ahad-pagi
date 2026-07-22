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
        device_info: `${deviceInfo} (BLOCKED)`
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
      device_info: deviceInfo
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

      // Basic version check (assuming semver e.g., "1.0.0")
      // For a robust check, you might want to split by "." and compare integers
      const minVersion = settings.min_app_version || '1.0.0';
      if (appVersion !== 'unknown' && isVersionLower(appVersion, minVersion)) {
        return NextResponse.json({
          allowed: false,
          reason: `Versi aplikasi Anda terlalu lama. Harap update ke versi minimal ${minVersion}.`,
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

// Simple semver compare function: returns true if v1 < v2
function isVersionLower(v1: string, v2: string) {
  const v1parts = v1.split('.').map(Number);
  const v2parts = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); ++i) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    if (v1part < v2part) return true;
    if (v1part > v2part) return false;
  }
  return false;
}
