import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    vps: {
      host: '43.156.236.102',
      hermesUrl: 'https://43.156.236.102:8444',
      dashboardUrl: 'https://43.156.236.102:8444/?profile=default',
      gatewayUrl: 'https://43.156.236.102:8443/',
      internalPort: 9119,
      service: 'hermes-dashboard.service',
    },
    status: 'configured',
  });
}
