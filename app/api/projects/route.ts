import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { getSessionUserId } from '@/lib/session';
import { allowedSkills, currentPlan, PLAN_LIMITS } from '@/lib/skills';
import { createProjectSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getSessionUserId();
  const projects = await store.listProjects(userId);
  return NextResponse.json({ projects, plan: currentPlan() });
}

export async function POST(req: Request) {
  const parsed = createProjectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Input tidak valid', issues: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const userId = await getSessionUserId({ createIfMissing: true });

  // Freemium: monthly project quota scoped per user session on the free tier.
  const plan = currentPlan();
  const limit = PLAN_LIMITS[plan].projectsPerMonth;
  if (Number.isFinite(limit)) {
    const d = new Date();
    const monthStart = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
    const used = await store.countProjectsSince(monthStart, userId);
    if (used >= limit) {
      return NextResponse.json(
        { error: `Kuota Free habis (${limit} proyek/bulan). Upgrade ke Pro untuk akses tanpa batas.` },
        { status: 429 }
      );
    }
  }

  const project = await store.createProject({
    user_id: userId,
    title: data.title || data.raw_prompt.slice(0, 60),
    raw_prompt: data.raw_prompt,
    gem_persona: data.gem_persona,
    design_ref_url: data.design_ref_url,
    skills: allowedSkills(data.skills, plan),
  });
  return NextResponse.json({ project }, { status: 201 });
}
