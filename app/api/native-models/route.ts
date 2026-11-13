import { getNativeModelsCatalog } from '@/lib/metrics-core';
import { readRawSettings } from '@/lib/settings-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const settings = readRawSettings();
  const catalog = getNativeModelsCatalog(settings);
  return Response.json(catalog);
}
