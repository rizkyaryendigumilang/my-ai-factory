import test from 'node:test';
import assert from 'node:assert/strict';
import { compressPrompt, packTokenEfficientContext } from '../lib/token-compressor.ts';
import { recordThought, recordTokenUsage, getTelemetry, resetTelemetry } from '../lib/telemetry.ts';
import { scanProjectFiles } from '../lib/security-scanner.ts';
import { generateLaunchKit } from '../lib/marketing-kit.ts';
import { formatMemoryContext, type DomainMemorySnippet } from '../lib/domain-memory-core.ts';

test('token-compressor strips conversational fluff and calculates savings', () => {
  const verbosePrompt = `Sure, I would be happy to help with that! Here is the requested software architecture.
As an AI language model, based on your requirements:
Create a Kanban Board with PocketBase auth.

Let me know if you have any questions!`;

  const result = compressPrompt(verbosePrompt);
  assert.ok(result.compressedChars < result.originalChars);
  assert.ok(result.estimatedTokensSaved > 0);
  assert.ok(result.reductionPercentage > 20);
  assert.ok(!result.compressedText.includes('Sure, I would be happy'));
  assert.ok(result.compressedText.includes('Kanban Board with PocketBase auth.'));
});

test('packTokenEfficientContext enforces character budget and packages artifacts', () => {
  const packed = packTokenEfficientContext(
    {
      projectTitle: 'Smart Task Manager',
      rawPrompt: 'Realtime collaborative task manager with Kanban and Gantt views',
      gemPersona: 'mvp-speedrunner',
      prdSummary: 'Core MVP focusing on kanban columns and cards',
      erdEntities: ['users', 'boards', 'tasks', 'comments'],
      techStack: ['Next.js 15', 'Tailwind', 'PocketBase'],
      userStories: [
        'As a user I want to drag cards between columns',
        'As a user I want to assign team members',
      ],
    },
    500
  );

  assert.ok(packed.compressedText.includes('P:Smart Task Manager'));
  assert.ok(packed.compressedText.includes('ENTITIES:users,boards,tasks,comments'));
  assert.ok(packed.compressedText.length <= 500);
});

test('telemetry records thoughts and calculates live token burn rate', () => {
  const testId = 'test-proj-telemetry-123';
  resetTelemetry(testId);

  const th1 = recordThought(testId, 'agent-1-pm', 'Analyzing user requirements for MVP scope');
  assert.equal(th1.agent, 'agent-1-pm');
  assert.ok(th1.id.startsWith('th-'));

  recordTokenUsage(testId, 300, 100, 'agent-1-pm', 'Spec definition');
  recordTokenUsage(testId, 200, 60, 'agent-5-ux', 'Token extraction');

  const state = getTelemetry(testId);
  assert.equal(state.projectId, testId);
  assert.equal(state.totalTokensUsed, 500);
  assert.equal(state.estimatedTokensSaved, 160);
  assert.equal(state.thoughts.length, 1);
  assert.ok(state.burnRate >= 0);

  resetTelemetry(testId);
});

test('security-scanner flags exposed credentials and dangerous code patterns', () => {
  const vulnerableFiles = [
    {
      filePath: 'lib/db.ts',
      fileContent: `export const DB_URI = "postgres://admin:SuperSecretPass123!@localhost:5432/mydb";`,
    },
    {
      filePath: 'components/UnsafeViewer.tsx',
      fileContent: `export default function UnsafeViewer({ raw }: { raw: string }) {
  return <div dangerouslySetInnerHTML={{ __html: raw }} />;
}`,
    },
    {
      filePath: 'components/SafeButton.tsx',
      fileContent: `export function SafeButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <button onClick={onClick} className="px-3 py-1.5 rounded">{label}</button>;
}`,
    },
  ];

  const report = scanProjectFiles(vulnerableFiles);
  assert.equal(report.passed, false);
  assert.ok(report.criticalCount > 0);
  assert.ok(report.highCount > 0);
  assert.ok(report.score < 100);
  assert.equal(report.scannedFilesCount, 3);

  const dbFinding = report.findings.find((f) => f.filePath === 'lib/db.ts');
  assert.ok(dbFinding);
  assert.equal(dbFinding.category, 'secrets');
});

test('security-scanner gives clean score on safe production files', () => {
  const cleanFiles = [
    {
      filePath: 'app/page.tsx',
      fileContent: `import React from 'react';
export default function Page() {
  return <main className="p-4"><h1>Hello Production</h1></main>;
}`,
    },
    {
      filePath: 'lib/env.ts',
      fileContent: `export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.example.com';`,
    },
  ];

  const report = scanProjectFiles(cleanFiles);
  assert.equal(report.passed, true);
  assert.equal(report.criticalCount, 0);
  assert.equal(report.highCount, 0);
  assert.equal(report.score, 100);
});

test('marketing-kit generates comprehensive launch assets', () => {
  const project: any = {
    title: 'FlowDesk Kanban',
    raw_prompt: 'Lightweight collaborative kanban for agile micro-agencies',
    gem_persona: 'mvp-speedrunner',
  };

  const stack = {
    stack: [
      { layer: 'Frontend', choice: 'Next.js 15' },
      { layer: 'Backend', choice: 'PocketBase' },
    ],
  };

  const prd = {
    userStories: [
      { id: 'US-1', story: 'Create custom boards' },
      { id: 'US-2', story: 'Invite collaborators' },
    ],
  };

  const kit = generateLaunchKit(project, prd, stack);
  assert.equal(kit.projectTitle, 'FlowDesk Kanban');
  assert.ok(kit.productHunt.tagline.length > 5);
  assert.ok(kit.productHunt.firstComment.includes('FlowDesk Kanban'));
  assert.ok(kit.social.twitterThread.length >= 4);
  assert.ok(kit.social.linkedInPost.includes('#ProductLaunch'));
  assert.ok(kit.technical.githubReleaseNotes.includes('Release v1.0.0'));
  assert.ok(kit.technical.seoMetaTags.includes('<title>FlowDesk Kanban'));
  assert.ok(kit.technical.jsonLdSchema.includes('SoftwareApplication'));
});

test('formatMemoryContext constructs clear prompt addition from memory snippets', () => {
  const snippets: DomainMemorySnippet[] = [
    {
      id: 'mem-1',
      sourceProjectId: 'proj-1',
      sourceProjectTitle: 'E-Commerce Store',
      category: 'erd',
      title: 'Cart & Orders Schema',
      content: 'erDiagram\nUSERS ||--o{ ORDERS : places',
      score: 0.85,
    },
  ];

  const formatted = formatMemoryContext(snippets);
  assert.ok(formatted.includes('CROSS-PROJECT DOMAIN MEMORY'));
  assert.ok(formatted.includes('E-Commerce Store'));
  assert.ok(formatted.includes('erDiagram'));
});
