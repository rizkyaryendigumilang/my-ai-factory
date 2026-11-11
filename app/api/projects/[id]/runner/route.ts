import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { getSandboxRunnerStatus, startSandboxRunner, stopSandboxRunner } from '@/lib/vps-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const project = await store.getOwnedProject(id);
  if (!project) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });

  const status = getSandboxRunnerStatus(id);
  return NextResponse.json({ ok: true, runner: status });
}

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const project = await store.getOwnedProject(id);
  if (!project) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const action = body.action || 'start';

  if (action === 'stop') {
    await stopSandboxRunner(id);
    return NextResponse.json({ ok: true, runner: getSandboxRunnerStatus(id) });
  }

  if (action === 'start' || action === 'restart') {
    const files = await store.listFiles(id);
    if (!files.length) {
      return NextResponse.json({ error: 'Belum ada file kode pada proyek ini. Jalankan perakitan terlebih dahulu.' }, { status: 400 });
    }
    const status = await startSandboxRunner(id, files);
    return NextResponse.json({ ok: true, runner: status });
  }

  return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 });
}
