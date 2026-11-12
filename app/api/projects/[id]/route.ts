import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { isRunning } from '@/lib/agent-framework';
import { allowedSkills } from '@/lib/skills';
import { updateProjectSchema } from '@/lib/validation';
import { isProjectFilesExpired, purgeProjectGeneratedFiles } from '@/lib/cleanup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  let state = await store.getOwnedProjectState(id);
  if (!state) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });

  // A "running" project with no live run means the server restarted mid-run.
  if (state.project.status === 'running' && !isRunning(id)) {
    await store.updateProject(id, { status: 'failed' });
    await store.addLog(id, { agent: 'system', action: 'run', status: 'failed', message: 'Proses terhenti (server restart). Jalankan ulang.' });
    state = (await store.getOwnedProjectState(id))!;
  }

  // Automatic TTL check: if 5 hours passed without download, purge generated files immediately
  if (isProjectFilesExpired(state.project) && !state.project.files_expired && state.files.length > 0) {
    await purgeProjectGeneratedFiles(id);
    state = (await store.getOwnedProjectState(id))!;
  }

  return NextResponse.json(state);
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const parsed = updateProjectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Input tidak valid', issues: parsed.error.flatten() }, { status: 400 });
  }
  if (!(await store.getOwnedProject(id))) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  if (isRunning(id)) return NextResponse.json({ error: 'Proyek sedang diproses' }, { status: 409 });

  const patch = { ...parsed.data };
  if (patch.skills) patch.skills = allowedSkills(patch.skills);
  return NextResponse.json({ project: await store.updateProject(id, patch) });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!(await store.getOwnedProject(id))) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  if (isRunning(id)) return NextResponse.json({ error: 'Proyek sedang diproses' }, { status: 409 });
  await store.deleteProject(id);
  return NextResponse.json({ ok: true });
}
