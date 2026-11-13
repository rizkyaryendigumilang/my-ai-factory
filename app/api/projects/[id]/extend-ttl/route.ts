import { NextResponse } from 'next/server';
import { getOwnedProject, updateProject } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await getOwnedProject(id);
  if (!project) {
    return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  }

  const now = new Date().toISOString();
  await updateProject(id, {
    files_ready_at: now,
    files_expired: false,
  });

  return NextResponse.json({
    ok: true,
    message: 'Masa aktif berkas sementara berhasil diperpanjang 5 jam',
    files_ready_at: now,
  });
}
