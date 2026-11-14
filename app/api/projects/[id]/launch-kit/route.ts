import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { generateLaunchKit } from '@/lib/marketing-kit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await store.getOwnedProject(id);
  if (!project) {
    return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  }

  const docs = await store.listDocuments(id);
  const prdDoc = docs.find((d) => d.doc_type === 'brd_prd')?.content_json;
  const stackDoc = docs.find((d) => d.doc_type === 'tech_stack')?.content_json;

  const kit = generateLaunchKit(project, prdDoc, stackDoc);
  return NextResponse.json({ ok: true, kit });
}
