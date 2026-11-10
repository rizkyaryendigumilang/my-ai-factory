import { NextResponse } from 'next/server';
import { getFactorySettings, saveFactorySettings } from '@/lib/settings-store';
import type { FactorySettings } from '@/types/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = getFactorySettings();
    return NextResponse.json({ ok: true, settings });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal memuat pengaturan' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body: Partial<FactorySettings> = await req.json();
    const updated = saveFactorySettings(body);
    return NextResponse.json({ ok: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal menyimpan pengaturan' },
      { status: 500 }
    );
  }
}
