'use client';

import { useEffect } from 'react';

export default function AnalyticsTracker() {
  useEffect(() => {
    // Jalankan hanya di sisi klien (browser)
    if (typeof window !== 'undefined') {
      let deviceId = localStorage.getItem('device_id');
      
      // Jika perangkat ini belum pernah berkunjung, buat ID unik
      if (!deviceId) {
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('device_id', deviceId);
      }

      // Kirim ID ke server untuk dicatat
      fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceId }),
      }).catch(err => {
        // Abaikan error jaringan
      });
    }
  }, []);

  // Komponen ini tidak merender UI apapun
  return null;
}
