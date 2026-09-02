"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Initial check
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium animate-in fade-in slide-in-from-bottom-4">
      <WifiOff className="w-4 h-4" />
      <span>Anda sedang offline. Beberapa fitur mungkin tidak tersedia.</span>
    </div>
  );
}
