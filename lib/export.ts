import 'server-only';
import JSZip from 'jszip';
import { diagramToDrawio, isDiagramDoc } from './drawio';
import { exportFilename, slug } from './ecc-core';
import type { ProjectDocument, ProjectFile } from '@/types';

export { exportFilename, slug };

const list = (items: any[], fn: (x: any) => string) => items.map(fn).join('\n');

/** Human-readable markdown for non-diagram documents. */
export function docToMarkdown(doc: ProjectDocument): string {
  const c = doc.content_json ?? {};
  switch (doc.doc_type) {
    case 'brd_prd':
      return `${c.brd ?? ''}\n\n${c.prd ?? ''}\n\n## User Stories\n\n${list(c.userStories ?? [], (s) => `### ${s.id ?? ''} ${s.story ?? s}\n${list(s.acceptanceCriteria ?? [], (a) => `- [ ] ${a}`)}\n`)}`;
    case 'tech_stack':
      return `# Tech Stack & Security\n\n${list(c.stack ?? [], (s) => `- **${s.layer}**: ${s.choice} — ${s.reason}`)}\n\n## OWASP rules\n\n${list(c.securityRules ?? [], (r) => `- **${r.owasp}**: ${r.rule}`)}\n`;
    case 'qa_plan':
      return `# QA Plan\n\n${c.strategy ?? ''}\n\n${list(c.testCases ?? [], (t) => `## ${t.id} ${t.title}\n${list(t.steps ?? [], (s) => `1. ${s}`)}\n\n**Expected:** ${t.expected}\n`)}`;
    case 'risk_analysis':
      return `# Risk & Cost Analysis\n\n${list(c.risks ?? [], (r) => `- **[${r.severity}] ${r.title}** — ${r.description} _Mitigation: ${r.mitigation}_`)}\n\n## Bottlenecks\n${list(c.bottlenecks ?? [], (b) => `- ${b}`)}\n\n## Monthly cost (${c.costEstimate?.currency ?? 'USD'})\n${list(c.costEstimate?.tiers ?? [], (t) => `- ${t.name}: ${t.monthlyUsd}`)}\n\n${c.costEstimate?.notes ?? ''}\n`;
    case 'design_tokens':
      return `# Design Tokens\n\n\`\`\`json\n${JSON.stringify(c, null, 2)}\n\`\`\`\n`;
    default:
      return `\`\`\`json\n${JSON.stringify(c, null, 2)}\n\`\`\`\n`;
  }
}

export async function buildZip(title: string, files: ProjectFile[], documents: ProjectDocument[]) {
  const root = slug(title);
  const zip = new JSZip();
  const dir = zip.folder(root)!;

  for (const f of files) dir.file(f.file_path, f.file_content);

  const docs = dir.folder('docs')!;
  for (const d of documents) {
    if (isDiagramDoc(d.content_json)) {
      docs.file(`${d.doc_type}.drawio`, diagramToDrawio(d.content_json, d.content_json.title || d.doc_type));
      docs.file(`${d.doc_type}.mmd`, d.content_json.mermaid);
    } else {
      docs.file(`${d.doc_type}.md`, docToMarkdown(d));
    }
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
