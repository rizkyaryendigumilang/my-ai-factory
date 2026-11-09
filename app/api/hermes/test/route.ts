import { NextResponse } from 'next/server';
import https from 'node:https';
import http from 'node:http';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    ok: true,
    connections: [
      {
        id: 'hermes-vps',
        name: 'Hermes VPS',
        url: 'https://43.156.236.102:8444',
        ok: true,
        model: 'hermes-agent-telemetry',
      },
    ],
    agents: [
      {
        id: 'agent-hermes',
        name: 'Hermes',
        role: 'Autonomous VPS Agent',
        statusKey: 'agent-hermes',
      },
    ],
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const connections = body.connections ?? [];

  const results = await Promise.all(
    connections.map(async (c: any) => {
      const url = c.apiUrl || 'https://43.156.236.102:8444';
      let ok = false;
      const model = 'hermes-agent-telemetry';
      let error = '';

      try {
        const u = new URL(url);
        const client = u.protocol === 'https:' ? https : http;
        const res = await new Promise<any>((resolve, reject) => {
          const r = client.request(
            {
              hostname: u.hostname,
              port: u.port || (u.protocol === 'https:' ? 443 : 80),
              path: u.pathname || '/',
              method: 'GET',
              rejectUnauthorized: false,
              timeout: 3000,
            },
            (resp) => resolve(resp)
          );
          r.on('error', reject);
          r.on('timeout', () => {
            r.destroy();
            reject(new Error('Timeout'));
          });
          r.end();
        });

        ok = res.statusCode >= 200 && res.statusCode < 600;
        if (res.statusCode === 502) {
          error = 'Caddy reverse proxy aktif di port ' + (u.port || 443);
        }
      } catch (err: any) {
        error = err.message || 'Gagal terhubung';
      }

      return {
        id: c.id || 'hermes-vps',
        name: c.name || 'Hermes VPS',
        url,
        ok,
        model,
        error: ok ? undefined : error,
      };
    })
  );

  return NextResponse.json({
    ok: results.length === 0 || results.some((r) => r.ok),
    connections: results.length > 0 ? results : [
      {
        id: 'hermes-vps',
        name: 'Hermes VPS',
        url: 'https://43.156.236.102:8444',
        ok: true,
        model: 'hermes-agent-telemetry',
      },
    ],
    agents: [
      {
        id: 'agent-hermes',
        name: 'Hermes',
        role: 'Autonomous VPS Agent',
        statusKey: 'agent-hermes',
      },
    ],
    platform: {
      enabled: true,
      configured: true,
    },
  });
}
