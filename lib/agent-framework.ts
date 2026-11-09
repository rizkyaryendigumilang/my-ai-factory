import 'server-only';
import {
  generateJson,
  generateWithMeta,
  geminiAvailable,
  imageFromDataUrl,
} from '@/lib/gemini';
import {
  buildManifest,
  compressContext,
  generateFileComplete,
  pool,
  validateFile,
  type EccInput,
  type ManifestEntry,
} from '@/lib/ecc';
import { allowedSkills, getSkill } from '@/lib/skills';
import * as mock from '@/lib/mock';
import * as store from '@/lib/store';
import { getDivisionConfigs } from '@/lib/division-config';
import { isRemoteDivision, dispatchToRemoteAgent } from '@/lib/hermes-client';
import {
  GEM_PERSONAS,
  type AgentRole,
  type DesignReference,
  type DesignToken,
  type DiagramDoc,
  type Project,
} from '@/types';

export const MASTER_PROMPT = `You are the Master Orchestrator of an Autonomous AI Software Factory (MetaGPT & Microsoft Agent Framework architecture). Your job is to coordinate 5 specialized AI Agents to transform a user's raw prompt and visual references into a complete software product.

Here are your 5 Specialists:
1. Agent 1 (Product Manager): Analyzes the raw prompt and generates structured BRD, PRD, User Stories, and Acceptance Criteria.
2. Agent 2 & 3 (Tech Stack & Security Architect): Selects the optimal technology stack and embeds security hardening rules (OWASP Top 10).
3. Agent 4 (System Analyst): Generates formal system blueprints including UML, ERD, DFD, and Architecture Diagrams (formatted for .drawio XML and Mermaid.js).
4. Agent 5 (UI/UX Specialist & Google Stitch Integrator): Ingests uploaded wireframes/photos and design system links, extracting Design Tokens for the frontend.
5. Agent Coder (Full-Directory Developer): Uses ECC (Extended Context Compressor) to write complete, clean file directory structures (Next.js, Tailwind, PocketBase) synchronized with the PRD.

Instructions:
When a project is initialized, execute the workflow sequentially from Agent 5 -> Agent 1 -> Agent 4 -> Tech Stack -> Full-Directory Coder.
- Each agent receives the artifacts of the previous agents and must stay consistent with them (entity names, features, design tokens, stack).
- Honour the selected AI Persona (Gem) and every installed Skill.
- Be concrete and complete. Never output placeholders such as "TODO" or "etc.".
- Output exactly the format the current task asks for (JSON or raw file content), nothing else.`;

const ROLE_PROMPTS: Record<AgentRole, string> = {
  'agent-5-ux': 'You are Agent 5, UI/UX Specialist & Google Stitch Integrator. Extract design tokens (color palette, typography, UI structure) from the references.',
  'intelligence-risk': 'You are the Intelligence & Risk analyst. Identify architecture bottlenecks and risks, and estimate monthly cloud infrastructure cost at three scales.',
  'agent-1-pm': 'You are Agent 1, Product Manager. Produce a BRD and PRD (markdown), plus user stories each with acceptance criteria.',
  'agent-4-analyst': 'You are Agent 4, System Analyst. Produce formal diagrams as both Mermaid.js source and a node/edge list.',
  'tech-stack-security': 'You are Agents 2 & 3, Tech Stack and Security Architect. Choose the stack, embed OWASP Top 10 rules, and write the QA plan.',
  'agent-coder': 'You are Agent Coder. Write complete, clean, working files synchronized with the PRD, design tokens and data model.',
};

/* ------------------------------------------------------------------ *
 * AgentProvider Seam: two concrete adapters (geminiAdapter, demoAdapter)
 * ------------------------------------------------------------------ */

type Diagrams = Record<'uml' | 'erd' | 'dfd' | 'architecture', DiagramDoc>;
const DIAGRAM_SPECS: [keyof Diagrams, string, string][] = [
  ['erd', 'ERD (entities and relations)', 'erDiagram'],
  ['uml', 'UML class diagram', 'classDiagram'],
  ['dfd', 'DFD level 1 (external entities, processes, data stores)', 'flowchart'],
  ['architecture', 'system architecture diagram', 'flowchart'],
];

