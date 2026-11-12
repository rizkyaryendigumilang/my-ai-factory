import * as store from '@/lib/store';
import { buildZip, exportFilename } from '@/lib/export';
import { isProjectFilesExpired, purgeProjectGeneratedFiles } from '@/lib/cleanup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const state = await store.getOwnedProjectState(id);
  if (!state) return Response.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });

  // Check if temporary files have expired (> 5 hours not downloaded)
  if (state.project.files_expired || isProjectFilesExpired(state.project)) {
    if (!state.project.files_expired) {
      await purgeProjectGeneratedFiles(id);
    }
    return Response.json(
      {
        error:
          'File proyek ini bersifat temporary dan telah dihapus dari VPS karena melebihi batas 5 jam belum diunduh. Dokumen spesifikasi tetap aman, silakan klik Regenerasi Kode untuk membuat ulang.',
      },
      { status: 410 }
    );
  }

  if (!state.files.length) return Response.json({ error: 'Belum ada file untuk diekspor' }, { status: 409 });

  // Mark project as downloaded (retains project files and confirms download)
  await store.updateProject(id, {
    downloaded: true,
    downloaded_at: new Date().toISOString(),
  });

  const bytes = await buildZip(state.project.title, state.files, state.documents);
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${exportFilename(state.project.title)}"`,
    },
  });
}
