import { NextResponse } from 'next/server';
import { getOwnedProject } from '@/lib/store';
import { approveGateAndContinue } from '@/lib/agent-framework';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await getOwnedProject(id);
  if (!project) {
    return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { autoPilot?: boolean };
  const res = await approveGateAndContinue(id, !!body.autoPilot);

  return NextResponse.json({
    ok: true,
    result: res,
    message: 'Gate disetujui, perakitan tahap berikutnya dilanjutkan',
  });
}
