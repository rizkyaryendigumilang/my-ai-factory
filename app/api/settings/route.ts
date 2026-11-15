import { NextResponse } from 'next/server';
import { getFactorySettings, saveFactorySettings } from '@/lib/settings-store';
import { isSafeExternalUrl } from '@/lib/security-scanner';
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
    // 1. Anti-CSRF Check: Origin must match Host if provided
    const origin = req.headers.get('origin');
    const host = req.headers.get('host');
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json({ error: 'Akses ditolak: CSRF terdeteksi' }, { status: 403 });
        }
      } catch {}
    }

    const body: Partial<FactorySettings> = await req.json();

    // 2. Validate any custom endpoints against SSRF rules
    if (body.vps?.hermesEndpoint) {
      const check = isSafeExternalUrl(body.vps.hermesEndpoint);
      if (!check.safe) {
        return NextResponse.json({ error: `Hermes endpoint tidak valid: ${check.error}` }, { status: 400 });
      }
    }
    if (body.ai?.routerUrl) {
      const check = isSafeExternalUrl(body.ai.routerUrl);
      if (!check.safe) {
        return NextResponse.json({ error: `Router URL tidak valid: ${check.error}` }, { status: 400 });
      }
    }

    const updated = saveFactorySettings(body);
    return NextResponse.json({ ok: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal menyimpan pengaturan' },
      { status: 500 }
    );
  }
}
