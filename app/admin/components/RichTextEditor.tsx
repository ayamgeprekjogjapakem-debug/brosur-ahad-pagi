'use client';

import React, { useRef, useState } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Quote, Code, Undo, Redo,
  Sparkles, Eye, Edit3, Link as LinkIcon
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({ value, onChange, placeholder = 'Tulis isi brosur di sini...' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeMode, setActiveMode] = useState<'editor' | 'preview' | 'html'>('editor');
  const [rawHtml, setRawHtml] = useState(value);

  // Sync content when value changes externally if editor is not focused
  React.useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    setRawHtml(value);
  }, [value]);

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    if (activeMode !== 'editor') return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      const updated = editorRef.current.innerHTML;
      onChange(updated);
      setRawHtml(updated);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const updated = editorRef.current.innerHTML;
      onChange(updated);
      setRawHtml(updated);
    }
  };

  const handleRawHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawHtml(val);
    onChange(val);
    if (editorRef.current) {
      editorRef.current.innerHTML = val;
    }
  };

  const insertArabicBlock = () => {
    const sample = '<div class="my-4 p-4 rounded-xl bg-zinc-50 border border-zinc-100 text-right"><p dir="rtl" style="font-family: \'Traditional Arabic\', \'Amiri\', serif; font-size: 24px; line-height: 2.2;">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p><p class="text-left text-xs text-zinc-500 mt-2">Artinya: "Dengan menyebut nama Allah Yang Maha Pengasih lagi Maha Penyayang."</p></div><p><br></p>';
    executeCommand('insertHTML', sample);
  };

  const insertLinkPrompt = () => {
    const url = prompt('Masukkan tautan URL (contoh: https://...):');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white overflow-hidden transition focus-within:border-emerald-500">
      
      {/* Editor Toolbar Bersih Ala AI Agent */}
      <div className="p-2 sm:p-2.5 bg-[#FAFAFA] border-b border-zinc-100 flex flex-wrap items-center justify-between gap-1.5 select-none">
        
        {/* Formatting Actions */}
        <div className="flex flex-wrap items-center gap-0.5">
          {/* Text Style */}
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Tebal (Ctrl+B)"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Miring (Ctrl+I)"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Garis Bawah (Ctrl+U)"
          >
            <Underline size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('strikeThrough')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Coret"
          >
            <Strikethrough size={15} />
          </button>

          <div className="h-4 w-[1px] bg-zinc-200 mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<h1>')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Judul Utama (H1)"
          >
            <Heading1 size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<h2>')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Sub Judul (H2)"
          >
            <Heading2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<p>')}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Paragraf Normal"
          >
            Normal
          </button>

          <div className="h-4 w-[1px] bg-zinc-200 mx-1" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => executeCommand('justifyLeft')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Rata Kiri"
          >
            <AlignLeft size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyCenter')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Rata Tengah"
          >
            <AlignCenter size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyRight')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Rata Kanan (Arab)"
          >
            <AlignRight size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyFull')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Rata Kanan-Kiri"
          >
            <AlignJustify size={15} />
          </button>

          <div className="h-4 w-[1px] bg-zinc-200 mx-1" />

          {/* Lists & Quote */}
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Daftar Bullet"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Daftar Angka"
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<blockquote>')}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Kutipan / Dalil"
          >
            <Quote size={15} />
          </button>
          <button
            type="button"
            onClick={insertLinkPrompt}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-white transition"
            title="Sisipkan Tautan"
          >
            <LinkIcon size={15} />
          </button>

          <div className="h-4 w-[1px] bg-zinc-200 mx-1" />

          {/* Khusus Teks Arab / Matan Dalil */}
          <button
            type="button"
            onClick={insertArabicBlock}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
            title="Sisipkan Blok Teks Arab & Terjemahan"
          >
            <Sparkles size={13} className="text-emerald-600" />
            <span>Matan Arab</span>
          </button>
        </div>

        {/* View Mode Switcher: Editor / HTML / Preview */}
        <div className="flex items-center gap-1 bg-zinc-200/60 p-0.5 rounded-xl text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveMode('editor')}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeMode === 'editor' ? 'bg-white text-zinc-900 font-bold shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('html')}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeMode === 'html' ? 'bg-white text-zinc-900 font-bold shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            HTML
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('preview')}
            className={`px-2.5 py-1 rounded-lg transition ${
              activeMode === 'preview' ? 'bg-white text-zinc-900 font-bold shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            Preview
          </button>
        </div>

      </div>

      {/* Editor Content Area */}
      <div className="p-4 sm:p-6 min-h-[360px] max-h-[600px] overflow-y-auto custom-scrollbar">
        {activeMode === 'editor' && (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={handleInput}
            data-placeholder={placeholder}
            className="outline-none min-h-[320px] prose prose-zinc max-w-none text-zinc-800 leading-relaxed text-sm focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-400 empty:before:pointer-events-none"
          />
        )}

        {activeMode === 'html' && (
          <textarea
            value={rawHtml}
            onChange={handleRawHtmlChange}
            placeholder="Ketik atau paste kode HTML brosur..."
            rows={14}
            className="w-full h-full min-h-[320px] font-mono text-xs text-zinc-800 bg-transparent outline-none resize-y leading-relaxed"
          />
        )}

        {activeMode === 'preview' && (
          <div className="min-h-[320px] prose prose-zinc max-w-none text-zinc-800 leading-relaxed text-sm">
            {value ? (
              <div dangerouslySetInnerHTML={{ __html: value }} />
            ) : (
              <p className="text-zinc-400 italic">Belum ada konten untuk ditampilkan di pratinjau.</p>
            )}
          </div>
        )}
      </div>

      {/* Footer Info Editor */}
      <div className="px-4 py-2 bg-[#FAFAFA] border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
        <span>Gunakan tombol toolbar atau pintasan keyboard untuk memformat tulisan.</span>
        <span>{value ? `${value.replace(/<[^>]+>/g, '').trim().length} karakter` : '0 karakter'}</span>
      </div>

    </div>
  );
}
