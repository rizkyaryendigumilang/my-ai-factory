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

    // Merge non-sensitive fields
    const merged = { ...current, ...payload };

    // Prevent masked values from overwriting real config
    if (payload.hermes?.connections && Array.isArray(payload.hermes.connections)) {
      merged.hermes.connections = payload.hermes.connections.map((c: any, idx: number) => {
        const existing = current.hermes?.connections?.[idx] || {};
        return {
          ...c,
          apiKey: c.apiKey && !c.apiKey.startsWith('••') ? c.apiKey : existing.apiKey || '',
        };
      });
    }

    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2), 'utf8');
    return NextResponse.json({ ok: true, config: merged });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal menyimpan config' }, { status: 500 });
  }
}
