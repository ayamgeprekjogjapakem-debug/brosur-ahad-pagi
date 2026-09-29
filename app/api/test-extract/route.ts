import { NextResponse } from 'next/server';

export async function GET() {
  const res = await fetch('http://localhost:3000/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'HADIST_1790605420317-Kitab-9-Imam.chm', // Example cloud file name from the user's prompt
      action: 'extract',
      destination: 'hadist_chm',
      selectedFiles: ['/Kitab-9-Imam/001.html', '/001.html'] // Trying some common paths
    })
  });
  const data = await res.json();
  return NextResponse.json(data);
}
