import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { applyVisualEdit, isRunning, startCodegen } from '@/lib/agent-framework';
import { visualEditSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId wajib diisi' }, { status: 400 });
  if (!(await store.getOwnedProject(projectId))) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  return NextResponse.json({ files: await store.listFiles(projectId) });
}

export async function POST(req: Request) {
  const { projectId } = (await req.json().catch(() => ({}))) as { projectId?: string };
  if (!projectId) return NextResponse.json({ error: 'projectId wajib diisi' }, { status: 400 });
  if (!(await store.getOwnedProject(projectId))) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  try {
    const r = await startCodegen(projectId);
    if (r === 'already-running') return NextResponse.json({ error: 'Proyek sedang diproses' }, { status: 409 });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Gagal' }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const parsed = visualEditSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Input tidak valid' }, { status: 400 });
  const { projectId, instruction, selection } = parsed.data;
  if (!(await store.getOwnedProject(projectId))) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  if (isRunning(projectId)) return NextResponse.json({ error: 'Proyek sedang diproses' }, { status: 409 });
  try {
    const { changed } = await applyVisualEdit(projectId, instruction, selection);
    return NextResponse.json({ ok: true, changed });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Gagal menerapkan perubahan' }, { status: 502 });
  }
}