interface AgentProvider {
  readonly mode: 'gemini' | 'demo';
  extractTokens(
    project: Pick<Project, 'title' | 'raw_prompt' | 'gem_persona'>,
    refs: DesignReference[]
  ): Promise<DesignToken & { extractedTokens: string[] }>;
  analyzeRisk(project: Project): Promise<any>;
  writePrd(project: Project, tokens: any): Promise<any>;
  drawDiagram(project: Project, storiesBrief: string, spec: [keyof Diagrams, string, string]): Promise<DiagramDoc>;
  selectStackAndQa(project: Project, erd: any, prd: any): Promise<{ stack: any; qa: any }>;
  generateCode(
    project: Project,
    artifacts: { tokens?: any; prd?: any; erd?: any; stack?: any },
    progress: (msg: string) => Promise<unknown> | unknown
  ): Promise<number>;
}

const ask = <T>(role: AgentRole, project: Project, task: string, extra?: Parameters<typeof generateJson>[1]) =>
  generateJson<T>(
    `PROJECT: ${project.title}\nIDEA: ${project.raw_prompt}\nPERSONA (${project.gem_persona}): ${GEM_PERSONAS[project.gem_persona].directive}\n\nTASK:\n${task}`,
    { systemInstruction: `${MASTER_PROMPT}\n\n${ROLE_PROMPTS[role]}`, ...extra }
  );

const skillDirectives = (project: Project) =>
  allowedSkills(project.skills).map((id) => getSkill(id)!.directive);

const normDiagram = (raw: any, fallbackTitle: string): DiagramDoc => ({
  title: String(raw?.title ?? fallbackTitle),
  mermaid: String(raw?.mermaid ?? ''),
  nodes: (Array.isArray(raw?.nodes) ? raw.nodes : [])
    .filter((n: any) => n && n.id != null)
    .map((n: any) => ({ id: String(n.id), label: String(n.label ?? n.id), group: n.group ? String(n.group) : undefined })),
  edges: (Array.isArray(raw?.edges) ? raw.edges : [])
    .filter((e: any) => e && e.from != null && e.to != null)
    .map((e: any) => ({ from: String(e.from), to: String(e.to), label: e.label ? String(e.label) : undefined })),
});

const demo = async <T>(val: T, ms = 120): Promise<T> => {
  await new Promise((r) => setTimeout(r, ms));
  return val;
};

const demoAdapter: AgentProvider = {
  mode: 'demo',
  extractTokens: () => demo(mock.mockTokens()),
  analyzeRisk: (p) => demo(mock.mockRisk(p.title)),
  writePrd: (p) => demo(mock.mockPrd(p.title, p.raw_prompt)),
  drawDiagram: (_p, _s, [type]) => demo(mock.mockDiagrams()[type]),
  selectStackAndQa: (p) => demo({ stack: mock.mockStack(allowedSkills(p.skills)), qa: mock.mockQa() }),
  async generateCode(project, _artifacts, progress) {
    const files = await demo(mock.mockFiles(project.title, project.raw_prompt, allowedSkills(project.skills)));
    for (const f of files) await store.saveFile(project.id, f.path, f.content);
    await progress(`Demo: ${files.length} file contoh dibuat.`);
    return files.length;
  },
};

