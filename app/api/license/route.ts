import { getEnterpriseLicense } from '@/lib/metrics-core';

export const dynamic = 'force-dynamic';

export async function GET() {
  const license = getEnterpriseLicense();
  return Response.json(license);
}
