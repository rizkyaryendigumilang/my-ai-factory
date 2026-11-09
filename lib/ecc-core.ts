export interface EccInput {
  title: string;
  rawPrompt: string;
  personaDirective: string;
  prd?: any;
  designTokens?: any;
  erd?: any;
  techStack?: any;
  skillDirectives: string[];
}

export interface ManifestEntry {
  path: string;
  purpose: string;
  exports?: string[];
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function compressContext(input: EccInput, budget = 7000): string {
  const stories: string[] = (input.prd?.userStories ?? [])
    .slice(0, 12)
    .map((s: any) => `- ${typeof s === 'string' ? s : s.story ?? s.title ?? ''}`);
  const entities: string[] = (input.erd?.nodes ?? []).map((n: any) => n.label ?? n.id).slice(0, 20);
  const stack: string[] = (input.techStack?.stack ?? [])
    .slice(0, 12)
    .map((s: any) => `${s.layer ?? ''}: ${s.choice ?? s}`);
  const t = input.designTokens;

  const sections = [
    `PROJECT: ${input.title}`,
    `IDEA: ${clip(input.rawPrompt, 1200)}`,
    `STYLE DIRECTIVE: ${input.personaDirective}`,
    t && `DESIGN TOKENS: colors=${JSON.stringify(t.colors ?? {})}; typography=${JSON.stringify(t.typography ?? {})}; radius=${t.radius ?? ''}`,
    stories.length && `USER STORIES:\n${stories.join('\n')}`,
    entities.length && `DATA ENTITIES: ${entities.join(', ')}`,
    stack.length && `STACK: ${stack.join(' | ')}`,
    input.skillDirectives.length && `INSTALLED SKILLS:\n${input.skillDirectives.map((d) => `- ${d}`).join('\n')}`,
  ].filter(Boolean) as string[];

  return clip(sections.join('\n\n'), budget);
}

/** Reject path traversal / absolute paths / junk and cap the file count. */
export function sanitizePath(p: string): string | null {
  const clean = String(p ?? '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
  if (!clean || clean.startsWith('/') || /^[a-z]:/i.test(clean)) return null;
  if (clean.split('/').some((seg) => seg === '..' || seg === '')) return null;
  if (clean.length > 120) return null;
  return clean;
}

/** Remove a leading ```lang line and a trailing ``` fence. */
export function stripFences(s: string): string {
  return s.replace(/^\s*```[a-z0-9]*\s*\n/i, '').replace(/\n?```\s*$/i, '');
}

/** Cheap structural checks so obviously broken output is retried once. */
export function validateFile(path: string, content: string): string | null {
  if (!content.trim()) return 'kosong';
  if (path.endsWith('.json')) {
    try {
      JSON.parse(content);
    } catch {
      return 'JSON tidak valid';
    }
  }
  return null;
}

/** Run `fn` over items with bounded concurrency, preserving order of results. */
export async function pool<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i], i);
      }
    })
  );
  return results;
}

/** Normalized URL/filename slug. */
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';

export const exportFilename = (title: string) => `${slug(title)}.zip`;

/** A session can access its own projects as well as legacy 'local' projects. */
export function canAccessProject(project: { user_id?: string }, userId: string): boolean {
  const owner = project.user_id ?? 'local';
  return owner === userId || owner === 'local';
}