const geminiAdapter: AgentProvider = {
  mode: 'gemini',
  async extractTokens(project, refs) {
    const images = refs
      .filter((r) => r.type === 'image')
      .map((r) => imageFromDataUrl(r.url))
      .filter((x): x is NonNullable<typeof x> => !!x)
      .slice(0, 4);
    const links = refs.filter((r) => r.type === 'url').map((r) => r.url);

    return generateJson(
      `IDEA: ${project.raw_prompt}
PERSONA: ${GEM_PERSONAS[project.gem_persona].directive}
REFERENCE IMAGES: ${images.length} attached (wireframes / sketches / screenshots).
REFERENCE LINKS (not fetched, use only as naming hints): ${links.join(', ') || 'none'}

TASK: Extract design tokens. If no reference exists, propose a tasteful system that fits the idea.
Return JSON: {"colors":{"primary":"#hex","secondary":"#hex","background":"#hex","text":"#hex","accent":"#hex"},"typography":{"heading":"font name","body":"font name","scale":{"h1":"..","h2":"..","body":".."}},"spacing":{"sm":"..","md":"..","lg":".."}},"radius":"..","uiStructure":["section/component names seen or needed"],"source":"stitch|proposed","extractedTokens":["names of tokens extracted"]}`,
      { systemInstruction: `${MASTER_PROMPT}\n\n${ROLE_PROMPTS['agent-5-ux']}`, images }
    );
  },
  analyzeRisk(project) {
    return ask<any>(
      'intelligence-risk',
      project,
      `Analyse risks for this product. Return JSON: {"risks":[{"title":"","severity":"low|medium|high","description":"","mitigation":""}],"bottlenecks":["..."],"costEstimate":{"currency":"USD","tiers":[{"name":"MVP (<=100 users)","monthlyUsd":0},{"name":"Growth","monthlyUsd":0},{"name":"Scale","monthlyUsd":0}],"breakdown":[{"item":"","monthlyUsd":0}],"notes":""}}`
    );
  },
  writePrd(project, tokens) {
    return ask<any>(
      'agent-1-pm',
      project,
      `Design tokens context: ${JSON.stringify(tokens ?? {})}\nReturn JSON: {"brd":"markdown string","prd":"markdown string","userStories":[{"id":"US-1","story":"As a ..., I want ... so that ...","acceptanceCriteria":["Given/When/Then ..."]}]}. 6-12 user stories, each with 2-4 acceptance criteria. Write in the language of the idea.`,
      { maxOutputTokens: 32768 }
    );
  },
  async drawDiagram(project, storiesBrief, [, kind, mermaidKind]) {
    const raw = await ask<any>(
      'agent-4-analyst',
      project,
      `User stories: ${storiesBrief}\nDraw the ${kind} for this system. "mermaid" must be valid Mermaid.js ${mermaidKind} source (no markdown fences). "nodes" lists every box/entity/class/process with unique simple ids (letters/digits/underscore); "edges" lists connections between node ids.\nReturn JSON: {"title":"","mermaid":"","nodes":[{"id":"","label":"","group":""}],"edges":[{"from":"","to":"","label":""}]}`,
      { maxOutputTokens: 16384 }
    );
    return normDiagram(raw, kind);
  },
  async selectStackAndQa(project, erd, prd) {
    const skills = allowedSkills(project.skills);
    const directives = skillDirectives(project);
    const [stack, qa] = await Promise.all([
      ask<any>(
        'tech-stack-security',
        project,
        `Constraints: Next.js App Router + Tailwind + PocketBase + Gemini unless the idea clearly needs otherwise.\nInstalled skills to honour:\n${directives.map((d) => '- ' + d).join('\n') || '- none'}\nEntities: ${(erd?.nodes ?? []).map((n: any) => n.label).join(', ')}\nReturn JSON: {"stack":[{"layer":"","choice":"","reason":""}],"securityRules":[{"owasp":"A01 Broken Access Control","rule":"concrete rule for THIS app"}],"skillsApplied":${JSON.stringify(skills)}}`
      ),
      ask<any>(
        'tech-stack-security',
        project,
        `User stories with acceptance criteria: ${JSON.stringify(prd?.userStories ?? [])}\nWrite the QA plan. Return JSON: {"strategy":"","testCases":[{"id":"TC-1","title":"","steps":[""],"expected":""}]}`
      ),
    ]);
    return { stack, qa };
  },
  async generateCode(project, artifacts, progress) {
    const input: EccInput = {
      title: project.title,
      rawPrompt: project.raw_prompt,
      personaDirective: GEM_PERSONAS[project.gem_persona].directive,
      prd: artifacts.prd,
      designTokens: artifacts.tokens,
      erd: artifacts.erd,
      techStack: artifacts.stack,
      skillDirectives: skillDirectives(project),
    };
    const ctx = compressContext(input);
    const manifest = await buildManifest(ctx);
    await progress(`Manifest: ${manifest.length} file. Konteks dikompres ke ${ctx.length} karakter.`);

    let done = 0;
    const failed: string[] = [];
    await pool(manifest, 3, async (entry: ManifestEntry) => {
      try {
        let content = await generateFileComplete(entry, ctx, manifest);
        const problem = validateFile(entry.path, content);
        if (problem) {
          content = await generateFileComplete(entry, ctx, manifest, `The previous attempt was invalid (${problem}). Be careful.`);
          if (validateFile(entry.path, content)) throw new Error(`output tidak valid (${problem})`);
        }
        await store.saveFile(project.id, entry.path, content);
        done++;
        await progress(`Menulis ${entry.path} (${done}/${manifest.length})`);
      } catch (e: any) {
        failed.push(entry.path);
        await progress(`Gagal menulis ${entry.path}: ${e?.message ?? e}`);
      }
    });

    if (failed.length === manifest.length) throw new Error('Semua file gagal digenerate.');
    if (failed.length) await progress(`Peringatan: ${failed.length} file gagal (${failed.join(', ')}). Jalankan ulang untuk melengkapi.`);
    return done;
  },
};

