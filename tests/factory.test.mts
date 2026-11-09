import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessProject,
  compressContext,
  exportFilename,
  pool,
  sanitizePath,
  slug,
  stripFences,
  validateFile,
} from '../lib/ecc-core.ts';
import { diagramToDrawio, isDiagramDoc } from '../lib/drawio.ts';
import { allowedSkills } from '../lib/skills.ts';
import { officeActivity, roleStatuses } from '../lib/activity.ts';

test('sanitizePath blocks traversal, absolute paths, and normalises slashes', () => {
  assert.equal(sanitizePath('./app/page.tsx'), 'app/page.tsx');
  assert.equal(sanitizePath('src\\components\\Navbar.tsx'), 'src/components/Navbar.tsx');
  assert.equal(sanitizePath('../secrets.env'), null);
  assert.equal(sanitizePath('app/../../etc/passwd'), null);
  assert.equal(sanitizePath('/etc/passwd'), null);
  assert.equal(sanitizePath('C:\\Windows\\win.ini'), null);
  assert.equal(sanitizePath('a//b.ts'), null);
  assert.equal(sanitizePath(''), null);
});

test('compressContext enforces character budget and includes stories, entities, and skills', () => {
  const ctx = compressContext(
    {
      title: 'Kasir Warung',
      rawPrompt: 'x'.repeat(5000),
      personaDirective: 'Ship fast.',
      prd: { userStories: [{ story: 'Catat transaksi' }] },
      erd: { nodes: [{ id: 'ORDER', label: 'ORDER' }] },
      techStack: { stack: [{ layer: 'DB', choice: 'PocketBase' }] },
      skillDirectives: ['Add auth'],
    },
    600
  );
  assert.ok(ctx.length <= 600);
  assert.match(ctx, /PROJECT: Kasir Warung/);
});

test('stripFences and validateFile catch malformed JSON', () => {
  assert.equal(stripFences('```tsx\nconst x = 1;\n```'), 'const x = 1;');
  assert.equal(validateFile('package.json', '{"name":"ok"}'), null);
  assert.equal(validateFile('package.json', '{bad'), 'JSON tidak valid');
  assert.equal(validateFile('app/page.tsx', '   '), 'kosong');
});

test('diagramToDrawio handles cyclic graphs and escapes XML attributes', () => {
  const doc = {
    title: 'A & B <Test>',
    mermaid: 'flowchart LR\n  A --> B\n  B --> A',
    nodes: [
      { id: 'A', label: 'Service "A" & <Co>', group: 'core' },
      { id: 'B', label: 'Service B', group: 'core' },
    ],
    edges: [
      { from: 'A', to: 'B', label: 'calls' },
      { from: 'B', to: 'A', label: 'callback' },
      { from: 'B', to: 'GHOST', label: 'ignored' },
    ],
  };
  assert.equal(isDiagramDoc(doc), true);
  const xml = diagramToDrawio(doc, doc.title);
  assert.match(xml, /<mxfile host="my-ai-factory"/);
  assert.match(xml, /Service &quot;A&quot; &amp; &lt;Co&gt;/);
  assert.doesNotMatch(xml, /GHOST/);
});

test('allowedSkills filters Pro skills on free plan and unlocks on pro plan', () => {
  assert.deepEqual(allowedSkills(['security-hardening', 'testing'], 'free'), ['testing']);
  assert.deepEqual(allowedSkills(['security-hardening', 'testing'], 'pro'), [
    'security-hardening',
    'testing',
  ]);
});

test('officeActivity marks running agent as typing and recent handoff as discussing', () => {
  const now = Date.now();
  const logs = [
    {
      id: '1',
      project_id: 'p1',
      agent: 'agent-5-ux' as const,
      action: 'run',
      status: 'completed' as const,
      message: 'ok',
      timestamp: new Date(now - 3000).toISOString(),
    },
    {
      id: '2',
      project_id: 'p1',
      agent: 'intelligence-risk' as const,
      action: 'run',
      status: 'running' as const,
      message: 'working',
      timestamp: new Date(now - 2000).toISOString(),
    },
  ];
  const st = roleStatuses(logs);
  assert.equal(st['agent-5-ux'], 'completed');
  assert.equal(st['intelligence-risk'], 'running');
  const act = officeActivity(logs, now);
  assert.equal(act['agent-5-ux'], 'discussing');
  assert.equal(act['intelligence-risk'], 'discussing');
});

test('pool preserves order with bounded concurrency', async () => {
  const out = await pool([10, 20, 30, 40], 2, async (n) => n * 2);
  assert.deepEqual(out, [20, 40, 60, 80]);
});

test('slug and exportFilename produce safe, clean zip filenames', () => {
  assert.equal(slug('Aplikasi Kasir & Stok Warung #1'), 'aplikasi-kasir-stok-warung-1');
  assert.equal(slug('---hello_world---'), 'hello-world');
  assert.equal(slug('!!!'), 'project');
  assert.equal(exportFilename('Sistem Antrean'), 'sistem-antrean.zip');
  assert.equal(exportFilename(''), 'project.zip');
});

test('canAccessProject isolates user sessions while honoring legacy local projects', () => {
  assert.equal(canAccessProject({ user_id: 'user_123' }, 'user_123'), true);
  assert.equal(canAccessProject({ user_id: 'user_123' }, 'user_456'), false);
  assert.equal(canAccessProject({ user_id: 'local' }, 'user_456'), true);
  assert.equal(canAccessProject({}, 'user_789'), true);
});
