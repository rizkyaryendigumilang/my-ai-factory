import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as store from '@/lib/store';
import { isRunning } from '@/lib/agent-framework';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const body = z.object({ brd: z.string().max(200_000).optional(), prd: z.string().max(200_000).optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await store.getOwnedProject(id))) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Input tidak valid' }, { status: 400 });
  if (isRunning(id)) return NextResponse.json({ error: 'Proyek sedang diproses' }, { status: 409 });

  const current = (await store.listDocuments(id)).find((d) => d.doc_type === 'brd_prd');
  if (!current) return NextResponse.json({ error: 'Dokumen belum ada' }, { status: 404 });
  const document = await store.saveDocument(id, 'brd_prd', { ...current.content_json, ...parsed.data });
  return NextResponse.json({ document });
}
