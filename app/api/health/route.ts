import { NextResponse } from 'next/server';
import { storeInfo } from '@/lib/store';
import { geminiAvailable } from '@/lib/gemini';
import { currentPlan } from '@/lib/skills';
import { getEffectiveHermesUrl } from '@/lib/settings-store';
import { initCleanupScheduler, runCleanupCycle } from '@/lib/cleanup';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Ensure background scheduler is running
  initCleanupScheduler();

  const url = new URL(req.url);
  let cleanupResult = null;
  if (url.searchParams.get('cleanup') === '1' || url.searchParams.get('purge') === '1') {
    cleanupResult = await runCleanupCycle();
  }

  const mem = process.memoryUsage();
  return NextResponse.json({
    ok: true,
    store: (await storeInfo()).driver,
    ai: geminiAvailable() ? 'gemini' : 'demo',
    plan: currentPlan(),
    cleanup: cleanupResult,
    telemetry: {
      uptimeSec: Math.round(process.uptime()),
      memoryMb: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      },
      hermesConfigured: Boolean(getEffectiveHermesUrl()),
      registeredSubagents: [
        'pm_spec',
        'ux_ui_designer',
        'system_analyst',
        'security_auditor',
        'fullstack_engineer',
        'qa_engineer',
        'devops_sentry',
      ],
    },
  });
}
