import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { scanProjectFiles } from '@/lib/security-scanner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await store.getOwnedProject(id);
  if (!project) {
    return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  }

  const files = await store.listFiles(id);
  const report = scanProjectFiles(
    files.map((f) => ({ filePath: f.file_path, fileContent: f.file_content }))
  );

  return NextResponse.json({ ok: true, report });
}
