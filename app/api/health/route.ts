import { NextResponse } from 'next/server';
import { storeInfo } from '@/lib/store';
import { geminiAvailable } from '@/lib/gemini';
import { currentPlan } from '@/lib/skills';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    store: (await storeInfo()).driver,
    ai: geminiAvailable() ? 'gemini' : 'demo',
    plan: currentPlan(),
  });
}
