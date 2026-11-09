#!/usr/bin/env node
/**
 * Creates the PocketBase collections used by My AI Factory (idempotent).
 *
 *   node scripts/setup-pocketbase.mjs
 *
 * Reads POCKETBASE_URL (or NEXT_PUBLIC_POCKETBASE_URL), PB_ADMIN_EMAIL and
 * PB_ADMIN_PASSWORD from the environment / .env.local. The superuser must already
 * exist, e.g.:  ./pocketbase superuser upsert you@example.com 'a-strong-password'
 *
 * Collections get NULL API rules (superuser-only): only the Next.js server, which
 * authenticates as superuser, can read or write them.
 */
try { process.loadEnvFile('.env.local'); } catch {}

const url = (process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090').replace(/\/$/, '');
const email = process.env.PB_ADMIN_EMAIL;
const password = process.env.PB_ADMIN_PASSWORD;
if (!email || !password) {
  console.error('Set PB_ADMIN_EMAIL and PB_ADMIN_PASSWORD (in .env.local or the environment).');
  process.exit(1);
}

async function req(path, init = {}, token) {
  const res = await fetch(url + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} -> ${res.status} ${JSON.stringify(body)}`);
  return body;
}

const { token } = await req('/api/collections/_superusers/auth-with-password', {
  method: 'POST',
  body: JSON.stringify({ identity: email, password }),
});

const dates = [
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
];
const rules = { listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null };
const select = (name, values) => ({ name, type: 'select', values, maxSelect: 1 });
const text = (name, max = 0, required = false) => ({ name, type: 'text', max, required });
const json = (name, maxSize = 20_000_000) => ({ name, type: 'json', maxSize });

const existing = await req('/api/collections?perPage=200', {}, token);
const byName = Object.fromEntries(existing.items.map((c) => [c.name, c]));

async function ensure(name, fields, indexes = []) {
  if (byName[name]) {
    console.log(`= ${name} already exists`);
    return byName[name];
  }
  const created = await req('/api/collections', { method: 'POST', body: JSON.stringify({ name, type: 'base', ...rules, fields: [...fields, ...dates], indexes }) }, token);
  console.log(`+ ${name} created`);
  return (byName[name] = created);
}

const projects = await ensure('projects', [
  text('user_id'),
  text('title', 300, true),
  text('raw_prompt', 20000),
  select('gem_persona', ['mvp-speedrunner', 'security-architect', 'fullstack-engineer', 'product-designer']),
  json('design_ref_url'),
  json('skills', 100_000),
  select('status', ['draft', 'running', 'completed', 'failed']),
]);

const rel = { name: 'project_id', type: 'relation', collectionId: projects.id, cascadeDelete: true, maxSelect: 1, required: true };

await ensure(
  'project_documents',
  [
    rel,
    select('doc_type', ['brd_prd', 'erd', 'dfd', 'uml', 'tech_stack', 'qa_plan', 'architecture', 'design_tokens', 'risk_analysis']),
    json('content_json'),
  ],
  ['CREATE UNIQUE INDEX idx_project_documents_unique ON project_documents (project_id, doc_type)']
);
await ensure(
  'project_files',
  [rel, text('file_path', 300, true), text('file_content', 5_000_000)],
  ['CREATE UNIQUE INDEX idx_project_files_unique ON project_files (project_id, file_path)']
);
await ensure('agent_logs', [rel, text('agent', 100), text('action', 100), select('status', ['pending', 'running', 'completed', 'failed']), text('message', 20000)]);
await ensure('project_versions', [rel, text('label', 300), json('snapshot', 50_000_000)]);

console.log('Done.');
