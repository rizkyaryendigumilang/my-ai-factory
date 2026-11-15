import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBrdPrd, normalizeDiagram, cleanMermaidSource } from '../lib/doc-normalizer.ts';
import { isDiagramDoc } from '../lib/drawio.ts';
import { mockDiagrams, mockPrd } from '../lib/mock.ts';

test('normalizeBrdPrd synthesizes comprehensive BRD and PRD if AI returns sparse data', () => {
  const project = {
    title: 'Sistem Rekam Medis Klinik',
    raw_prompt: 'Aplikasi klinik dengan antrean pasien, dokter, dan rekam medis terenkripsi.',
    gem_persona: 'speedrunner' as const,
  };

  const normalized = normalizeBrdPrd(project, { prd: 'PRD text only' });
  assert.ok(normalized.brd.length > 200, 'BRD must be populated');
  assert.ok(normalized.brd.includes('Business Requirements Document'), 'BRD title present');
  assert.ok(normalized.prd.length > 50, 'PRD present');
  assert.ok(normalized.userStories.length >= 3, 'User stories present');
});

test('normalizeBrdPrd extracts alternate casing and semantic keys', () => {
  const project = {
    title: 'POS Kasir',
    raw_prompt: 'Kasir warung',
    gem_persona: 'speedrunner' as const,
  };

  const raw = {
    businessRequirements: '# Custom BRD Text From AI',
    productSpec: '# Custom PRD Text From AI',
    user_stories: [{ id: 'US-99', story: 'Story text', acceptance_criteria: ['Given X, When Y, Then Z'] }],
  };

  const normalized = normalizeBrdPrd(project, raw);
  assert.equal(normalized.brd, '# Custom BRD Text From AI');
  assert.equal(normalized.prd, '# Custom PRD Text From AI');
  assert.equal(normalized.userStories[0].id, 'US-99');
});

test('cleanMermaidSource removes outer fences and sanitizes entities', () => {
  const rawMermaid = '```mermaid\nerDiagram\n  TRANSACTION ITEMS ||--o{ PRODUCTS : contains\n```';
  const cleaned = cleanMermaidSource(rawMermaid, 'erd');
  assert.ok(!cleaned.includes('```'), 'Fences stripped');
  assert.ok(cleaned.startsWith('erDiagram'), 'erDiagram header ensured');
});

test('mockDiagrams dynamically extracts domain entities for clinic projects', () => {
  const diagrams = mockDiagrams(
    'Sistem Antrean & Rekam Medis Klinik',
    'Aplikasi klinik pratama dengan antrean pasien, jadwal dokter, dan resep obat.'
  );

  // ERD must reflect clinic domain, NOT generic USER/PROJECT/ITEM
  assert.ok(!diagrams.erd.mermaid.includes('USER ||--o{ PROJECT'), 'Must not contain generic USER/PROJECT/ITEM');
  assert.ok(diagrams.erd.mermaid.includes('PASIEN') || diagrams.erd.mermaid.includes('DOKTER'), 'Contains clinic entities');
  assert.ok(diagrams.erd.nodes.some((n) => n.id === 'PASIEN' || n.id === 'DOKTER'));
});

test('mockDiagrams dynamically extracts domain entities for POS kasir projects', () => {
  const diagrams = mockDiagrams(
    'Aplikasi Kasir Warung Pintar',
    'Kasir toko retail dengan stok barang dan nota belanja.'
  );

  assert.ok(diagrams.erd.mermaid.includes('PRODUCTS') || diagrams.erd.mermaid.includes('TRANSACTIONS'));
  assert.ok(diagrams.erd.nodes.some((n) => n.id === 'PRODUCTS' || n.id === 'TRANSACTIONS' || n.id === 'PRODUK'));
});

test('isDiagramDoc identifies diagram documents even when nodes array was omitted', () => {
  assert.equal(isDiagramDoc({ title: 'ERD', mermaid: 'erDiagram\n USER ||--o{ ORDER : places' }), true);
  assert.equal(isDiagramDoc({ title: 'UML', mermaid: 'classDiagram' }), true);
  assert.equal(isDiagramDoc({ title: 'PRD', prd: 'text' }), false);
});
