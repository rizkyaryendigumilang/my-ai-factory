import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import PocketBase from 'pocketbase';
import { canAccessProject, getSessionUserId } from './session';
import type {
  AgentLog,
  DocType,
  Project,
  ProjectDocument,
  ProjectFile,
  ProjectState,
  ProjectVersion,
} from '../types';

/**
 * Persistence layer (deep module).
 * Primary adapter: PocketBase. Fallback adapter: local JSON file (.data/factory.json).
 */

type Row = Record<string, any> & { id: string; created: string; updated: string };
type Collection =
  | 'projects'
  | 'project_documents'
  | 'project_files'
  | 'agent_logs'
  | 'project_versions';

interface Driver {
  name: 'pocketbase' | 'file';
  list(col: Collection, where?: Record<string, string>): Promise<Row[]>;
  get(col: Collection, id: string): Promise<Row | null>;
  create(col: Collection, data: Record<string, any>): Promise<Row>;
  update(col: Collection, id: string, data: Record<string, any>): Promise<Row>;
  remove(col: Collection, id: string): Promise<void>;
}

const MAX_VERSIONS_PER_PROJECT = 10;
const now = () => new Date().toISOString();
const rid = () => Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-6);

const locks = new Map<string, Promise<unknown>>();
function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  locks.set(key, next.finally(() => { if (locks.get(key) === next) locks.delete(key); }));
  return next;
}

/* ------------------------------ file driver ------------------------------ */

const DATA_FILE = path.join(process.cwd(), '.data', 'factory.json');
type Db = Record<Collection, Row[]>;

function fileDriver(): Driver {
  let cache: Db | null = null;
  let writing = false;
  let scheduled = false;

  const load = (): Db => {
    if (cache) return cache;
    try {
      cache = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch {
      cache = { projects: [], project_documents: [], project_files: [], agent_logs: [], project_versions: [] };
    }
    return cache!;
  };

  const save = () => {
    if (writing) {
      scheduled = true;
      return;
    }
    writing = true;
    void (async () => {
      while (true) {
        scheduled = false;
        const snapshot = JSON.stringify(load());
        try {
          await fs.promises.mkdir(path.dirname(DATA_FILE), { recursive: true });
          const tmp = `${DATA_FILE}.${rid()}.tmp`;
          await fs.promises.writeFile(tmp, snapshot);
          await fs.promises.rename(tmp, DATA_FILE);
        } catch (err: any) {
          // eslint-disable-next-line no-console
          console.error('[store] Gagal menyimpan .data/factory.json:', err?.message ?? err);
        }
        if (!scheduled) break;
      }
      writing = false;
    })();
  };

  return {
    name: 'file',
    async list(col, where) {
      return load()[col].filter((r) => !where || Object.entries(where).every(([k, v]) => r[k] === v));
    },
    async get(col, id) {
      return load()[col].find((r) => r.id === id) ?? null;
    },
    async create(col, data) {
      const row: Row = { ...data, id: rid(), created: now(), updated: now() };
      load()[col].push(row);
      save();
      return row;
    },
    async update(col, id, data) {
      const row = load()[col].find((r) => r.id === id);
      if (!row) throw new Error(`${col}/${id} tidak ditemukan`);
      Object.assign(row, data, { updated: now() });
      save();
      return row;
    },
    async remove(col, id) {
      const db = load();
      db[col] = db[col].filter((r) => r.id !== id);
      if (col === 'projects') {
        for (const c of ['project_documents', 'project_files', 'agent_logs', 'project_versions'] as const) {
          db[c] = db[c].filter((r) => r.project_id !== id);
        }
      }
      save();
    },
  };
}

/* --------------------------- pocketbase driver --------------------------- */

async function pbLogin(url: string, email: string, password: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${url}/api/collections/_superusers/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    return res.ok ? ((await res.json()).token as string) : null;
  } catch {
    return null;
  }
}