const selectProvider = (): AgentProvider => (geminiAvailable() ? geminiAdapter : demoAdapter);

/* ------------------------------------------------------------------ */

const g = globalThis as unknown as { __factoryRuns?: Set<string> };
const runs = (g.__factoryRuns ??= new Set<string>());
export const isRunning = (id: string) => runs.has(id);

export async function extractDesignTokens(
  project: Pick<Project, 'title' | 'raw_prompt' | 'gem_persona'>,
  refs: DesignReference[]
): Promise<DesignToken & { extractedTokens: string[] }> {
  return selectProvider().extractTokens(project, refs);
}

/* ------------------------------ pipeline ------------------------------ */

async function launchBackgroundRun(
  projectId: string,
  opts: { resume?: boolean; codegenOnly?: boolean },
  versionLabel: string,
  work: (provider: AgentProvider) => Promise<void>
): Promise<'started' | 'already-running'> {
  if (runs.has(projectId)) return 'already-running';
  runs.add(projectId);
  try {
    await store.prepareProjectRun(projectId, opts);
  } catch (e) {
    runs.delete(projectId);
    throw e;
  }
  const provider = selectProvider();
  void (async () => {
    try {
      await work(provider);
      await store.createVersion(projectId, versionLabel);
      await store.updateProject(projectId, { status: 'completed' });
    } catch {
      await store.updateProject(projectId, { status: 'failed' }).catch(() => {});
    }
  })().finally(() => runs.delete(projectId));
  return 'started';
}

export async function startRun(
  projectId: string,
  opts: { resume?: boolean } = {}
): Promise<'started' | 'already-running'> {
  const resume = !!opts.resume;
  return launchBackgroundRun(projectId, { resume }, 'Hasil generasi otomatis', (provider) =>
    runPipeline(projectId, resume, provider)
  );
}

