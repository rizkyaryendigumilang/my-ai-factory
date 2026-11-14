import { NextResponse } from 'next/server';
import * as store from '@/lib/store';
import { generateWithMeta, geminiAvailable } from '@/lib/gemini';
import { canAccessProject, getSessionUserId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface AgentWarRoomResponse {
  role: string;
  agentName: string;
  title: string;
  avatarColor: string;
  opinion: string;
}

const AGENTS_METADATA = [
  {
    role: 'agent-1-pm',
    agentName: 'Sarah Lin',
    title: 'Product Manager',
    avatarColor: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    perspective: 'Scope, user value, business viability, acceptance criteria priority.',
  },
  {
    role: 'agent-5-ux',
    agentName: 'Kenzo Takahashi',
    title: 'Lead UI/UX Designer',
    avatarColor: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    perspective: 'Design system, Apple HIG tokens, visual polish, intuitive friction-free user flows.',
  },
  {
    role: 'agent-4-analyst',
    agentName: 'Aria Wijaya',
    title: 'System Analyst',
    avatarColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    perspective: 'ERD schema integrity, data flows, entity relationships, database indexing.',
  },
  {
    role: 'tech-stack-security',
    agentName: 'Viktor Thorne',
    title: 'Security Auditor',
    avatarColor: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
    perspective: 'OWASP Top 10, multi-tenant isolation, CORS/CSP headers, secret leak prevention.',
  },
  {
    role: 'agent-coder',
    agentName: 'Alex Rivers',
    title: 'Senior Fullstack Coder',
    avatarColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    perspective: 'Next.js 15 App Router, React 19 server components, clean code, zero tech debt.',
  },
  {
    role: 'qa_engineer',
    agentName: 'Elena Rostova',
    title: 'Lead QA Engineer',
    avatarColor: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
    perspective: 'Gherkin scenarios, automated test suites, stress testing, edge-case coverage.',
  },
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const projectId = String(body.projectId || '').trim();
    const question = String(body.question || '').trim();

    if (!projectId || !question) {
      return NextResponse.json({ error: 'ID Proyek dan pertanyaan wajib disertakan' }, { status: 400 });
    }

    const [project, userId] = await Promise.all([store.getProject(projectId), getSessionUserId()]);
    if (!project || !canAccessProject(project, userId)) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan atau akses ditolak' }, { status: 404 });
    }

    const docs = await store.listDocuments(projectId);
    const prdDoc = docs.find((d) => d.doc_type === 'brd_prd')?.content_json;
    const stackDoc = docs.find((d) => d.doc_type === 'tech_stack')?.content_json;

    const contextBrief = `PROJECT: ${project.title}
PROMPT: ${project.raw_prompt}
CURRENT GATE: ${project.approval_gate || 'none'}
STACK: ${JSON.stringify(stackDoc?.stack ?? [])}
PRD: ${JSON.stringify(prdDoc?.prd ?? '').slice(0, 500)}`;

    let opinions: Record<string, string> = {};

    if (geminiAvailable()) {
      const prompt = `You are orchestrating an emergency War Room Meeting with 6 autonomous AI Software Engineering Specialists answering Commander Kiky's question.
${contextBrief}

COMMANDER KIKY'S QUESTION:
"${question}"

Provide a concise, highly insightful, domain-specific answer (2-4 sentences each, in Indonesian) from each specialist.
Return JSON:
{
  "opinions": {
    "agent-1-pm": "Opinion from Product Manager focusing on user stories and scope",
    "agent-5-ux": "Opinion from UI/UX Designer focusing on design tokens and UX",
    "agent-4-analyst": "Opinion from System Analyst focusing on ERD and data structures",
    "tech-stack-security": "Opinion from Security Auditor focusing on OWASP and risk",
    "agent-coder": "Opinion from Senior Fullstack Coder focusing on implementation",
    "qa_engineer": "Opinion from QA Engineer focusing on test coverage and verification"
  }
}`;

      try {
        const res = await generateWithMeta(prompt, { json: true, temperature: 0.3 });
        const parsed = JSON.parse(res.text.replace(/```(?:json)?/g, '').trim());
        if (parsed.opinions) opinions = parsed.opinions;
      } catch {}
    }

    // Default authentic domain responses if offline or missing
    const responses: AgentWarRoomResponse[] = AGENTS_METADATA.map((agent) => ({
      role: agent.role,
      agentName: agent.agentName,
      title: agent.title,
      avatarColor: agent.avatarColor,
      opinion:
        opinions[agent.role] ||
        getDefaultOpinion(agent.role, project.title, question),
    }));

    // Record war room discussion to project logs
    await store.addLog(projectId, {
      agent: 'system',
      action: 'war-room',
      status: 'completed',
      message: `[War Room Sentral] Kiky memanggil rapat meja bundar: "${question.slice(0, 80)}"`,
    });

    return NextResponse.json({ ok: true, responses, question });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Gagal menggelar rapat War Room' }, { status: 500 });
  }
}

function getDefaultOpinion(role: string, projectTitle: string, question: string): string {
  switch (role) {
    case 'agent-1-pm':
      return `Dari sudut pandang produk untuk ${projectTitle}, pertanyaan "${question.slice(0, 40)}" perlu diseimbangkan antara scope MVP dan delivery timeline. Rekomendasi saya: prioritaskan user stories inti terlebih dahulu agar pengguna mendapatkan nilai instan.`;
    case 'agent-5-ux':
      return `Dari segi interface dan pengalaman pengguna, kita harus menjaga konsistensi Apple HIG tokens dan ritme visual clean. Setiap micro-interaction pada alur ini harus memberi feedback instan tanpa membuat UI terlihat cluttered.`;
    case 'agent-4-analyst':
      return `Dari sisi relasi data dan ERD, arsitektur entitas saat ini sudah menampung kebutuhan ini dengan baik. Pastikan foreign key dan indeks pada tabel utama dioptimalkan agar tidak memicu query bottleneck.`;
    case 'tech-stack-security':
      return `Terkait keamanan, setiap input dari alur ini wajib divalidasi dengan Zod schema di server endpoint. Kita harus mematuhi OWASP A01 (Broken Access Control) dengan memastikan otorisasi session valid.`;
    case 'agent-coder':
      return `Secara teknis kode Next.js 15, implementasi ini sangat bersih jika kita pisahkan antara Server Component untuk fetch data dan Client Component interaktif. Tidak ada kompleksitas berlebih yang memperlambat compile.`;
    case 'qa_engineer':
      return `Saya menyarankan penambahan 2 skenario pengujian Gherkin tambahan untuk memverifikasi edge-case pada alur ini. Kita harus memastikan acceptance criteria terpenuhi 100% sebelum rilis ke sandbox.`;
    default:
      return 'Semua sistem divisi siap mendukung arahan Commander Kiky.';
  }
}
