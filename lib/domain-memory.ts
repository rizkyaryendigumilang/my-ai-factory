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
 * Scans completed projects belonging to the user session to retrieve relevant
 * architectural patterns, verified schemas, and reusable models.
 * Isolates memory by userId to prevent cross-tenant leakage (ASI06 / MED-02).
 */
export async function retrieveDomainMemory(
  query: string,
  excludeProjectId?: string,
  maxSnippets = 4,
  userId?: string
): Promise<DomainMemorySnippet[]> {
  const queryTokens = tokenize(query);
  const projects = await store.listProjects(userId);
  const completedProjects = projects.filter(
    (p) => p.status === 'completed' && (!excludeProjectId || p.id !== excludeProjectId)
  );

  const candidates: DomainMemorySnippet[] = [];

  for (const proj of completedProjects.slice(0, 15)) {
    const docs = await store.listDocuments(proj.id);
    for (const doc of docs) {
      const snippets = extractSnippetsFromDocument(proj.id, proj.title, doc);
      for (const s of snippets) {
        // Sanitize snippet content: skip suspicious or injected strings
        if (/eval\(|dangerouslySetInnerHTML|ssh_key|password\s*[:=]|secret\s*[:=]/i.test(s.content)) {
          continue;
        }
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
