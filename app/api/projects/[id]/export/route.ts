import * as store from '@/lib/store';
import { buildZip, exportFilename } from '@/lib/export';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await store.getOwnedProjectState(id);
  if (!state) return Response.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  if (!state.files.length) return Response.json({ error: 'Belum ada file untuk diekspor' }, { status: 409 });

  const bytes = await buildZip(state.project.title, state.files, state.documents);
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${exportFilename(state.project.title)}"`,
    },
  });
}
