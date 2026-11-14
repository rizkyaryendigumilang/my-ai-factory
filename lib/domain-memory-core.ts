import type { ProjectDocument } from '@/types';

export interface DomainMemorySnippet {
  id: string;
  sourceProjectId: string;
  sourceProjectTitle: string;
  category: 'architecture' | 'erd' | 'tech_stack' | 'security' | 'user_stories';
  title: string;
  content: string;
  score: number;
}

/**
 * Normalizes text into a set of lowercased tokens for keyword matching.
 */
export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(words);
}

/**
 * Computes Jaccard/overlap relevance score between a query token set and candidate text.
 */
export function computeRelevance(queryTokens: Set<string>, candidateText: string): number {
  if (queryTokens.size === 0) return 0;
  const candidateTokens = tokenize(candidateText);
  let matches = 0;
  for (const token of queryTokens) {
    if (candidateTokens.has(token)) {
      matches += 1;
    }
  }
  return matches / queryTokens.size;
}

export function extractSnippetsFromDocument(
  projectId: string,
  projectTitle: string,
  doc: ProjectDocument
): DomainMemorySnippet[] {
  const snippets: DomainMemorySnippet[] = [];
  const c = doc.content_json ?? {};

  if (doc.doc_type === 'erd' && c.mermaid) {
    snippets.push({
      id: `mem-${projectId}-erd`,
      sourceProjectId: projectId,
      sourceProjectTitle: projectTitle,
      category: 'erd',
      title: `ERD Schema Pattern: ${c.title || projectTitle}`,
      content: String(c.mermaid).slice(0, 800),
      score: 0,
    });
  } else if (doc.doc_type === 'tech_stack' && Array.isArray(c.stack)) {
    const summary = c.stack
      .map((s: any) => `${s.layer}: ${s.choice} (${s.reason || ''})`)
      .join('\n');
    snippets.push({
      id: `mem-${projectId}-stack`,
      sourceProjectId: projectId,
      sourceProjectTitle: projectTitle,
      category: 'tech_stack',
      title: `Verified Tech Stack: ${projectTitle}`,
      content: summary.slice(0, 600),
      score: 0,
    });
  } else if (doc.doc_type === 'brd_prd' && Array.isArray(c.userStories)) {
    const stories = c.userStories
      .slice(0, 5)
      .map((s: any) => `${s.id}: ${s.story}`)
      .join('\n');
    snippets.push({
      id: `mem-${projectId}-stories`,
      sourceProjectId: projectId,
      sourceProjectTitle: projectTitle,
      category: 'user_stories',
      title: `PRD User Stories: ${projectTitle}`,
      content: stories.slice(0, 600),
      score: 0,
    });
  }

  return snippets;
}

/**
 * Formats memory snippets into an instruction prompt addition for LLM agents.
 */
export function formatMemoryContext(snippets: DomainMemorySnippet[]): string {
  if (snippets.length === 0) return '';

  const header = `### CROSS-PROJECT DOMAIN MEMORY (Reused Architectural Patterns from past verified builds):`;
  const body = snippets
    .map(
      (s, idx) =>
        `[Pattern ${idx + 1}] From "${s.sourceProjectTitle}" (${s.category}):\n${s.content}`
    )
    .join('\n\n');

  return `${header}\n${body}\n\nNote: You may cite or reuse these proven patterns to maintain consistency across the factory.\n`;
}
