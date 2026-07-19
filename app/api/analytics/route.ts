import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'analytics.json');
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json({ uniqueVisitors: 0 });
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    return NextResponse.json({ uniqueVisitors: data.visitors?.length || 0 });
  } catch (error) {
    return NextResponse.json({ uniqueVisitors: 0 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId } = body;

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID required' }, { status: 400 });
    }

    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dataPath = path.join(dataDir, 'analytics.json');
    
    let data = { visitors: [] as string[] };
    if (fs.existsSync(dataPath)) {
      data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }

    if (!data.visitors.includes(deviceId)) {
      data.visitors.push(deviceId);
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    }

    return NextResponse.json({ success: true, uniqueVisitors: data.visitors.length });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
