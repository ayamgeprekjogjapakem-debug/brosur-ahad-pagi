import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

// Fungsi helper untuk mengecek apakah Service Role Key valid (bukan string placeholder)
function getAdminClient(supabaseServerClient: any) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const isKeyValid = 
    typeof serviceKey === 'string' &&
    serviceKey.length > 20 &&
    serviceKey !== 'your-service-role-key-here' &&
    !serviceKey.includes('your-service-role');

  if (isKeyValid && url) {
    try {
      return createSupabaseAdmin(url, serviceKey);
    } catch (e) {
      console.warn('Gagal membuat Supabase Admin Client, menggunakan client server biasa:', e);
    }
  }

  return supabaseServerClient;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cek akun aktif (role admin atau user)
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!adminProfile || !adminProfile.is_active || (adminProfile.role !== 'admin' && adminProfile.role !== 'user')) {
      return NextResponse.json({ error: 'Forbidden - Bukan Akun Aktif' }, { status: 403 });
    }

    const dbClient = getAdminClient(supabase);

    // Fetch semua profil dari tabel profiles
    let { data: profiles, error: profileErr } = await dbClient
      .from('profiles')
      .select('*');

    // Jika query menggunakan dbClient admin gagal (misal RLS / invalid key), fallback ke supabase standar
    if (profileErr && dbClient !== supabase) {
      const fallback = await supabase.from('profiles').select('*');
      profiles = fallback.data;
      profileErr = fallback.error;
    }

    if (profileErr) {
      return NextResponse.json({ error: `Gagal membaca profil: ${profileErr.message}` }, { status: 500 });
    }

    // Ambil info email & metadata dari Supabase Auth Admin jika service role key valid
    let authUsersMap: Record<string, any> = {};
    if (dbClient !== supabase) {
      try {
        const { data: authData } = await (dbClient as any).auth.admin.listUsers();
        if (authData?.users) {
          authData.users.forEach((u: any) => {
            authUsersMap[u.id] = {
              email: u.email,
              name: u.user_metadata?.name || u.user_metadata?.full_name || u.email?.split('@')[0] || 'Pengguna',
              created_at: u.created_at
            };
          });
        }
      } catch (e) {
        console.warn('Gagal membaca list auth users via admin API:', e);
      }
    }

    // Format final user list
    const users = (profiles || []).map((p: any) => {
      const authInfo = authUsersMap[p.id] || {};
      return {
        id: p.id,
        email: p.email || authInfo.email || `user-${p.id.slice(0, 8)}@brosur.local`,
        name: p.name || p.full_name || authInfo.name || 'Pengguna',
        role: p.role || 'user',
        is_active: Boolean(p.is_active),
        created_at: p.created_at || authInfo.created_at || new Date().toISOString(),
      };
    });

    // Jika ada akun di Auth API namun belum ada baris di tabel profiles, masukkan juga agar bisa diaktifkan
    Object.keys(authUsersMap).forEach((authId) => {
      if (!users.some((u: any) => u.id === authId)) {
        users.push({
          id: authId,
          email: authUsersMap[authId].email,
          name: authUsersMap[authId].name,
          role: 'user',
          is_active: false,
          created_at: authUsersMap[authId].created_at,
        });
      }
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Terjadi kesalahan server internal' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    if (!adminProfile || !adminProfile.is_active || (adminProfile.role !== 'admin' && adminProfile.role !== 'user')) {
      return NextResponse.json({ error: 'Forbidden - Bukan Akun Aktif' }, { status: 403 });
    }

    const dbClient = getAdminClient(supabase);
    const body = await request.json();
    const { action, userId, isActive, role } = body;

    // Aksi 1: AKTIFKAN SEMUA PENGGUNA
    if (action === 'activate_all') {
      let { error: updErr } = await dbClient
        .from('profiles')
        .update({ is_active: true })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (updErr && dbClient !== supabase) {
        const fb = await supabase.from('profiles').update({ is_active: true }).neq('id', '00000000-0000-0000-0000-000000000000');
        updErr = fb.error;
      }

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      // Jika menggunakan admin client, upsert user Auth yang belum ada di tabel profiles
      if (dbClient !== supabase) {
        try {
          const { data: authData } = await (dbClient as any).auth.admin.listUsers();
          if (authData?.users) {
            const upsertPayload = authData.users.map((u: any) => ({
              id: u.id,
              role: u.user_metadata?.role || 'user',
              is_active: true,
            }));
            await dbClient.from('profiles').upsert(upsertPayload, { onConflict: 'id' });
          }
        } catch (e) {
          console.warn('Gagal upsert list auth users:', e);
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Semua pengguna berhasil diaktifkan aksesnya!' 
      });
    }

    // Aksi 2: Toggle Status Aktif per pengguna
    if (action === 'toggle_active' && userId) {
      let { error: updErr } = await dbClient
        .from('profiles')
        .update({ is_active: Boolean(isActive) })
        .eq('id', userId);

      if (updErr && dbClient !== supabase) {
        const fb = await supabase.from('profiles').update({ is_active: Boolean(isActive) }).eq('id', userId);
        updErr = fb.error;
      }

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Status pengguna berhasil diubah menjadi ${isActive ? 'Aktif' : 'Nonaktif'}.` 
      });
    }

    // Aksi 3: Ubah Role per pengguna
    if (action === 'toggle_role' && userId && role) {
      let { error: updErr } = await dbClient
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (updErr && dbClient !== supabase) {
        const fb = await supabase.from('profiles').update({ role }).eq('id', userId);
        updErr = fb.error;
      }

      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Role pengguna berhasil diubah menjadi ${role.toUpperCase()}.` 
      });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenali.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Terjadi kesalahan server internal' }, { status: 500 });
  }
}
