import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawQuery = searchParams.get('q')?.toLowerCase() || '';
  const queryWords = rawQuery.split(/\s+/).filter(Boolean);

  const indexPath = path.join(process.cwd(), 'data', 'index.json');
  if (!fs.existsSync(indexPath)) {
    return NextResponse.json({ results: [] });
  }

  const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  
  if (queryWords.length === 0) {
    return NextResponse.json({ results: indexData });
  }

  const contentDir = path.join(process.cwd(), 'data', 'content');
  const results = [];

  for (const item of indexData) {
    let matched = false;
    let snippet = '';
    let score = 0;

    // Check title/year match first
    const titleAndYear = (item.judul.toLowerCase() + ' ' + item.tahun.toString());
    const exactTitleMatch = titleAndYear.includes(rawQuery);
    const matchesTitle = queryWords.every((word: string) => titleAndYear.includes(word));
    
    if (exactTitleMatch) {
      matched = true;
      score += 100; // Highest priority: exact phrase in title
    } else if (matchesTitle) {
      matched = true;
      score += 50; // High priority: all words in title
    }
    
    // Check full content and generate snippet
    try {
      const contentPath = path.join(contentDir, `${item.slug}.json`);
      if (fs.existsSync(contentPath)) {
        const fileData = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
        if (fileData.konten) {
          // Extract text without HTML tags for snippet generation
          const $ = cheerio.load(fileData.konten);
          const plainText = $.text().replace(/\s+/g, ' ');
          const plainTextLower = plainText.toLowerCase();
          
          const exactContentMatch = plainTextLower.includes(rawQuery);
          const matchesContent = queryWords.every((word: string) => plainTextLower.includes(word));
          
          if (exactContentMatch) {
            matched = true;
            score += 80; // High priority: exact phrase in content
            
            // Extract snippet based on the exact query
            const matchIdx = plainTextLower.indexOf(rawQuery);
            if (matchIdx !== -1) {
              const startIdx = Math.max(0, matchIdx - 40);
              const endIdx = Math.min(plainText.length, matchIdx + rawQuery.length + 80);
              snippet = (startIdx > 0 ? '...' : '') + plainText.substring(startIdx, endIdx) + (endIdx < plainText.length ? '...' : '');
            }
          } else if (matchesContent) {
            matched = true;
            // Calculate a proximity score based on how close the words are (simplified: just give base score)
            score += 10; // Lowest priority: scattered words
            
            // Extract snippet based on the first word's position
            const firstWordIdx = plainTextLower.indexOf(queryWords[0]);
            if (firstWordIdx !== -1) {
              const startIdx = Math.max(0, firstWordIdx - 40);
              const endIdx = Math.min(plainText.length, firstWordIdx + queryWords[0].length + 80);
              snippet = (startIdx > 0 ? '...' : '') + plainText.substring(startIdx, endIdx) + (endIdx < plainText.length ? '...' : '');
            }
          }
        }
      }
    } catch(e) {
      // Ignore read errors
    }

    if (matched) {
      results.push({
        ...item,
        score,
        snippet: snippet || undefined // only include if not empty
      });
    }
  }

  // Sort by highest score first
  results.sort((a, b) => b.score - a.score);

  return NextResponse.json({ results });
}
