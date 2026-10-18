import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: folders, error } = await supabase
      .from('folders_hadist')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ folders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: 'Nama kategori harus diisi.' }, { status: 400 });
    }

    const slug = body.slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const description = body.description?.trim() || `Koleksi hadist ${name}`;

    // Cek apakah sudah ada kategori dengan nama atau slug ini
    const { data: existing } = await supabase
      .from('folders_hadist')
      .select('id, name')
      .or(`name.eq."${name}",slug.eq."${slug}"`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'Kategori sudah ada sebelumnya.', 
        folder: existing 
      });
    }

    const { data: newFolder, error } = await supabase
      .from('folders_hadist')
      .insert({
        name,
        slug,
        description
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Kategori "${name}" berhasil dibuat.`,
      folder: newFolder
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID kategori harus disertakan.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('folders_hadist')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