function pbDriver(url: string, email: string, password: string): Driver {
  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  const ensure = async (force = false) => {
    if (force || !pb.authStore.token) {
      const token = await pbLogin(url, email, password);
      if (!token) throw new Error('Login superuser PocketBase gagal (cek PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD)');
      pb.authStore.save(token, null);
    }
  };
  const call = async <T>(fn: () => Promise<T>): Promise<T> => {
    await ensure();
    try {
      return await fn();
    } catch (e: any) {
      if (e?.status === 401 || e?.status === 403) {
        await ensure(true);
        return fn();
      }
      throw e;
    }
  };
  const toRow = (r: any): Row => ({ ...r, id: r.id, created: r.created, updated: r.updated });
  return {
    name: 'pocketbase',
    list: (col, where) =>
      call(async () => {
        const filter = where
          ? Object.entries(where)
              .map(([k, v], idx) => pb.filter(`${k} = {:v${idx}}`, { [`v${idx}`]: v }))
              .join(' && ')
          : '';
        return (await pb.collection(col).getFullList({ filter, sort: 'created', batch: 500 })).map(toRow);
      }),
    get: (col, id) =>
      call(async () => {
        try {
          return toRow(await pb.collection(col).getOne(id));
        } catch (e: any) {
          if (e?.status === 404) return null;
          throw e;
        }
      }),
    create: (col, data) => call(async () => toRow(await pb.collection(col).create(data))),
    update: (col, id, data) => call(async () => toRow(await pb.collection(col).update(id, data))),
    remove: (col, id) => call(async () => { await pb.collection(col).delete(id); }),
  };
}

const g = globalThis as unknown as { __factoryDriver?: Promise<Driver> };

function driver(): Promise<Driver> {
  g.__factoryDriver ??= (async () => {
    const pref = process.env.STORE_DRIVER ?? 'auto';
    const url = process.env.POCKETBASE_URL ?? process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090';
    const email = process.env.PB_ADMIN_EMAIL;
    const password = process.env.PB_ADMIN_PASSWORD;
    if (pref !== 'file' && email && password) {
      const d = pbDriver(url, email, password);
      const ok = pref === 'pocketbase' || (await d.list('projects').then(() => true, () => false));
      if (ok) return d;
    }
    return fileDriver();
  })();
  return g.__factoryDriver;
}

export async function storeInfo() {
  return { driver: (await driver()).name };
}

async function clearByProject(col: Collection, projectId: string) {
  const d = await driver();
  const rows = await d.list(col, { project_id: projectId });
  await Promise.all(rows.map((r) => d.remove(col, r.id)));
}

async function upsert(col: Collection, key: string, where: Record<string, string>, patch: Record<string, any>): Promise<Row> {
  return withKeyLock(key, async () => {
    const d = await driver();
    const [existing] = await d.list(col, where);
    return existing ? d.update(col, existing.id, patch) : d.create(col, { ...where, ...patch });
  });
}

/* ------------------------------- projects -------------------------------- */

const toProject = (r: Row): Project => ({
  id: r.id,
  user_id: r.user_id ?? 'local',
  title: r.title,
  raw_prompt: r.raw_prompt ?? '',
  gem_persona: r.gem_persona,
  design_ref_url: r.design_ref_url || [],
  skills: r.skills || [],
  status: r.status || 'draft',
  created: r.created,
  updated: r.updated,
  files_ready_at: r.files_ready_at,
  downloaded: !!r.downloaded,
  downloaded_at: r.downloaded_at,
  files_expired: !!r.files_expired,
  files_purged_at: r.files_purged_at,
  active_phase: r.active_phase,
  progress_done: r.progress_done,
  progress_total: r.progress_total,
  last_error: r.last_error,
  execution_mode: r.execution_mode || 'auto',
  approval_gate: r.approval_gate,
});

export async function listProjects(userId?: string): Promise<Project[]> {
  const rows = await (await driver()).list('projects');
  return rows
    .map(toProject)
    .filter((p) => !userId || canAccessProject(p, userId))
    .sort((a, b) => b.created.localeCompare(a.created));
}

export async function getProject(id: string): Promise<Project | null> {
  const row = await (await driver()).get('projects', id);
  return row ? toProject(row) : null;
}

