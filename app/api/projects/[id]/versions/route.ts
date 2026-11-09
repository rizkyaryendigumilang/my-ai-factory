import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as store from '@/lib/store';
import { isRunning } from '@/lib/agent-framework';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

const body = z.union([
  z.object({ restore: z.string().min(1) }), // must precede the all-optional {label} shape
  z.object({ label: z.string().trim().min(1).max(100).optional() }),
]);

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!(await store.getOwnedProject(id))) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  return NextResponse.json({ versions: await store.listVersions(id) });
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const parsed = body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Input tidak valid' }, { status: 400 });
  if (!(await store.getOwnedProject(id))) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  if (isRunning(id)) return NextResponse.json({ error: 'Proyek sedang diproses' }, { status: 409 });

  try {
    if ('restore' in parsed.data) {
      await store.restoreVersion(id, parsed.data.restore);
      return NextResponse.json({ ok: true });
    }
    const version = await store.createVersion(id, parsed.data.label ?? 'Simpan manual');
    return NextResponse.json({ version }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Gagal' }, { status: 400 });
  }
}
