'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface AiSplashScreenProps {
  show: boolean;
  onClose: () => void;
}

export default function AiSplashScreen({
  show,
  onClose,
}: AiSplashScreenProps) {
  const overlayControls = useAnimationControls();
  const auraControls = useAnimationControls();
  const logoControls = useAnimationControls();
  const textControls = useAnimationControls();
  const isClosingRef = useRef(false);

  const triggerExit = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    onClose();
  };

  useEffect(() => {
    if (!show) {
      isClosingRef.current = false;
      return;
    }

    let isCancelled = false;

    const runFluidSequence = async () => {
      // Kondisi awal
      overlayControls.set({ opacity: 1 });
      auraControls.set({ scale: 0.85, opacity: 0 });
      logoControls.set({
        rotate: 0,
        scale: 0.94,
        opacity: 0,
      });
      textControls.set({ opacity: 0, y: 6 });

      // Fase 1: Muncul & berputar mulus (1.15 detik)
      auraControls.start({
        scale: 1,
        opacity: 0.7,
        transition: { duration: 1.15, ease: [0.25, 0.1, 0.25, 1] },
      });

      textControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.6, delay: 0.12, ease: [0.25, 0.1, 0.25, 1] },
      });

      logoControls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
      });

      await logoControls.start({
        rotate: 360,
        transition: {
          duration: 1.15,
          ease: [0.4, 0, 0.2, 1],
        },
      });

      if (isCancelled) return;

      // Fase 2: Zoom menembus fullscreen + dissolve mulus (0.85 detik)
      textControls.start({
        opacity: 0,
        y: -4,
        transition: { duration: 0.3, ease: 'easeOut' },
      });

      await Promise.all([
        auraControls.start({
          scale: 8,
          opacity: 0,
          transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
        }),
        logoControls.start({
          rotate: 410,
          scale: 28,
          opacity: 0,
          transition: {
            scale: { duration: 0.85, ease: [0.32, 0, 0.67, 1] }, // Akselerasi bertahap menembus penuh ke seluruh viewport
            rotate: { duration: 0.85, ease: 'easeOut' },
            opacity: { duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] },
          },
        }),
        overlayControls.start({
          opacity: 0,
          transition: {
            duration: 0.7,
            delay: 0.15,
            ease: [0.25, 0.1, 0.25, 1],
          },
        }),
      ]);

      if (!isCancelled) {
        triggerExit();
      }
    };

    runFluidSequence();

    return () => {
      isCancelled = true;
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="ai-splash-gemini-fullscreen"
          animate={overlayControls}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={triggerExit}
          style={{ willChange: 'opacity', transform: 'translateZ(0)' }}
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-white bg-gradient-to-b from-white via-white to-emerald-500/[0.08] overflow-hidden select-none cursor-pointer"
        >
          {/* Tombol Kembali Minimalis */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerExit();
            }}
            aria-label="Kembali"
            className="absolute top-4 left-4 z-20 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100/70 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Ambient Aura Glow Fullscreen */}
          <motion.div
            animate={auraControls}
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
            className="absolute w-64 h-64 rounded-full pointer-events-none"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-emerald-300/25 via-teal-200/20 to-sky-200/20 blur-3xl" />
          </motion.div>

          {/* Logo Utama */}
          <motion.div
            animate={logoControls}
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
            className="relative z-10 flex items-center justify-center w-24 h-24 rounded-full p-2"
          >
            <img
              src="/images/logo_asma.png"
              alt="Logo Asma' AI"
              className="w-full h-full object-contain drop-shadow-[0_6px_20px_rgba(16,185,129,0.14)]"
            />
          </motion.div>

          {/* Status Tipis di Bagian Bawah */}
          <motion.p
            animate={textControls}
            style={{ willChange: 'transform, opacity' }}
            className="absolute bottom-8 z-10 text-xs font-normal text-slate-400 tracking-wide"
          >
            Menyiapkan Asma&apos; AI...
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}