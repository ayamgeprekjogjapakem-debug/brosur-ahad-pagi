import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  // Ini adalah contoh konten Markdown.
  // Nantinya Anda bisa mengambil ini dari database (misal Supabase) berdasarkan 'id'
  const markdownContent = `
# Brosur Ahad Pagi

Ini adalah contoh konten yang dikirim dalam format **Markdown**. Flutter dapat dengan mudah merender ini menggunakan package \`flutter_markdown\`.

## Daftar Kajian
- Point 1: Penjelasan Aqidah
- Point 2: Fiqih Ibadah
- Point 3: Akhlaq Mulia

## Detail Tambahan
* Kajian rutin diadakan setiap hari Ahad pagi.
* Terbuka untuk umum.

> "Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lainnya."
  `;

  // Mengembalikan response JSON yang berisi string markdown agar mudah diparsing oleh Flutter
  return NextResponse.json({
    success: true,
    data: {
      id: id || 'default',
      title: 'Brosur Ahad Pagi',
      content: markdownContent,
      createdAt: new Date().toISOString(),
    }
  });
}
//