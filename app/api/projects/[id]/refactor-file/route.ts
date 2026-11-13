import { NextResponse } from 'next/server';
import { getOwnedProject } from '@/lib/store';
import { refactorSingleFile } from '@/lib/agent-framework';

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

  const body = (await req.json().catch(() => ({}))) as {
    filePath?: string;
    instruction?: string;
  };

  const filePath = body.filePath?.trim();
  const instruction = body.instruction?.trim();

  if (!filePath) {
    return NextResponse.json({ error: 'Parameter filePath wajib diisi' }, { status: 400 });
  }
  if (!instruction) {
    return NextResponse.json({ error: 'Parameter instruction wajib diisi' }, { status: 400 });
  }

  try {
    const res = await refactorSingleFile(id, filePath, instruction);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Gagal merefaktor berkas' },
      { status: 500 }
    );
  }
}