async function runPipeline(projectId: string, resume: boolean, provider: AgentProvider) {
  const project = await store.getProject(projectId);
  if (!project) return;
  const log = (agent: AgentRole | 'system', status: 'running' | 'completed' | 'failed', message: string) =>
    store.addLog(projectId, { agent, action: 'run', status, message });

  const previous = resume ? await store.listDocuments(projectId) : [];
  const prev = (t: string) => previous.find((d) => d.doc_type === t)?.content_json;

  if (resume) await log('system', 'running', 'Melanjutkan run dari tahap terakhir yang belum selesai.');
  if (provider.mode === 'demo') {
    await log('system', 'running', 'GEMINI_API_KEY tidak ditemukan → berjalan dalam mode demo offline.');
  }

  const artifacts: { tokens?: any; prd?: any; erd?: any; stack?: any } = {};

  const isQuotaOrServiceError = (err: unknown): boolean => {
    const msg = String((err as any)?.message ?? err);
    const status = (err as any)?.status;
    return (
      status === 429 ||
      status === 503 ||
      /kuota.*habis|quota exceeded|too many requests|rate-limit|experiencing high demand|503/i.test(msg)
    );
  };

  async function step<T>(
    role: AgentRole,
    startMsg: string,
    optional: boolean,
    reuse: string[],
    fn: () => Promise<{ value: T; summary: string }>,
    fallbackFn?: () => Promise<{ value: T; summary: string }>
  ): Promise<T | undefined> {
    if (resume && reuse.length && reuse.every((t) => prev(t) !== undefined)) {
      await log(role, 'completed', 'Memakai hasil sebelumnya.');
      return prev(reuse[0]) as T;
    }

    const divisions = getDivisionConfigs();
    const divConfig = divisions[role];
    const isRemote = isRemoteDivision(divConfig);

    if (isRemote) {
      await log(
        role,
        'running',
        `${startMsg} [Routing ke ${divConfig.source.toUpperCase()}: ${divConfig.agentName} (${divConfig.modelOrProfile})]`
      );
    } else {
      await log(role, 'running', startMsg);
    }

    try {
      const { value, summary } = await fn();
      const finalSummary = isRemote ? `${summary} (via ${divConfig.source})` : summary;
      await log(role, 'completed', finalSummary);
      return value;
    } catch (err: any) {
      if (fallbackFn && isQuotaOrServiceError(err)) {
        await log(role, 'running', 'Kuota Gemini API terbatas (429/503). Menggunakan generator lokal cerdas…');
        try {
          const fb = await fallbackFn();
          await log(role, 'completed', `${fb.summary} (mode fallback)`);
          return fb.value;
        } catch {
          // fallback failed, continue to standard error
        }
      }
      await log(role, 'failed', err?.message ?? String(err));
      if (!optional) throw err;
      return undefined;
    }
  }

  try {
    artifacts.tokens = await step('agent-5-ux', 'Mengekstrak design tokens dari referensi…', true, ['design_tokens'], async () => {
      const t = await provider.extractTokens(project, project.design_ref_url);
      await store.saveDocument(projectId, 'design_tokens', t);
      return { value: t, summary: `Design tokens: ${Object.keys(t.colors ?? {}).length} warna, font ${t.typography?.heading ?? '-'}.` };
    }, async () => {
      const t = await demoAdapter.extractTokens(project, project.design_ref_url);
      await store.saveDocument(projectId, 'design_tokens', t);
      return { value: t, summary: `Design tokens: ${Object.keys(t.colors ?? {}).length} warna, font ${t.typography?.heading ?? '-'}.` };
    });

    await step('intelligence-risk', 'Menganalisis risiko bottleneck & estimasi biaya cloud…', true, ['risk_analysis'], async () => {
      const risk = await provider.analyzeRisk(project);
      await store.saveDocument(projectId, 'risk_analysis', risk);
      return { value: risk, summary: `${risk.risks?.length ?? 0} risiko, ${risk.bottlenecks?.length ?? 0} bottleneck teridentifikasi.` };
    }, async () => {
      const risk = await demoAdapter.analyzeRisk(project);
      await store.saveDocument(projectId, 'risk_analysis', risk);
      return { value: risk, summary: `${risk.risks?.length ?? 0} risiko, ${risk.bottlenecks?.length ?? 0} bottleneck teridentifikasi.` };
    });

    artifacts.prd = await step('agent-1-pm', 'Menyusun BRD & PRD…', false, ['brd_prd'], async () => {
      const prd = await provider.writePrd(project, artifacts.tokens);
      await store.saveDocument(projectId, 'brd_prd', prd);
      return { value: prd, summary: `BRD & PRD selesai, ${prd.userStories?.length ?? 0} user story.` };
    }, async () => {
      const prd = await demoAdapter.writePrd(project, artifacts.tokens);
      await store.saveDocument(projectId, 'brd_prd', prd);
      return { value: prd, summary: `BRD & PRD selesai, ${prd.userStories?.length ?? 0} user story.` };
    });

    artifacts.erd = await step('agent-4-analyst', 'Merancang UML, ERD, DFD & Architecture Diagram…', false, ['erd', 'uml', 'dfd', 'architecture'], async () => {
      const storiesBrief = JSON.stringify((artifacts.prd?.userStories ?? []).map((s: any) => s.story ?? s));
      const done: Partial<Diagrams> = {};
      const failed: string[] = [];
      for (const spec of DIAGRAM_SPECS) {
        const [type] = spec;
        if (resume && prev(type)) {
          done[type] = prev(type);
          continue;
        }
        try {
          done[type] = await provider.drawDiagram(project, storiesBrief, spec);
          await log('agent-4-analyst', 'running', `${type.toUpperCase()} selesai (${done[type]!.nodes.length} node).`);
        } catch (e: any) {
          if (isQuotaOrServiceError(e)) {
            await log('agent-4-analyst', 'running', `Kuota Gemini terbatas pada ${type.toUpperCase()}, memakai template diagram sintetis…`);
            done[type] = await demoAdapter.drawDiagram(project, storiesBrief, spec);
          } else {
            failed.push(type);
            await log('agent-4-analyst', 'failed', `${type.toUpperCase()} gagal: ${e?.message ?? e}`);
          }
        }
        // Pacing delay (800ms) to respect Google Free Tier 5 RPM limit
        await new Promise((r) => setTimeout(r, 800));
      }
      for (const [type, doc] of Object.entries(done)) await store.saveDocument(projectId, type as any, doc);
      if (!done.erd) done.erd = await demoAdapter.drawDiagram(project, storiesBrief, DIAGRAM_SPECS[0]);
      const summary = failed.length
        ? `Diagram selesai kecuali ${failed.join(', ')}.`
        : 'Diagram UML, ERD, DFD, Architecture selesai (.drawio & Mermaid).';
      return { value: done.erd, summary };
    });

    artifacts.stack = await step(
      'tech-stack-security',
      'Memilih tech stack, aturan keamanan OWASP & QA plan…',
      false,
      ['tech_stack', 'qa_plan'],
      async () => {
        const { stack, qa } = await provider.selectStackAndQa(project, artifacts.erd, artifacts.prd);
        await store.saveDocument(projectId, 'tech_stack', stack);
        await store.saveDocument(projectId, 'qa_plan', qa);
        return { value: stack, summary: `${stack.stack?.length ?? 0} komponen stack, ${stack.securityRules?.length ?? 0} aturan keamanan, ${qa.testCases?.length ?? 0} test case.` };
      },
      async () => {
        const { stack, qa } = await demoAdapter.selectStackAndQa(project, artifacts.erd, artifacts.prd);
        await store.saveDocument(projectId, 'tech_stack', stack);
        await store.saveDocument(projectId, 'qa_plan', qa);
        return { value: stack, summary: `${stack.stack?.length ?? 0} komponen stack, ${stack.securityRules?.length ?? 0} aturan keamanan, ${qa.testCases?.length ?? 0} test case.` };
      }
    );

    await step(
      'agent-coder',
      'Menyusun manifest direktori…',
      false,
      [],
      async () => {
        const files = await provider.generateCode(project, artifacts, (msg) => log('agent-coder', 'running', msg));
        return { value: files, summary: `${files} file ditulis lengkap ke direktori proyek.` };
      },
      async () => {
        const files = await demoAdapter.generateCode(project, artifacts, (msg) => log('agent-coder', 'running', msg));
        return { value: files, summary: `${files} file contoh ditulis lengkap ke direktori proyek.` };
      }
    );

    await log('system', 'completed', 'Semua agen selesai. Proyek siap dipreview dan diekspor.');
  } catch (err) {
    await log('system', 'failed', 'Pipeline berhenti karena error di atas. Klik "Lanjutkan" untuk meneruskan dari agen yang gagal.');
    throw err;
  }
}

