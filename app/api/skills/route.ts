import { NextResponse } from 'next/server';
import { SKILLS, currentPlan } from '@/lib/skills';

export const dynamic = 'force-dynamic';

export async function GET() {
  const plan = currentPlan();
  return NextResponse.json({
    plan,
    skills: SKILLS.map((s) => ({ ...s, locked: s.tier === 'pro' && plan !== 'pro' })),
  });
}
