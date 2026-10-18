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

    // Cek akun aktif (role super-admin, admin, atau user)
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single();

    // Jika adminProfile belum ada di tabel profiles, default ke role dari user_metadata atau 'super-admin'
    const userRole = adminProfile?.role || (user.user_metadata?.role as string) || 'super-admin';
    const isUserActive = adminProfile ? Boolean(adminProfile.is_active) : true;

    const allowedRoles = ['super-admin', 'admin', 'user'];
    if (!isUserActive || !allowedRoles.includes(userRole)) {
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
      const isCurrentUser = p.id === user.id;
      return {
        id: p.id,
        email: p.email || (isCurrentUser ? user.email : '') || authInfo.email || `user-${p.id.slice(0, 8)}@brosur.local`,
        name: p.name || p.full_name || (isCurrentUser ? (user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0]) : '') || authInfo.name || 'Pengguna',
        role: p.role || (isCurrentUser ? userRole : 'user'),
        is_active: Boolean(p.is_active),
        created_at: p.created_at || authInfo.created_at || (isCurrentUser ? user.created_at : '') || new Date().toISOString(),
      };
    });

    // Jika akun pengguna saat ini belum ada di tabel profiles, masukkan langsung agar pasti tercantum
    if (!users.some((u: any) => u.id === user.id)) {
      users.unshift({
        id: user.id,
        email: user.email || (userRole === 'super-admin' ? 'superadmin@brosurahad.id' : 'admin@brosurahad.id'),
        name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || (userRole === 'super-admin' ? 'Super Admin' : 'Admin'),
        role: userRole,
        is_active: Boolean(isUserActive),
        created_at: user.created_at || new Date().toISOString(),
      });
    }

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

    // RULE: Jika yang login adalah role admin biasa (bukan super-admin),
    // jangan munculkan akun-akun ber-role 'super-admin'
    let visibleUsers = users;
    if (userRole !== 'super-admin') {
      visibleUsers = users.filter((u: any) => u.role !== 'super-admin');
    }

    // Return current user id and role in GET response so client knows identity and boundaries
    return NextResponse.json({ 
      success: true, 
      currentUserId: user.id,
      currentUserRole: userRole,
      users: visibleUsers 
    });
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

    // Hanya super-admin atau admin yang berhak mengakses endpoint ini
    const isSuperAdmin = adminProfile?.role === 'super-admin';
    const isAdmin = adminProfile?.role === 'admin';

    if (!adminProfile || !adminProfile.is_active || (!isSuperAdmin && !isAdmin)) {
      return NextResponse.json({ error: 'Forbidden - Akses ini khusus Administrator' }, { status: 403 });
    }

    const dbClient = getAdminClient(supabase);
    const body = await request.json();
    const { action, userId, isActive, role, email, password, name } = body;

    // Helper untuk memeriksa target user jika aksi ditujukan pada spesifik user
    let targetProfile: any = null;
    if (userId) {
      // 1. RULE: Admin tidak bisa mengubah dirinya sendiri
      if (userId === user.id) {
        return NextResponse.json(
          { error: 'Anda tidak dapat mengubah status atau role akun Anda sendiri.' }, 
          { status: 403 }
        );
      }

      const { data: tp } = await dbClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      targetProfile = tp;

      // 2. RULE: Admin biasa tidak boleh mengubah akun yang berstatus super-admin
      if (!isSuperAdmin && targetProfile?.role === 'super-admin') {
        return NextResponse.json(
          { error: 'Admin tidak memiliki izin untuk mengubah akun Super Admin.' }, 
          { status: 403 }
        );
      }
    }

    // Aksi 0: REGISTRASI PENGGUNA BARU OLEH ADMIN
    if (action === 'register_user') {
      if (!email || !password) {
        return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
      }

      if (password.length < 6) {
        return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
      }

      const assignedRole = role || 'user';
      // RULE: Jika pemanggil adalah admin biasa, hanya boleh mendaftarkan 'user' atau 'admin'
      if (!isSuperAdmin && assignedRole === 'super-admin') {
        return NextResponse.json(
          { error: 'Admin tidak dapat mendaftarkan akun dengan role Super Admin.' }, 
          { status: 403 }
        );
      }

      // Buat user baru di Supabase Auth
      let newUserId: string | null = null;
      if (dbClient !== supabase && typeof (dbClient as any).auth?.admin?.createUser === 'function') {
        const { data: createdData, error: createErr } = await (dbClient as any).auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name: name || email.split('@')[0],
            role: assignedRole,
          }
        });

        if (createErr) {
          return NextResponse.json({ error: `Gagal membuat akun: ${createErr.message}` }, { status: 400 });
        }
        newUserId = createdData?.user?.id || null;
      } else {
        // Fallback jika service role key tidak tersedia: gunakan signUp standar
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || email.split('@')[0],
              role: assignedRole,
            }
          }
        });

        if (signUpErr) {
          return NextResponse.json({ error: `Gagal mendaftar: ${signUpErr.message}` }, { status: 400 });
        }
        newUserId = signUpData?.user?.id || null;
      }

      if (newUserId) {
        // Insert atau update data profiles dengan role dan status aktif langsung
        await dbClient.from('profiles').upsert({
          id: newUserId,
          email,
          name: name || email.split('@')[0],
          role: assignedRole,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      }

      return NextResponse.json({ 
        success: true, 
        message: `Pengguna ${email} berhasil didaftarkan sebagai ${assignedRole.toUpperCase()} dan langsung aktif.` 
      });
    }

    // Aksi 1: AKTIFKAN SEMUA PENGGUNA
    if (action === 'activate_all') {
      // Hanya super-admin yang bisa mass activate untuk mencegah abuse
      if (!isSuperAdmin) {
        return NextResponse.json({ error: 'Hanya Super Admin yang berhak mengaktifkan semua pengguna sekaligus.' }, { status: 403 });
      }

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
      // RULE: Admin biasa hanya bisa mengubah role menjadi 'user' atau 'admin', TIDAK bisa 'super-admin'
      if (!isSuperAdmin && role === 'super-admin') {
        return NextResponse.json(
          { error: 'Admin tidak memiliki hak akses untuk mengubah pengguna menjadi Super Admin.' }, 
          { status: 403 }
        );
      }

      // Hanya role yang valid yang diizinkan
      const validRoles = isSuperAdmin ? ['user', 'admin', 'super-admin'] : ['user', 'admin'];
      if (!validRoles.includes(role)) {
        return NextResponse.json({ error: 'Role tidak valid atau tidak diizinkan.' }, { status: 400 });
      }

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