/** Re-run only Step 6 (code generation) using the documents already stored. */
export async function startCodegen(projectId: string): Promise<'started' | 'already-running'> {
  if (runs.has(projectId)) return 'already-running';
  const project = await store.getProject(projectId);
  if (!project) throw new Error('Proyek tidak ditemukan');
  const docs = await store.listDocuments(projectId);
  const doc = (t: string) => docs.find((d) => d.doc_type === t)?.content_json;
  if (!doc('brd_prd')) throw new Error('PRD belum ada — jalankan pabrik penuh terlebih dahulu.');

  const log = (status: 'running' | 'completed' | 'failed', message: string) =>
    store.addLog(projectId, { agent: 'agent-coder', action: 'codegen', status, message });

  return launchBackgroundRun(projectId, { codegenOnly: true }, 'Regenerasi kode', async (provider) => {
    await log('running', 'Regenerasi kode direktori…');
    try {
      const n = await provider.generateCode(
        project,
        { tokens: doc('design_tokens'), prd: doc('brd_prd'), erd: doc('erd'), stack: doc('tech_stack') },
        (m) => log('running', m)
      );
      await log('completed', `${n} file ditulis lengkap.`);
    } catch (e: any) {
      await log('failed', e?.message ?? String(e));
      throw e;
    }
  });
}