/** Fetches a project and verifies the current session is allowed to access it. */
export async function getOwnedProject(id: string): Promise<Project | null> {
  const [project, userId] = await Promise.all([getProject(id), getSessionUserId()]);
  return project && canAccessProject(project, userId) ? project : null;
}

export async function createProject(
  input: Pick<Project, 'title' | 'raw_prompt' | 'gem_persona'> &
    Partial<Pick<Project, 'design_ref_url' | 'skills' | 'user_id'>>
): Promise<Project> {
  const row = await (await driver()).create('projects', {
    user_id: input.user_id ?? 'local',
    title: input.title,
    raw_prompt: input.raw_prompt,
    gem_persona: input.gem_persona,
    design_ref_url: input.design_ref_url ?? [],
    skills: input.skills ?? [],
    status: 'draft',
  });
  return toProject(row);
}

export async function updateProject(
  id: string,
  patch: Partial<
    Pick<
      Project,
      | 'title'
      | 'raw_prompt'
      | 'gem_persona'
      | 'design_ref_url'
      | 'skills'
      | 'status'
      | 'files_ready_at'
      | 'downloaded'
      | 'downloaded_at'
      | 'files_expired'
      | 'files_purged_at'
      | 'active_phase'
      | 'progress_done'
      | 'progress_total'
      | 'last_error'
      | 'execution_mode'
      | 'approval_gate'
    >
  >
): Promise<Project> {
  return toProject(await (await driver()).update('projects', id, patch));
}

export async function deleteProject(id: string) {
  const d = await driver();
  if (d.name === 'pocketbase') {
    await Promise.all([
      clearDocuments(id),
      clearFiles(id),
      clearLogs(id),
      clearByProject('project_versions', id),
    ]);
  }
  await d.remove('projects', id);
}

export async function countProjectsSince(sinceIso: string, userId = 'local'): Promise<number> {
  const rows = await (await driver()).list('projects', { user_id: userId });
  return rows.filter((p) => p.created >= sinceIso).length;
}

/* -------------------------- documents, files, logs ------------------------ */

const toDoc = (r: Row): ProjectDocument => ({
  id: r.id,
  project_id: r.project_id,
  doc_type: r.doc_type,
  content_json: r.content_json,
  created: r.created,
  updated: r.updated,
});

export async function listDocuments(projectId: string): Promise<ProjectDocument[]> {
  return (await (await driver()).list('project_documents', { project_id: projectId })).map(toDoc);
}

export const clearDocuments = (projectId: string) => clearByProject('project_documents', projectId);

export async function saveDocument(projectId: string, docType: DocType, content: any) {
  const row = await upsert('project_documents', `doc:${projectId}:${docType}`, { project_id: projectId, doc_type: docType }, { content_json: content });
  return toDoc(row);
}

const toFile = (r: Row): ProjectFile => ({
  id: r.id,
  project_id: r.project_id,
  file_path: r.file_path,
  file_content: r.file_content ?? '',
  created: r.created,
  updated: r.updated,
});

export async function listFiles(projectId: string): Promise<ProjectFile[]> {
  return (await (await driver()).list('project_files', { project_id: projectId }))
    .map(toFile)
    .sort((a, b) => a.file_path.localeCompare(b.file_path));
}

export async function saveFile(projectId: string, filePath: string, content: string) {
  const row = await upsert('project_files', `file:${projectId}:${filePath}`, { project_id: projectId, file_path: filePath }, { file_content: content });
  return toFile(row);
}

export async function saveFilesBatch(
  projectId: string,
  files: { path: string; content: string }[]
): Promise<number> {
  let count = 0;
  for (const f of files) {
    await upsert(
      'project_files',
      `file:${projectId}:${f.path}`,
      { project_id: projectId, file_path: f.path },
      { file_content: f.content }
    );
    count++;
  }
  return count;
}

export const clearFiles = (projectId: string) => clearByProject('project_files', projectId);

const toLog = (r: Row): AgentLog => ({
  id: r.id,
  project_id: r.project_id,
  agent: r.agent,
  action: r.action,
  status: r.status,
  message: r.message,
  timestamp: r.created,
});

