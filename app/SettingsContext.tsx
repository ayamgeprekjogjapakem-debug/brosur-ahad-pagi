'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type SettingsContextType = {
  latinFontSize: number;
  setLatinFontSize: (size: number) => void;
  arabicFontSize: number;
  setArabicFontSize: (size: number) => void;
  latinFontFamily: string;
  setLatinFontFamily: (font: string) => void;
  arabicFontFamily: string;
  setArabicFontFamily: (font: string) => void;
};

const defaultSettings = {
  latinFontSize: 18,
  arabicFontSize: 28,
  latinFontFamily: 'sans-serif',
  arabicFontFamily: 'amiri',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [latinFontSize, setLatinFontSize] = useState(defaultSettings.latinFontSize);
  const [arabicFontSize, setArabicFontSize] = useState(defaultSettings.arabicFontSize);
  const [latinFontFamily, setLatinFontFamily] = useState(defaultSettings.latinFontFamily);
  const [arabicFontFamily, setArabicFontFamily] = useState(defaultSettings.arabicFontFamily);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from local storage on mount
    const saved = localStorage.getItem('bap-settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.latinFontSize) setLatinFontSize(parsed.latinFontSize);
        if (parsed.arabicFontSize) setArabicFontSize(parsed.arabicFontSize);
        if (parsed.latinFontFamily) setLatinFontFamily(parsed.latinFontFamily);
        if (parsed.arabicFontFamily) setArabicFontFamily(parsed.arabicFontFamily);
      } catch (e) {
        // ignore JSON parse error
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    // Save to local storage on change
    localStorage.setItem('bap-settings', JSON.stringify({
      latinFontSize,
      arabicFontSize,
      latinFontFamily,
      arabicFontFamily
    }));
  }, [latinFontSize, arabicFontSize, latinFontFamily, arabicFontFamily, isLoaded]);

  if (!isLoaded) return null; // Avoid hydration mismatch by waiting for load

  return (
    <SettingsContext.Provider value={{
      latinFontSize, setLatinFontSize,
      arabicFontSize, setArabicFontSize,
      latinFontFamily, setLatinFontFamily,
      arabicFontFamily, setArabicFontFamily
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