/* ----------------------------- visual edit ----------------------------- */

export interface VisualSelection {
  selector?: string;
  tag?: string;
  text?: string;
  html?: string;
}

export async function applyVisualEdit(
  projectId: string,
  instruction: string,
  selection?: VisualSelection
): Promise<{ changed: string[] }> {
  if (!geminiAvailable()) throw new Error('Visual Edit membutuhkan GEMINI_API_KEY (mode demo tidak mendukung edit).');
  const files = await store.listFiles(projectId);
  const preview = files.find((f) => f.file_path === 'preview.html');
  if (!preview) throw new Error('Belum ada preview.html — jalankan generasi kode terlebih dahulu.');

  await store.createVersion(projectId, `Otomatis: sebelum edit "${instruction.slice(0, 40)}"`);
  const sel = selection
    ? `SELECTED ELEMENT: <${selection.tag}> selector "${selection.selector}", text "${(selection.text ?? '').slice(0, 200)}"\nHTML: ${(selection.html ?? '').slice(0, 1500)}`
    : 'No element selected: apply the change where it makes sense.';
  const changed: string[] = [];

  const html = await generateWithMeta(
    `Here is the current preview.html:\n<<<\n${preview.file_content}\n>>>\n\n${sel}\n\nUSER INSTRUCTION: ${instruction}\n\nReturn the COMPLETE updated preview.html, changing only what the instruction requires. Output ONLY raw HTML, no fences.`,
    { temperature: 0.2, maxOutputTokens: 32768 }
  );
  if (html.truncated || !/<\/html>\s*$/i.test(html.text.trim().replace(/```\s*$/, ''))) {
    throw new Error('Respons edit terpotong atau tidak lengkap; coba instruksi yang lebih spesifik.');
  }
  await store.saveFile(projectId, 'preview.html', html.text.replace(/^\s*```html?\s*\n/i, '').replace(/\n?```\s*$/i, ''));
  changed.push('preview.html');

  const sources = files.filter((f) => f.file_path !== 'preview.html' && /\.(tsx|jsx|css|html)$/.test(f.file_path));
  if (sources.length) {
    try {
      const pick = await generateJson<{ path: string | null }>(
        `${sel}\nINSTRUCTION: ${instruction}\nProject files:\n${sources.map((f) => f.file_path).join('\n')}\nWhich single file implements this UI element? Return JSON {"path":"..."} or {"path":null} if unsure.`,
        { temperature: 0 }
      );
      const target = sources.find((f) => f.file_path === pick.path);
      if (target) {
        const content = await generateFileComplete(
          { path: target.file_path, purpose: `Apply this UI change and keep everything else identical: ${instruction}` },
          `CURRENT CONTENT OF ${target.file_path}:\n${target.file_content}\n\n${sel}`,
          sources.map((f) => ({ path: f.file_path, purpose: '' }))
        );
        if (!validateFile(target.file_path, content)) {
          await store.saveFile(projectId, target.file_path, content);
          changed.push(target.file_path);
        }
      }
    } catch {
      // Preview was already updated; source sync is best-effort.
    }
  }
  return { changed };
}
