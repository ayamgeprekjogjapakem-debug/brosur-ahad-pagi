import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface DocItem {
  id: string;
  name: string;
  title: string;
  category: string;
  relativePath: string;
  size: number;
  updatedAt: string;
}

export interface DocCategory {
  category: string;
  label: string;
  items: DocItem[];
}

const MD_BASE_DIR = path.join(process.cwd(), 'md');

function getCategoryLabel(folderName: string): string {
  switch (folderName) {
    case 'ai-arsitektur':
      return 'Arsitektur AI & RAG';
    case 'fitur-searching':
      return 'Fitur Pencarian & Typo';
    case 'flutter':
      return 'Integrasi Flutter';
    default:
      return folderName.replace(/[-_]+/g, ' ').toUpperCase();
  }
}

function extractFirstHeading(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match && match[1]) {
    return match[1].replace(/[#*`_]/g, '').trim();
  }
  return fallback.replace(/\.md$/i, '').replace(/[-_]+/g, ' ');
}

function scanMarkdownFiles(dir: string, baseDir: string = MD_BASE_DIR): DocItem[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let results: DocItem[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(scanMarkdownFiles(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const relativePath = path.relative(baseDir, fullPath);
      const parts = relativePath.split(path.sep);
      const category = parts.length > 1 ? parts[0] : 'Umum';
      const stats = fs.statSync(fullPath);
      
      let title = entry.name;
      try {
        const previewContent = fs.readFileSync(fullPath, { encoding: 'utf8', flag: 'r' });
        title = extractFirstHeading(previewContent, entry.name);
      } catch (e) {
        // Abaikan jika tidak terbaca
      }

      results.push({
        id: relativePath.replace(/[/\\]/g, '-'),
        name: entry.name,
        title,
        category,
        relativePath,
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
      // Sanitasi path untuk mencegah Path Traversal
      const normalized = path.normalize(targetFile).replace(/^(\.\.(\/|\\|$))+/, '');
      const fullPath = path.join(MD_BASE_DIR, normalized);

      if (!fullPath.startsWith(MD_BASE_DIR)) {
        return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
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
        relativePath: normalized,
        name: path.basename(fullPath),
        size: stats.size,
        updatedAt: stats.mtime.toISOString(),
      });
    }

    // JIKA MEMINTA DAFTAR SEMUA FILE MARKDOWN
    const allDocs = scanMarkdownFiles(MD_BASE_DIR);

    // Kelompokkan per kategori
    const groupedMap = new Map<string, DocItem[]>();
    for (const doc of allDocs) {
      if (!groupedMap.has(doc.category)) {
        groupedMap.set(doc.category, []);
      }
      groupedMap.get(doc.category)!.push(doc);
    }

    const categories: DocCategory[] = Array.from(groupedMap.entries()).map(([cat, items]) => {
      // Urutkan item: master atau README selalu di atas
      items.sort((a, b) => {
        const aIsMaster = a.name.includes('MASTER') || a.name.includes('README');
        const bIsMaster = b.name.includes('MASTER') || b.name.includes('README');
        if (aIsMaster && !bIsMaster) return -1;
        if (!aIsMaster && bIsMaster) return 1;
        return a.name.localeCompare(b.name);
      });

      return {
        category: cat,
        label: getCategoryLabel(cat),
        items,
      };
    });

    // Urutkan kategori (ai-arsitektur dulu, lalu fitur-searching, lalu lainnya)
    categories.sort((a, b) => {
      if (a.category === 'ai-arsitektur') return -1;
      if (b.category === 'ai-arsitektur') return 1;
      return a.label.localeCompare(b.label);
    });

    return NextResponse.json({
      total: allDocs.length,
      categories,
      defaultFile: allDocs.find(d => d.name.includes('MASTER'))?.relativePath || allDocs[0]?.relativePath || null,
    });
  } catch (error: any) {
    console.error('Error membaca berkas markdown:', error);
    return NextResponse.json({ error: error.message || 'Gagal memproses berkas markdown.' }, { status: 500 });
  }
}

