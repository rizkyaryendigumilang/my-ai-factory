import { getApiUsageMetrics } from '@/lib/metrics-core';
import { readRawSettings } from '@/lib/settings-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = readRawSettings();
  const usage = getApiUsageMetrics(settings);
  return Response.json(usage);
}
