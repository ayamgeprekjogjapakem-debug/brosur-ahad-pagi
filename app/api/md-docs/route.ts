import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface DocItem {
  id: string;
  name: string;
  title: string;
  category: string;
  scope: 'web' | 'flutter';
  relativePath: string;
  size: number;
  updatedAt: string;
}

export interface DocCategory {
  category: string;
  label: string;
  scope: 'web' | 'flutter';
  items: DocItem[];
}

const WEB_MD_DIR = path.join(process.cwd(), 'md');
const FLUTTER_MD_DIR = path.resolve(process.cwd(), '../../FLUTTER/pustaka/md');

function getCategoryLabel(folderName: string, scope: 'web' | 'flutter'): string {
  if (scope === 'flutter') {
    switch (folderName) {
      case 'flutter-ai':
        return "📱 Flutter: Fitur AI & Chat Asma' (Asisten Majlis Tafsir Al Qur'an)";
      case 'flutter-search':
        return '📱 Flutter: Pencarian & Hadist Highlight';
      case 'flutter-db':
        return '📱 Flutter: Database SQLite, Hive & Offline';
      case 'flutter-notif':
        return '📱 Flutter: Arsitektur Push Notifikasi & FCM';
      case 'flutter-modul':
        return '📱 Flutter: Modul Brosur, Quran & Kalender';
      case 'flutter-release':
        return '📱 Flutter: Rilis & Pengumuman Versi';
      case 'flutter-core':
      default:
        return '📱 Flutter: Arsitektur & Panduan Mobile';
    }
  }

  switch (folderName) {
    case 'ai-arsitektur':
      return '🌐 Web: Arsitektur AI & RAG';
    case 'fitur-searching':
      return '🌐 Web: Fitur Pencarian & Typo Dalil';
    case 'flutter':
      return '🌐 Web: Sinkronisasi & Integrasi Flutter';
    default:
      return '🌐 Web: Analisis & Dokumen Sistem';
  }
}

