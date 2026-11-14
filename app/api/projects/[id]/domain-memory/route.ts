import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { retrieveDomainMemory } from '@/lib/domain-memory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await store.getOwnedProject(id);
  if (!project) {
    return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get('q') || project.raw_prompt || project.title;

  try {
    const snippets = await retrieveDomainMemory(q, id, 6);
    return NextResponse.json({ ok: true, snippets, query: q });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Gagal memuat domain memory' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await store.getOwnedProject(id);
  if (!project) {
    return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const query = String(body.query || project.raw_prompt || project.title);
    const snippets = await retrieveDomainMemory(query, id, 6);
    return NextResponse.json({ ok: true, snippets, query });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Gagal memproses query memory' }, { status: 500 });
  }
}