export async function listLogs(projectId: string): Promise<AgentLog[]> {
  return (await (await driver()).list('agent_logs', { project_id: projectId })).map(toLog);
}

export async function addLog(projectId: string, entry: Pick<AgentLog, 'agent' | 'action' | 'status' | 'message'>) {
  try {
    await (await driver()).create('agent_logs', { project_id: projectId, ...entry });
  } catch {
    // Logging must never break an orchestration run.
  }
}

export const clearLogs = (projectId: string) => clearByProject('agent_logs', projectId);

/* -------------------------------- versions ------------------------------- */

const toVersion = (r: Row): ProjectVersion => ({
  id: r.id,
  project_id: r.project_id,
  label: r.label,
  created: r.created,
  file_count: r.snapshot?.files?.length ?? 0,
  doc_count: r.snapshot?.documents?.length ?? 0,
});

export async function listVersions(projectId: string): Promise<ProjectVersion[]> {
  return (await (await driver()).list('project_versions', { project_id: projectId }))
    .map(toVersion)
    .sort((a, b) => b.created.localeCompare(a.created));
}

export async function createVersion(projectId: string, label: string): Promise<ProjectVersion> {
  const d = await driver();
  const [files, documents] = await Promise.all([listFiles(projectId), listDocuments(projectId)]);
  const row = await d.create('project_versions', {
    project_id: projectId,
    label,
    snapshot: {
      files: files.map((f) => ({ file_path: f.file_path, file_content: f.file_content })),
      documents: documents.map((doc) => ({ doc_type: doc.doc_type, content_json: doc.content_json })),
    },
  });
  const all = (await d.list('project_versions', { project_id: projectId })).sort((a, b) =>
    b.created.localeCompare(a.created)
  );
  if (all.length > MAX_VERSIONS_PER_PROJECT) {
    await Promise.all(all.slice(MAX_VERSIONS_PER_PROJECT).map((old) => d.remove('project_versions', old.id)));
  }
  return toVersion(row);
}

export async function restoreVersion(projectId: string, versionId: string) {
  const d = await driver();
  const row = await d.get('project_versions', versionId);
  if (!row || row.project_id !== projectId) throw new Error('Versi tidak ditemukan');
  await createVersion(projectId, 'Otomatis: sebelum restore');
  await Promise.all([clearFiles(projectId), clearDocuments(projectId)]);
  await Promise.all([
    ...(row.snapshot?.files ?? []).map((f: any) => saveFile(projectId, f.file_path, f.file_content)),
    ...(row.snapshot?.documents ?? []).map((doc: any) => saveDocument(projectId, doc.doc_type, doc.content_json)),
  ]);
}

export async function prepareProjectRun(projectId: string, opts: { resume?: boolean; codegenOnly?: boolean } = {}) {
  if (!opts.resume && (await listFiles(projectId)).length) {
    await createVersion(projectId, opts.codegenOnly ? 'Otomatis: sebelum regenerasi kode' : 'Otomatis: sebelum regenerasi');
  }
  const tasks: Promise<unknown>[] = [];
  if (!opts.resume) {
    tasks.push(clearFiles(projectId));
  }
  if (!opts.codegenOnly && !opts.resume) {
    tasks.push(clearLogs(projectId), clearDocuments(projectId));
  }
  await Promise.all(tasks);
  await updateProject(projectId, {
    status: 'running',
    files_expired: false,
    downloaded: false,
    ...(opts.resume ? {} : { files_ready_at: undefined }),
  });
}

/* --------------------------------- state --------------------------------- */

export async function getProjectState(id: string): Promise<ProjectState | null> {
  const project = await getProject(id);
  if (!project) return null;
  const [documents, files, logs, versions] = await Promise.all([
    listDocuments(id),
    listFiles(id),
    listLogs(id),
    listVersions(id),
  ]);
  return { project, documents, files, logs, versions };
}

export async function getOwnedProjectState(id: string): Promise<ProjectState | null> {
  const [state, userId] = await Promise.all([getProjectState(id), getSessionUserId()]);
  return state && canAccessProject(state.project, userId) ? state : null;
}
