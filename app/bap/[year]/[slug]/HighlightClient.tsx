'use client';

import React, { useEffect, useRef, useState } from 'react';
import Mark from 'mark.js';
import { useSearchParams } from 'next/navigation';
import { Copy, CheckCircle2, Image as ImageIcon, Loader2, Share2, Share, Printer, Smartphone, Link as LinkIcon } from 'lucide-react';
import { useSettings } from '@/app/SettingsContext';
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
  const scrollText = searchParams.get('scroll');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { latinFontSize, arabicFontSize, latinFontFamily, arabicFontFamily } = useSettings();

  useEffect(() => {
    if (contentRef.current) {
      // Pastikan semua teks Arab terpaut dengan membungkusnya secara dinamis
      // menggunakan TreeWalker untuk mencari node teks saja agar aman dari tag HTML
      const walk = document.createTreeWalker(contentRef.current, NodeFilter.SHOW_TEXT, null);
      // regex deteksi apakah ada huruf arab
      const arabicDetectRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u061C]/;
      // regex replace untuk membungkus huruf arab beserta spasi/tanda baca/angka di antaranya (tanpa huruf latin)
      const arabicReplaceRegex = /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u061C]+(?:[\s\W\d]{0,15}?[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u061C]+)*)/g;
      
      let node;
      const nodesToReplace = [];
      while(node = walk.nextNode()) {
        if(node.nodeValue && arabicDetectRegex.test(node.nodeValue)) {
          const parent = node.parentElement;
          // Hindari wrap ulang jika sudah di dalam container arabic
          if (parent && !parent.closest('.arabic, [dir="rtl" i], [lang^="ar" i]')) {
             nodesToReplace.push(node);
          }
        }
      }

      nodesToReplace.forEach(node => {
        if (!node.nodeValue || !node.parentNode) return;
        const span = document.createElement('span');
        // Wrap arabic text with span.arabic
        span.innerHTML = node.nodeValue.replace(arabicReplaceRegex, '<span class="arabic inline-block" dir="rtl">$1</span>');
        node.parentNode.replaceChild(span, node);
      });

      const markInstance = new Mark(contentRef.current);
      
      // We will perform markings inside unmark callback to ensure clean state
      markInstance.unmark({
        done: () => {
          
          // 1. We no longer use Mark.js for scrollText because it struggles with Arabic diacritics
          // and HTML tags. Instead, we highlight the actual DOM node block below.

          // 2. If there's a search query, highlight it with a stronger green
          if (query) {
            markInstance.mark(query, {
              className: 'bg-emerald-200 text-emerald-900 px-1 rounded-sm shadow-sm font-bold',
              accuracy: 'partially',
              separateWordSearch: true,
            });
          }

          // 3. Scroll logic
          setTimeout(() => {
            let foundTarget = false;
            
            // First priority: Scroll to the scrollText target
            if (scrollText) {
               const elements = contentRef.current?.querySelectorAll('p, div, span, h1, h2, h3, h4, li');
               const normalizedScrollText = scrollText.replace(/\s+/g, ' ').trim();
               if (elements && normalizedScrollText.length > 0) {
                 let bestMatch: Element | null = null;
                 
                 for (let i = 0; i < elements.length; i++) {
                   const elText = elements[i].textContent?.replace(/\s+/g, ' ') || '';
                   if (elText.includes(normalizedScrollText)) {
                     // Pick the most specific element (the one with the shortest text content)
                     if (!bestMatch || (elements[i].textContent?.length || 0) < (bestMatch.textContent?.length || 0)) {
                       bestMatch = elements[i];
                     }
                   }
                 }

                 if (bestMatch) {
                   bestMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
                   
                   // Stabilo full block
                   bestMatch.classList.add('bg-emerald-100', 'rounded-lg', 'p-2', 'ring-2', 'ring-emerald-300', 'transition-all', 'duration-700', 'shadow-sm');
                   
                   foundTarget = true;
                 }
               }
            }
            
            // Fallback to first highlighted word if no scroll target or it wasn't found
            if (!foundTarget && query) {
              const firstHighlight = contentRef.current?.querySelector('mark');
              if (firstHighlight) {
                firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }, 300);
        }
      });
    }
  }, [query, scrollText, brosur.konten]);

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

      const signature = `\n\n---\nBAP (Brosur Ahad Pagi) - ${dateString} - ${brosur.judul}\nLink: ${typeof window !== 'undefined' ? window.location.origin : ''}/${brosur.slug}`;
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
        backgroundColor: '#fafafa',
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
      <div className="absolute top-0 left-0 z-20 -ml-2 md:-ml-12 mt-1 print:hidden">
        <button
          onClick={() => setIsShareOpen(!isShareOpen)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-accent text-white shadow-md hover:scale-105 active:scale-95 transition-all"
          title="Bagikan atau Cetak"
        >
          <Share2 size={18} />
        </button>

        {isShareOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsShareOpen(false)}
            />
            <div className="absolute top-12 left-0 bg-white border border-black/5 shadow-xl rounded-xl p-2 flex flex-col gap-1 min-w-[220px] z-20 animate-in fade-in slide-in-from-top-2">

              <div className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest px-3 py-1.5">
                Simpan & Salin
              </div>

              <button
                onClick={() => {
                  handleCopyText();
                  setIsShareOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 transition-colors text-sm font-semibold text-zinc-700"
              >
                {copied ? <CheckCircle2 size={16} className="text-accent" /> : <Copy size={16} />}
                {copied ? 'Teks Disalin!' : 'Copy Seluruh Teks'}
              </button>

              <button
                onClick={() => {
                  handleDownloadCanvas();
                  setIsShareOpen(false);
                }}
                disabled={isRendering}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5  transition-colors text-sm font-semibold text-zinc-700  disabled:opacity-50"
              >
                {isRendering ? <Loader2 size={16} className="animate-spin text-accent" /> : <ImageIcon size={16} />}
                {isRendering ? 'Memproses Gambar...' : 'Simpan sbg Gambar'}
              </button>

              <button
                onClick={() => {
                  window.print();
                  setIsShareOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 transition-colors text-sm font-semibold text-zinc-700"
              >
                <Printer size={16} />
                Cetak / Export PDF
              </button>

              <div className="border-t border-black/5  mt-1 pt-1"></div>
              <div className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest px-3 py-1.5 mt-1">
                Bagikan
              </div>

              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/${brosur.slug}`);
                  setCopiedLink(true);
                  setTimeout(() => {
                    setCopiedLink(false);
                    setIsShareOpen(false);
                  }, 1500);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 transition-colors text-sm font-semibold text-zinc-700"
              >
                {copiedLink ? <CheckCircle2 size={16} className="text-accent" /> : <LinkIcon size={16} />}
                {copiedLink ? 'Tautan Disalin!' : 'Salin Tautan'}
              </button>

              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Baca kajian: ${brosur.judul}\n${typeof window !== 'undefined' ? window.location.origin : ''}/${brosur.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsShareOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#25D366]/10 hover:text-[#25D366] transition-colors text-sm font-semibold text-zinc-700"
              >
                <Smartphone size={16} />
                WhatsApp
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/${brosur.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsShareOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1877F2]/10 hover:text-[#1877F2] transition-colors text-sm font-semibold text-zinc-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                Facebook
              </a>

              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(brosur.judul)}&url=${encodeURIComponent(`${typeof window !== 'undefined' ? window.location.origin : ''}/${brosur.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsShareOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] transition-colors text-sm font-semibold text-zinc-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                Twitter (X)
              </a>

              {/* Optional Web Share if supported */}
              {typeof navigator !== 'undefined' && navigator.share && (
                <>
                  <div className="border-t border-black/5  mt-1 pt-1"></div>
                  <button
                    onClick={() => {
                      navigator.share({
                        title: brosur.judul,
                        text: `Baca kajian Brosur Ahad Pagi: ${brosur.judul}`,
                        url: `${typeof window !== 'undefined' ? window.location.origin : ''}/${brosur.slug}`,
                      }).catch(console.error);
                      setIsShareOpen(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 transition-colors text-sm font-semibold text-zinc-700"
                  >
                    <Share size={16} />
                    Opsi Bagikan Lainnya...
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <article
        ref={contentRef}
        className={`prose max-w-none prose-headings:font-bold prose-a:text-accent reader-content ${latinFontFamily === 'serif' ? 'font-serif' : 'font-sans'}`}
        style={{
          '--base-font-size': `${latinFontSize}px`,
          '--arabic-font-size': `${arabicFontSize}px`,
          '--arabic-font-family': arabicFontFamily === 'amiri' ? "var(--font-amiri), serif" : "'Traditional Arabic', var(--font-trad-arabic), 'KFGQPC Uthmanic Script HAFS', Arial, serif",
        } as React.CSSProperties}
        dangerouslySetInnerHTML={{ __html: brosur.konten.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/html,body\s*\{[\s\S]*?\}/gi, '') }}
      />
    </div>
  );
}
