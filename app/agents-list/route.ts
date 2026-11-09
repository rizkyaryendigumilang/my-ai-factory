import { NextResponse } from 'next/server';
import { getDivisionConfigs } from '@/lib/division-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const divisions = getDivisionConfigs();
  const list = [
    {
      id: 'agent-ceo',
      name: 'kiky',
      role: 'Chief Executive Officer (CEO)',
      agentName: 'kiky',
      source: 'executive',
      model: 'Founder & CEO',
    },
    ...Object.values(divisions).map((d) => ({
      id: d.role,
      name: d.defaultName,
      role: d.divisionTitle,
      agentName: d.agentName,
      source: d.source,
      model: d.modelOrProfile,
    })),
  ];
  return NextResponse.json({ agents: list });
}
