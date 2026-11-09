import { NextResponse } from 'next/server';
import { z } from 'zod';
import { extractDesignTokens } from '@/lib/agent-framework';
import { designRefs, personaSchema } from '@/lib/validation';
import * as store from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const body = z.object({
  projectId: z.string().optional(),
  prompt: z.string().max(8000).default(''),
  gem_persona: personaSchema.default('mvp-speedrunner'),
  refs: designRefs.default([]),
});

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Input tidak valid' }, { status: 400 });
  const { projectId, prompt, gem_persona, refs } = parsed.data;
  if (!refs.length && !prompt.trim()) {
    return NextResponse.json({ error: 'Unggah gambar, masukkan tautan, atau isi ide terlebih dahulu' }, { status: 400 });
  }
  const project = projectId ? await store.getOwnedProject(projectId) : null;
  if (projectId && !project) {
    return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  }

  try {
    const designToken = await extractDesignTokens(
      { title: project?.title ?? 'Preview', raw_prompt: prompt || project?.raw_prompt || '', gem_persona: project?.gem_persona ?? gem_persona },
      refs
    );
    return NextResponse.json({ ok: true, designToken });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? String(err) }, { status: 502 });
  }
}
