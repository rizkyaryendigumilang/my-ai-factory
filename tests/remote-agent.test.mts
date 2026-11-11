import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJsonFromText } from '../lib/json-extract.ts';

test('extractJsonFromText parses plain valid JSON object', () => {
  const input = '{"title": "Test PRD", "count": 5}';
  const res = extractJsonFromText<{ title: string; count: number }>(input);
  assert.equal(res.title, 'Test PRD');
  assert.equal(res.count, 5);
});

test('extractJsonFromText extracts JSON from markdown fences', () => {
  const input = 'Tentu, ini hasil perancangan sistem:\n```json\n{\n  "title": "Fenced System",\n  "ok": true\n}\n```\nSemoga membantu!';
  const res = extractJsonFromText<{ title: string; ok: boolean }>(input);
  assert.equal(res.title, 'Fenced System');
  assert.equal(res.ok, true);
});

test('extractJsonFromText extracts JSON array', () => {
  const input = '```\n[\n  {"path": "package.json", "purpose": "deps"},\n  {"path": "app/page.tsx", "purpose": "home"}\n]\n```';
  const res = extractJsonFromText<Array<{ path: string; purpose: string }>>(input);
  assert.equal(res.length, 2);
  assert.equal(res[0].path, 'package.json');
  assert.equal(res[1].purpose, 'home');
});

test('extractJsonFromText handles conversational preamble without fences', () => {
  const input = 'Berikut objek yang diminta: {"success": true, "items": [1, 2, 3]} - silakan dicek.';
  const res = extractJsonFromText<{ success: boolean; items: number[] }>(input);
  assert.equal(res.success, true);
  assert.deepEqual(res.items, [1, 2, 3]);
});

test('extractJsonFromText throws descriptive error on completely invalid string', () => {
  assert.throws(() => {
    extractJsonFromText('Maaf, saya tidak bisa membuat JSON saat ini.');
  }, /Gagal mengekstrak JSON/);
});
