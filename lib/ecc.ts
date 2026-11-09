import 'server-only';
import { generateJson, generateWithMeta } from '@/lib/gemini';
import { sanitizePath, stripFences, type ManifestEntry } from '@/lib/ecc-core';

export * from '@/lib/ecc-core';

export async function buildManifest(ctx: string, maxFiles = 28): Promise<ManifestEntry[]> {
  const raw = await generateJson<{ files: ManifestEntry[] }>(
    `${ctx}

TASK: Plan the complete file directory of a runnable Next.js 15 (App Router) + TypeScript + Tailwind CSS + PocketBase project that implements the user stories above.
Rules:
- At most ${maxFiles} files. Include package.json, tsconfig.json, tailwind.config.js, postcss.config.js, next.config.js, .env.example, README.md, app/layout.tsx, app/page.tsx, app/globals.css, lib/pocketbase.ts, types/index.ts, and the components/pages/API routes the stories need.
- Also include "preview.html": ONE self-contained HTML file (Tailwind via CDN, vanilla JS, no build step) that visually mimics the main screen of the app using the design tokens, for live preview.
- Paths are relative, use forward slashes, no leading slash.
- "purpose" is one sentence. "exports" lists the public symbols other files import from it.
Return JSON: {"files":[{"path":"...","purpose":"...","exports":["..."]}]}`,
    { temperature: 0.3, maxOutputTokens: 16384 }
  );

  const seen = new Set<string>();
  const out: ManifestEntry[] = [];
  for (const f of raw.files ?? []) {
    const path = sanitizePath(f.path);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push({ path, purpose: String(f.purpose ?? ''), exports: f.exports });
  }
  const required: [string, string][] = [
    ['package.json', 'Dependencies and scripts.'],
    ['preview.html', 'Self-contained live preview of the main screen.'],
    ['README.md', 'Setup and run instructions.'],
  ];
  for (const [path, purpose] of required) {
    if (!seen.has(path)) out.push({ path, purpose });
  }
  return out.slice(0, maxFiles + 3);
}

const MAX_CONTINUATIONS = 4;

export async function generateFileComplete(
  entry: ManifestEntry,
  ctx: string,
  manifest: ManifestEntry[],
  extraInstruction = ''
): Promise<string> {
  const map = manifest.map((m) => `- ${m.path}${m.exports?.length ? ` (exports: ${m.exports.join(', ')})` : ''} — ${m.purpose}`).join('\n');
  const base = `${ctx}

FILE MAP (every file in the project; import only symbols listed here):
${map}

TASK: Write the COMPLETE contents of "${entry.path}" — ${entry.purpose}
Rules: production quality, no placeholders, no "TODO", no "rest of file", no truncation. Output ONLY the raw file content, no markdown fences, no commentary.${extraInstruction ? '\n' + extraInstruction : ''}`;

  let out = '';
  for (let i = 0; i <= MAX_CONTINUATIONS; i++) {
    const prompt =
      i === 0
        ? base
        : `${base}\n\nYour previous answer was cut off. Here is the end of what you wrote so far:\n<<<\n${out.slice(-2500)}\n>>>\nContinue EXACTLY from the next character. Do not repeat anything. Output only the remaining content.`;
    const r = await generateWithMeta(prompt, { temperature: 0.2, maxOutputTokens: 16384 });
    out += i === 0 ? stripFences(r.text) : r.text.replace(/\n?```\s*$/i, '');
    if (!r.truncated) break;
  }
  return out;
}