function extractFirstHeading(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match && match[1]) {
    return match[1].replace(/[#*`_]/g, '').trim();
  }
  return fallback.replace(/\.md$/i, '').replace(/[-_]+/g, ' ');
}

function classifyFlutterDoc(fileName: string, subFolder: string | null): string {
  if (subFolder === 'fitur-ai') return 'flutter-ai';
  if (subFolder === 'fitur-searching') return 'flutter-search';

  const lower = fileName.toLowerCase();
  if (lower.includes('hive') || lower.includes('sqlite') || lower.includes('offline')) {
    return 'flutter-db';
  }
  if (lower.includes('notifikasi') || lower.includes('push')) {
    return 'flutter-notif';
  }
  if (lower.includes('bap') || lower.includes('quran') || lower.includes('kalender') || lower.includes('number') || lower.includes('penjelasan-q')) {
    return 'flutter-modul';
  }
  if (lower.includes('release') || lower.includes('pengumuman')) {
    return 'flutter-release';
  }
  if (lower.includes('highlight') || lower.includes('pencarian') || lower.includes('search') || lower.includes('arab_latin')) {
    return 'flutter-search';
  }
  return 'flutter-core';
}

function scanMarkdownDirectory(dir: string, baseDir: string, scope: 'web' | 'flutter'): DocItem[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results: DocItem[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Lewati folder tersembunyi atau video/aset besar
      if (entry.name.startsWith('.') || entry.name === 'video') continue;
      results = results.concat(scanMarkdownDirectory(fullPath, baseDir, scope));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relPath = path.relative(baseDir, fullPath);
      const parts = relPath.split(path.sep);
      const subFolder = parts.length > 1 ? parts[0] : null;

      let category = '';
      if (scope === 'flutter') {
        category = classifyFlutterDoc(entry.name, subFolder);
      } else {
        category = subFolder || 'umum';
      }

      const stats = fs.statSync(fullPath);
      let title = entry.name;
      try {
        const previewContent = fs.readFileSync(fullPath, { encoding: 'utf8', flag: 'r' });
        title = extractFirstHeading(previewContent, entry.name);
      } catch (e) {
        // ignore
      }

      // Format identifier yang unik dan aman
      const docIdentifier = scope === 'flutter' 
        ? `flutter/${relPath.replace(/[/\\]/g, '/')}` 
        : `web/${relPath.replace(/[/\\]/g, '/')}`;

      results.push({
        id: docIdentifier.replace(/[/\\]/g, '-'),
        name: entry.name,
        title,
        category,
        scope,
        relativePath: docIdentifier,
        size: stats.size,
        updatedAt: stats.mtime.toISOString(),
      });
    }
  }

  return results;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetFile = searchParams.get('file');

    // JIKA MEMINTA KONTEN 1 FILE TERTENTU
    if (targetFile) {
      let isFlutter = targetFile.startsWith('flutter/') || targetFile.startsWith('flutter:');
      let cleanRelPath = targetFile.replace(/^(flutter|web)[:/]/, '');
      
      // Sanitasi path traversal
      cleanRelPath = path.normalize(cleanRelPath).replace(/^(\.\.(\/|\\|$))+/, '');

      let fullPath = '';
      let activeScope: 'web' | 'flutter' = 'web';

      if (isFlutter && fs.existsSync(FLUTTER_MD_DIR)) {
        fullPath = path.join(FLUTTER_MD_DIR, cleanRelPath);
        activeScope = 'flutter';
      } else {
        fullPath = path.join(WEB_MD_DIR, cleanRelPath);
        activeScope = 'web';

        // Fallback jika tidak ada di web, coba cek di flutter
        if (!fs.existsSync(fullPath) && fs.existsSync(FLUTTER_MD_DIR)) {
          const testFlutterPath = path.join(FLUTTER_MD_DIR, cleanRelPath);
          if (fs.existsSync(testFlutterPath)) {
            fullPath = testFlutterPath;
            activeScope = 'flutter';
          }
        }
      }

      if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
        return NextResponse.json({ error: 'Berkas tidak ditemukan.' }, { status: 404 });
      }

      const content = fs.readFileSync(fullPath, 'utf8');
      const stats = fs.statSync(fullPath);
      const title = extractFirstHeading(content, path.basename(fullPath));

      return NextResponse.json({
        title,
        content,
        scope: activeScope,
        relativePath: `${activeScope}/${cleanRelPath}`,
        name: path.basename(fullPath),
        size: stats.size,
        updatedAt: stats.mtime.toISOString(),
      });
    }

    // JIKA MEMINTA DAFTAR SEMUA FILE MARKDOWN
    const webDocs = scanMarkdownDirectory(WEB_MD_DIR, WEB_MD_DIR, 'web');
    const flutterDocs = fs.existsSync(FLUTTER_MD_DIR) 
      ? scanMarkdownDirectory(FLUTTER_MD_DIR, FLUTTER_MD_DIR, 'flutter') 
      : [];

    const allDocs = [...webDocs, ...flutterDocs];

    // Kelompokkan per kategori & scope
    const groupedMap = new Map<string, { label: string; scope: 'web' | 'flutter'; items: DocItem[] }>();

    for (const doc of allDocs) {
      const groupKey = `${doc.scope}:${doc.category}`;
      if (!groupedMap.has(groupKey)) {
        groupedMap.set(groupKey, {
          label: getCategoryLabel(doc.category, doc.scope),
          scope: doc.scope,
          items: []
        });
      }
      groupedMap.get(groupKey)!.items.push(doc);
    }

    const categories: DocCategory[] = Array.from(groupedMap.entries()).map(([key, data]) => {
      // Urutkan item: master atau README selalu di atas
      data.items.sort((a, b) => {
        const aIsMaster = a.name.includes('MASTER') || a.name.includes('README') || a.name.includes('analisis');
        const bIsMaster = b.name.includes('MASTER') || b.name.includes('README') || b.name.includes('analisis');
        if (aIsMaster && !bIsMaster) return -1;
        if (!aIsMaster && bIsMaster) return 1;
        return a.name.localeCompare(b.name);
      });

      return {
        category: key,
        label: data.label,
        scope: data.scope,
        items: data.items,
      };
    });

    // Urutkan kategori secara logis
    categories.sort((a, b) => {
      // Kelompokkan berdasarkan scope jika diperlukan atau urutan prioritas
      if (a.category.includes('ai-arsitektur')) return -1;
      if (b.category.includes('ai-arsitektur')) return 1;
      return a.label.localeCompare(b.label);
    });

    const defaultFile = webDocs.find(d => d.name.includes('MASTER'))?.relativePath || allDocs[0]?.relativePath || null;

    return NextResponse.json({
      total: allDocs.length,
      totalWeb: webDocs.length,
      totalFlutter: flutterDocs.length,
      categories,
      defaultFile,
    });
  } catch (error: any) {
    console.error('Error membaca berkas markdown:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses berkas markdown.' }, { status: 500 });
  }
}
