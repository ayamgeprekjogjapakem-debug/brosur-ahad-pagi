'use client';

import React, { useEffect, useRef, useState } from 'react';
import Mark from 'mark.js';
import { useSearchParams } from 'next/navigation';
import { Copy, CheckCircle2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useSettings } from '../SettingsContext';
import html2canvas from 'html2canvas';

interface BrosurData {
  slug: string;
  judul: string;
  tahun: number;
  konten: string;
}

export default function HighlightClient({ brosur }: { brosur: BrosurData }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [copied, setCopied] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const { latinFontSize, arabicFontSize, latinFontFamily, arabicFontFamily } = useSettings();

  useEffect(() => {
    if (contentRef.current && query) {
      const markInstance = new Mark(contentRef.current);
      // Unmark any previous highlights
      markInstance.unmark({
        done: () => {
          // Mark the new query
          markInstance.mark(query, {
            className: 'bg-yellow-300 dark:bg-yellow-500/80 text-black px-1 rounded-sm shadow-sm',
            accuracy: 'partially',
            separateWordSearch: true,
          });
          
          // Optionally, scroll to the first highlight
          setTimeout(() => {
            const firstHighlight = contentRef.current?.querySelector('mark');
            if (firstHighlight) {
              firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 300);
        }
      });
    }
  }, [query, brosur.konten]);

  const handleCopyText = () => {
    if (contentRef.current) {
      const text = contentRef.current.innerText;
      
      // Parse date from slug if possible, or just use the title
      // Slug format: BAP-(Brosur-Ahad-Pagi)-YYYY-MM-DD-judul
      const slugParts = brosur.slug.split('-');
      let dateString = '';
      if (slugParts.length >= 7) {
        dateString = `${slugParts[4]}-${slugParts[5]}-${slugParts[6]}`;
      } else {
        dateString = brosur.tahun.toString();
      }

      const signature = `\n\n---\nBAP (Brosur Ahad Pagi) - ${dateString} - ${brosur.judul}\nLink: ${window.location.origin}/${brosur.slug}`;
      const finalCopy = text + signature;
      
      navigator.clipboard.writeText(finalCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadCanvas = async () => {
    if (!contentRef.current) return;
    try {
      setIsRendering(true);
      
      // Ambil elemen yang akan dirender (Wrapper keseluruhan agar style ikut)
      const element = contentRef.current;
      
      // Render ke canvas
      const canvas = await html2canvas(element, {
        scale: 2, // Kualitas tinggi
        useCORS: true,
        backgroundColor: document.documentElement.classList.contains('dark') ? '#0a0a0a' : '#fafafa',
        windowWidth: element.scrollWidth,
      });

      // Konversi ke URL gambar
      const image = canvas.toDataURL("image/png");
      
      // Buat link download
      const link = document.createElement('a');
      link.href = image;
      
      const slugParts = brosur.slug.split('-');
      const dateString = slugParts.length >= 7 ? `${slugParts[4]}-${slugParts[5]}-${slugParts[6]}` : brosur.tahun.toString();
      
      link.download = `Kutipan-${dateString}.png`;
      link.click();
    } catch (error) {
      console.error("Gagal melakukan render canvas:", error);
      alert("Terjadi kesalahan saat memproses gambar.");
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="relative group">
      <div className="absolute top-0 right-0 z-10 flex gap-2">
        <button 
          onClick={handleCopyText}
          className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-accent text-white hover:bg-accent/80 transition-all opacity-90 hover:opacity-100 shadow-md"
          title="Copy seluruh teks beserta sumber"
        >
          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
          {copied ? 'Teks Disalin!' : 'Copy Teks'}
        </button>
        <button 
          onClick={handleDownloadCanvas}
          disabled={isRendering}
          className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black hover:bg-black dark:hover:bg-white transition-all opacity-90 hover:opacity-100 shadow-md disabled:opacity-50"
          title="Download artikel sebagai gambar"
        >
          {isRendering ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
          {isRendering ? 'Memproses...' : 'Simpan Gambar'}
        </button>
      </div>
      <article 
        ref={contentRef}
        className={`prose dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-accent reader-content font-${latinFontFamily}`}
        style={{
          '--base-font-size': `${latinFontSize}px`,
          '--arabic-font-size': `${arabicFontSize}px`,
          '--arabic-font-family': arabicFontFamily === 'amiri' ? "var(--font-amiri), serif" : "'Traditional Arabic', serif",
        } as React.CSSProperties}
        dangerouslySetInnerHTML={{ __html: brosur.konten }}
      />
    </div>
  );
}
