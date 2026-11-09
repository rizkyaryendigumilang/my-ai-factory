import { NextResponse } from 'next/server';
import { z } from 'zod';
import * as store from '@/lib/store';
import { isRunning, startRun } from '@/lib/agent-framework';
import { geminiAvailable } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOFTWARE_HOUSE_AGENTS = [
  {
    id: 'agent-ceo',
    statusKey: 'agent-ceo',
    name: 'kiky',
    role: 'Chief Executive Officer (CEO)',
    emoji: '',
    color: '#f59e0b',
    gender: 'M',
    deskId: 'f_1774039774420_696',
    branch: 'EXECUTIVE',
    appearance: {
      skinTone: '#ffcc80',
      hairStyle: 'short',
      hairColor: '#1e1b4b',
      hairHighlight: null,
      eyebrowStyle: 'thick',
      eyeColor: '#212121',
      facialHair: null,
      facialHairColor: null,
      headwear: null,
      headwearColor: null,
      glasses: 'square',
      glassesColor: '#f59e0b',
      costume: null,
      heldItem: 'coffee',
      deskItem: 'trophy',
    },
  },
  {
    id: 'agent-1-pm',
    statusKey: 'agent-1-pm',
    name: 'PM',
    role: 'Product Management (BRD/PRD)',
    emoji: '',
    color: '#4ade80',
    gender: 'M',
    deskId: 'f_1773951870486_8255',
    branch: 'UNASSIGNED',
    appearance: {
      skinTone: '#ffcc80',
      hairStyle: 'medium',
      hairColor: '#ea580c',
      hairHighlight: null,
      eyebrowStyle: 'thick',
      eyeColor: '#212121',
      facialHair: null,
      facialHairColor: null,
      headwear: null,
      headwearColor: null,
      glasses: null,
      glassesColor: null,
      costume: null,
      heldItem: null,
      deskItem: 'plans',
    },
  },
  {
    id: 'agent-5-ux',
    statusKey: 'agent-5-ux',
    name: 'Stitch',
    role: 'UI/UX Designer',
    emoji: '',
    color: '#38bdf8',
    gender: 'M',
    deskId: 'f_1773951840919_325',
    branch: 'UNASSIGNED',
    appearance: {
      skinTone: '#ffcc80',
      hairStyle: 'short',
      hairColor: '#7c3f1d',
      hairHighlight: null,
      eyebrowStyle: 'thick',
      eyeColor: '#212121',
      facialHair: null,
      facialHairColor: null,
      headwear: null,
      headwearColor: null,
      glasses: null,
      glassesColor: null,
      costume: null,
      heldItem: null,
      deskItem: 'chart',
    },
  },
  {
    id: 'intelligence-risk',
    statusKey: 'intelligence-risk',
    name: 'Scout',
    role: 'Cloud & Risk Scout',
    emoji: '',
    color: '#2dd4bf',
    gender: 'M',
    deskId: 'f_1773951847972_3727',
    branch: 'UNASSIGNED',
    appearance: {
      skinTone: '#ffcc80',
      hairStyle: 'buzz',
      hairColor: '#1e293b',
      hairHighlight: null,
      eyebrowStyle: 'thick',
      eyeColor: '#212121',
      facialHair: null,
      facialHairColor: null,
      headwear: null,
      headwearColor: null,
      glasses: null,
      glassesColor: null,
      costume: null,
      heldItem: null,
      deskItem: 'checklist',
    },
  },
  {
    id: 'agent-4-analyst',
    statusKey: 'agent-4-analyst',
    name: 'Analyst',
    role: 'System Analyst (ERD/UML)',
    emoji: '',
    color: '#fb923c',
    gender: 'M',
    deskId: 'f_1773951861290_7181',
    branch: 'UNASSIGNED',
    appearance: {
      skinTone: '#ffcc80',
      hairStyle: 'short',
      hairColor: '#0f172a',
      hairHighlight: null,
      eyebrowStyle: 'thick',
      eyeColor: '#212121',
      facialHair: null,
      facialHairColor: null,
      headwear: null,
      headwearColor: null,
      glasses: null,
      glassesColor: null,
      costume: null,
      heldItem: null,
      deskItem: 'files',
    },
  },
  {
    id: 'tech-stack-security',
    statusKey: 'tech-stack-security',
    name: 'Security',
    role: 'Security Architect',
    emoji: '',
    color: '#f87171',
    gender: 'M',
    deskId: 'f_1773951901321_304',
    branch: 'UNASSIGNED',
    appearance: {
      skinTone: '#ffcc80',
      hairStyle: 'buzz',
      hairColor: '#64748b',
      hairHighlight: null,
      eyebrowStyle: 'thick',
      eyeColor: '#212121',
      facialHair: null,
      facialHairColor: null,
      headwear: null,
      headwearColor: null,
      glasses: null,
      glassesColor: null,
      costume: null,
      heldItem: null,
      deskItem: 'files',
    },
  },
  {
    id: 'agent-coder',
    statusKey: 'agent-coder',
    name: 'Coder',
    role: 'Fullstack Engineer',
    emoji: '',
    color: '#c084fc',
    gender: 'M',
    deskId: 'f_1773951938826_2639',
    branch: 'UNASSIGNED',
    appearance: {
      skinTone: '#ffcc80',
      hairStyle: 'spiky',
      hairColor: '#1e1b4b',
      hairHighlight: null,
      eyebrowStyle: 'thick',
      eyeColor: '#212121',
      facialHair: null,
      facialHairColor: null,
      headwear: null,
      headwearColor: null,
      glasses: null,
      glassesColor: null,
      costume: null,
      heldItem: null,
      deskItem: 'files',
    },
  },
  {
    id: 'agent-hermes',
    statusKey: 'agent-hermes',
    name: 'Hermes',
    role: 'Autonomous VPS Agent (43.156.236.102)',
    emoji: '',
    color: '#06b6d4',
    gender: 'M',
    deskId: 'f_1774304813756_8330',
    branch: 'UNASSIGNED',
    appearance: {
      skinTone: '#ffcc80',
      hairStyle: 'short',
      hairColor: '#4f46e5',
      hairHighlight: null,
      eyebrowStyle: 'thick',
      eyeColor: '#212121',
      facialHair: null,
      facialHairColor: null,
      headwear: null,
      headwearColor: null,
      glasses: null,
      glassesColor: null,
      costume: null,
      heldItem: null,
      deskItem: 'chart',
    },
  },
];

const body = z.object({ projectId: z.string().min(1), resume: z.boolean().optional() });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'projectId wajib diisi' }, { status: 400 });
  const { projectId, resume } = parsed.data;

  const project = await store.getOwnedProject(projectId);
  if (!project) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
  if (!project.raw_prompt.trim()) return NextResponse.json({ error: 'Ide proyek masih kosong' }, { status: 400 });

  const result = await startRun(projectId, { resume });
  if (result === 'already-running') return NextResponse.json({ error: 'Proyek sedang diproses' }, { status: 409 });
  return NextResponse.json({ ok: true, demo: !geminiAvailable() }, { status: 202 });
}

export async function GET(req: Request) {
  const projectId = new URL(req.url).searchParams.get('projectId');
  if (projectId) {
    const project = await store.getOwnedProject(projectId);
    if (!project) return NextResponse.json({ error: 'Proyek tidak ditemukan' }, { status: 404 });
    return NextResponse.json({
      status: project.status,
      running: isRunning(projectId),
      agents: SOFTWARE_HOUSE_AGENTS,
    });
  }
  return NextResponse.json({ ok: true, agents: SOFTWARE_HOUSE_AGENTS });
}
