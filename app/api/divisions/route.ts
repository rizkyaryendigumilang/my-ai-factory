import { NextResponse } from 'next/server';
import { getDivisionConfigs, saveDivisionConfigs, PROVIDER_OPTIONS } from '@/lib/division-config';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configs = getDivisionConfigs();
  return NextResponse.json({
    ok: true,
    divisions: configs,
    providers: PROVIDER_OPTIONS,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.divisions) {
    return NextResponse.json({ error: 'Data divisions wajib diisi' }, { status: 400 });
  }

  const updated = saveDivisionConfigs(body.divisions);

  // Synchronize with public/virtual-office/default-office-config.json
  try {
    const configPath = path.join(process.cwd(), 'public', 'virtual-office', 'default-office-config.json');
    if (fs.existsSync(configPath)) {
      const officeConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (Array.isArray(officeConfig.agents)) {
        officeConfig.agents.forEach((a: any) => {
          const div = updated[a.id as keyof typeof updated];
          if (div) {
            a.name = div.defaultName;
            const sourceTag =
              div.source === 'hermes-vps'
                ? 'HERMES-8444'
                : div.source === 'router9-vps'
                ? '9ROUTER-8443'
                : div.source === 'custom-vps'
                ? 'CUSTOM-VPS'
                : 'NATIVE';
            a.role = `${div.divisionTitle} [${sourceTag}]`;
          }
        });
        fs.writeFileSync(configPath, JSON.stringify(officeConfig, null, 2), 'utf8');
      }
    }
  } catch {}

  return NextResponse.json({ ok: true, divisions: updated });
}
