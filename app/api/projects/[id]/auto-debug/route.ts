import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { generateWithMeta, geminiAvailable } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await store.getOwnedProject(id);
  if (!project) {
    return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawError = String(body.errorMessage || '').trim();
    if (!rawError) {
      return NextResponse.json({ error: 'Pesan error wajib disertakan' }, { status: 400 });
    }

    const files = await store.listFiles(id);

    // Identify offending file from stack trace or filename in error
    let targetFile = files.find((f) => rawError.includes(f.file_path));
    if (!targetFile) {
      // Default to main page or preview if not directly detected
      targetFile =
        files.find((f) => f.file_path.includes('page.tsx')) ||
        files.find((f) => f.file_path.includes('preview.html')) ||
        files[0];
    }

    let explanation = '';
    let patchApplied = false;

    if (geminiAvailable() && targetFile) {
      const prompt = `You are a Senior Fullstack Debugger. A runtime or build error occurred in a Next.js / React application.
ERROR LOG:
${rawError.slice(0, 1500)}

FILE PATH: ${targetFile.file_path}
CURRENT FILE CONTENT:
${targetFile.file_content.slice(0, 4000)}

TASK: Fix the error in the file content. Return JSON:
{
  "explanation": "Short Indonesian explanation of what caused the bug and how it was fixed",
  "fixedContent": "Complete updated file content with the fix applied (no truncation)"
}`;

      try {
        const result = await generateWithMeta(prompt, { json: true, temperature: 0.2 });
        const parsed = JSON.parse(result.text.replace(/```(?:json)?/g, '').trim());
        if (parsed.fixedContent && parsed.fixedContent.length > 20) {
          await store.saveFile(id, targetFile.file_path, parsed.fixedContent);
          explanation = parsed.explanation || 'Berhasil memperbaiki error dan memperbarui berkas kode.';
          patchApplied = true;
          await store.addLog(id, {
            agent: 'agent-coder',
            action: 'auto-debug',
            status: 'completed',
            message: `[Auto-Debug AI] Memperbaiki ${targetFile.file_path}: ${explanation}`,
          });
        }
      } catch (err: any) {
        explanation = `AI diagnosis: ${err?.message || 'Gagal memanggil model debug'}`;
      }
    }

    // Fallback if AI was unavailable or patch couldn't be generated
    if (!patchApplied && targetFile) {
      explanation = `Terdeteksi error pada ${targetFile.file_path}. Saran: periksa sintaks impor, tanda kurung penutup, atau dependensi yang belum terdefinisi.`;
    }

    return NextResponse.json({
      ok: true,
      patchApplied,
      fixedFile: targetFile?.file_path || 'none',
      explanation,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Gagal menjalankan auto-debug' },
      { status: 500 }
    );
  }
}
