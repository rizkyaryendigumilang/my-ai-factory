import { getSystemPerformanceMetrics } from '@/lib/metrics-core';

export const dynamic = 'force-dynamic';

export async function GET() {
  const metrics = getSystemPerformanceMetrics();
  return Response.json(metrics, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

