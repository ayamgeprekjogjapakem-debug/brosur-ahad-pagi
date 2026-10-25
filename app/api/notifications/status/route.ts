import { NextResponse } from 'next/server';
import { getFcmConfigStatus } from '@/utils/fcm';

export async function GET() {
  const status = getFcmConfigStatus();
  return NextResponse.json({
    success: true,
    ...status,
  });
}
