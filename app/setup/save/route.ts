import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  const filePath = path.join(process.cwd(), 'public', 'virtual-office', 'vo-config.json');

  try {
    let current: any = {};
    if (fs.existsSync(filePath)) {
      current = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    const merged = { ...current, ...payload };
    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
    return NextResponse.json({ ok: true, config: merged });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan config' }, { status: 500 });
  }
}
