import crypto from 'crypto';

export interface FcmPayload {
  targetType: 'topic' | 'token';
  target: string; // nama topik (misal 'brosur_baru') atau registration token HP
  title: string;
  body: string;
  screen?: string;
  itemId?: string;
  slug?: string;
  imageUrl?: string;
  extraData?: Record<string, string>;
}

export interface FcmSendResult {
  success: boolean;
  messageId?: string;
  mode: 'live' | 'simulated';
  error?: string;
  details?: any;
}

/**
 * Mendapatkan OAuth2 Access Token dari Google Service Account untuk FCM HTTP v1 API.
 * Menggunakan modul bawaan 'crypto' Node.js tanpa perlu library eksternal yang berat.
 */
async function getGoogleOAuth2AccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (str: string) => {
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Bersihkan format private key (misal jika \n di escape sebagai '\\n')
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(formattedPrivateKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${signature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Gagal autentikasi Google OAuth2: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

/**
 * Mengirim Push Notifikasi ke Firebase Cloud Messaging (FCM HTTP v1 API)
 */
export async function sendPushNotification(payload: FcmPayload): Promise<FcmSendResult> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  // Cek apakah kredensial Firebase tersedia di env
  const isConfigured = Boolean(projectId && clientEmail && privateKey && !privateKey.includes('your-private-key'));

  if (!isConfigured) {
    // Mode Simulasi / Sandbox jika belum ada kredensial
    return {
      success: true,
      mode: 'simulated',
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      details: {
        info: 'Kredensial Firebase (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) belum disetel di .env.local. Notifikasi diproses dalam mode simulasi.',
        target: payload.target,
        payload,
      },
    };
  }

  try {
    const accessToken = await getGoogleOAuth2AccessToken(clientEmail!, privateKey!);

    // Buat data dictionary string-only untuk Flutter
    const stringData: Record<string, string> = {
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      screen: payload.screen || 'beranda',
      target: payload.target,
      timestamp: new Date().toISOString(),
    };

    if (payload.itemId) stringData.itemId = String(payload.itemId);
    if (payload.slug) stringData.slug = String(payload.slug);
    if (payload.extraData) {
      for (const [k, v] of Object.entries(payload.extraData)) {
        stringData[k] = String(v);
      }
    }

    // Bangun payload resmi FCM HTTP v1
    const fcmMessage: any = {
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
      },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channel_id: 'pustaka_notifications_channel',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    if (payload.targetType === 'topic') {
      // Hilangkan karakter slash atau prefiks /topics/ jika ada
      const sanitizedTopic = payload.target.replace(/^\/topics\//, '').trim();
      fcmMessage.topic = sanitizedTopic;
    } else {
      fcmMessage.token = payload.target.trim();
    }

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ message: fcmMessage }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return {
        success: false,
        mode: 'live',
        error: `FCM API Error (${response.status}): ${errorData}`,
      };
    }

    const responseData = await response.json();
    return {
      success: true,
      mode: 'live',
      messageId: responseData.name, // misal: projects/xxx/messages/yyy
      details: responseData,
    };
  } catch (error: any) {
    return {
      success: false,
      mode: 'live',
      error: error.message || 'Terjadi kesalahan saat menghubungi Firebase Cloud Messaging',
    };
  }
}
