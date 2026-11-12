/**
 * Helper untuk validasi dan manajemen kedaluwarsa kode akses (access code cache).
 */

export function checkIsAccessExpired(): boolean {
  if (typeof window === 'undefined') return false;

  const code = localStorage.getItem('mta_premium_access');
  // Jika tidak ada kode atau masih dummy legacy 'allowed'
  if (!code || code === 'allowed') {
    if (code === 'allowed') {
      clearLocalAccessCache();
    }
    return true;
  }

  const expiresAtStr = localStorage.getItem('mta_premium_expires_at');
  if (!expiresAtStr) {
    // Tanpa waktu kedaluwarsa (berarti kode permanen)
    return false;
  }

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt)) return false;

  // Cek apakah waktu saat ini telah melewati batas kedaluwarsa (dalam milidetik)
  if (Date.now() > expiresAt) {
    // Bersihkan cache karena sudah kedaluwarsa
    clearLocalAccessCache();
    return true;
  }

  return false;
}

export function getAccessRemainingSeconds(): number | null {
  if (typeof window === 'undefined') return null;

  const expiresAtStr = localStorage.getItem('mta_premium_expires_at');
  if (!expiresAtStr) return null; // Permanen

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt)) return null;

  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) return 0;

  return Math.ceil(remainingMs / 1000);
}

export function clearLocalAccessCache(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('mta_premium_access');
  localStorage.removeItem('mta_premium_features');
  localStorage.removeItem('mta_premium_expires_at');
  localStorage.removeItem('mta_premium_expires_in_seconds');
  localStorage.removeItem('mta_ai_daily_limit');
  localStorage.removeItem('mta_ai_reset_hour');
}

export function formatRemainingTime(seconds: number | null): string {
  if (seconds === null) return 'Permanen';
  if (seconds <= 0) return 'Kedaluwarsa';
  if (seconds < 60) return `${seconds} Detik`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} Menit`;
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours} Jam ${mins} Mnt` : `${hours} Jam`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days} Hari ${hours} Jam` : `${days} Hari`;
}

/**
 * Memvalidasi kode akses ke database server secara online.
 * Jika kode dihapus atau dinonaktifkan di server, cache lokal akan otomatis dibersihkan.
 * Jika masih valid, cache (fitur, masa berlaku) diselaraskan dengan server.
 */
export async function verifyAccessCodeOnline(): Promise<{
  valid: boolean;
  reason?: 'missing' | 'expired' | 'deleted' | 'inactive';
  code?: string;
  data?: any;
}> {
  if (typeof window === 'undefined') return { valid: true };

  const code = localStorage.getItem('mta_premium_access');
  if (!code || code === 'allowed') {
    clearLocalAccessCache();
    return { valid: false, reason: 'missing' };
  }

  // 1. Cek kedaluwarsa lokal terlebih dahulu
  if (checkIsAccessExpired()) {
    clearLocalAccessCache();
    return { valid: false, reason: 'expired', code };
  }

  // 2. Cek ke server apakah kode masih terdaftar & aktif di database
  try {
    const res = await fetch('/api/access-codes/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    });

    const data = await res.json();

    if (res.ok && data.valid) {
      // Cocokkan dan perbarui cache dengan data terkini dari server
      if (data.allowed_features) {
        localStorage.setItem('mta_premium_features', JSON.stringify(data.allowed_features));
      }

      if (data.ai_daily_limit !== undefined && data.ai_daily_limit !== null) {
        localStorage.setItem('mta_ai_daily_limit', data.ai_daily_limit.toString());
      }
      if (data.ai_reset_hour !== undefined && data.ai_reset_hour !== null) {
        localStorage.setItem('mta_ai_reset_hour', data.ai_reset_hour.toString());
      }

      // Sinkronisasi masa berlaku jika server mengirimkan durasi kedaluwarsa
      if (data.expires_in_seconds && data.expires_in_seconds > 0) {
        const existingExp = localStorage.getItem('mta_premium_expires_at');
        const previousSeconds = localStorage.getItem('mta_premium_expires_in_seconds');
        if (!existingExp || previousSeconds !== data.expires_in_seconds.toString()) {
          const expiresAt = Date.now() + (data.expires_in_seconds * 1000);
          localStorage.setItem('mta_premium_expires_at', expiresAt.toString());
          localStorage.setItem('mta_premium_expires_in_seconds', data.expires_in_seconds.toString());
        }
      } else {
        localStorage.removeItem('mta_premium_expires_at');
        localStorage.removeItem('mta_premium_expires_in_seconds');
      }

      return { valid: true, code: data.code, data };
    } else {
      // Kode telah dihapus dari server atau dinonaktifkan oleh admin
      clearLocalAccessCache();
      return { valid: false, reason: 'deleted', code };
    }
  } catch {
    // Jika koneksi internet offline, izinkan sementara jika cache belum kedaluwarsa
    if (!checkIsAccessExpired()) {
      return { valid: true, code };
    }
    clearLocalAccessCache();
    return { valid: false, reason: 'expired', code };
  }
}



