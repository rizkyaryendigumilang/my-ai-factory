import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'virtual-office', 'vo-config.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({
      office: {
        name: 'My AI Factory Software House',
        port: 3000,
        previewBubbles: {
          displayMode: 'consistent',
          size: 'large',
          contentZoom: 100,
        },
      },
      openclaw: {
        gatewayUrl: 'ws://127.0.0.1:18789',
        gatewayHttp: 'http://127.0.0.1:18789',
      },
      hermes: {
        enabled: true,
        timeoutSec: 600,
        resourceRoot: '/data/hermes',
        resourceAccess: 'read-write',
        connections: [
          {
            id: 'hermes-vps',
            name: 'Hermes VPS',
            apiUrl: 'https://43.156.236.102:8444',
            apiKey: 'Apaya1234',
            enabled: true,
          },
        ],
        platformEnabled: true,
        platformAgentId: 'hermes-gateway',
      },
      weather: {
        location: 'Jakarta,ID',
      },
    });
  }
}
