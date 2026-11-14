import 'server-only';
import * as store from '@/lib/store';
import {
  tokenize,
  computeRelevance,
  extractSnippetsFromDocument,
  type DomainMemorySnippet,
} from './domain-memory-core';

export * from './domain-memory-core';

/**
 * Scans completed projects across the software factory to retrieve relevant
 * architectural patterns, verified schemas, and reusable models.
 */
export async function retrieveDomainMemory(
  query: string,
  excludeProjectId?: string,
  maxSnippets = 4
): Promise<DomainMemorySnippet[]> {
  const queryTokens = tokenize(query);
  const projects = await store.listProjects();
  const completedProjects = projects.filter(
    (p) => p.status === 'completed' && (!excludeProjectId || p.id !== excludeProjectId)
  );

  const candidates: DomainMemorySnippet[] = [];

  for (const proj of completedProjects.slice(0, 15)) {
    const docs = await store.listDocuments(proj.id);
    for (const doc of docs) {
      const snippets = extractSnippetsFromDocument(proj.id, proj.title, doc);
      for (const s of snippets) {
        const score = computeRelevance(queryTokens, `${s.title} ${s.content}`);
        if (score > 0.1 || queryTokens.size === 0) {
          candidates.push({ ...s, score });
        }
      }
    }
  }

  // Sort by highest relevance score
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, maxSnippets);
}
