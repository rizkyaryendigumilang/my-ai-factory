import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'virtual-office', 'default-office-config.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return NextResponse.json(JSON.parse(raw));
  } catch (err: any) {
    return NextResponse.json({ error: 'Config tidak ditemukan' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const filePath = path.join(process.cwd(), 'public', 'virtual-office', 'default-office-config.json');
  try {
    const body = await req.json();
    if (body && typeof body === 'object') {
      fs.writeFileSync(filePath, JSON.stringify(body, null, 2), 'utf8');
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Format data tidak valid' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Gagal menyimpan config' }, { status: 500 });
  }
}
