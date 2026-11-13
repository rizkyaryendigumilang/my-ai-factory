import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    token: 'Apaya1234',
    wsPort: 3005,
    gatewayProtocol: 4,
    gatewayUrl: 'https://43.156.236.102:8444',
  });
}
