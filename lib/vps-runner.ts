import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import type { ProjectFile } from '@/types';

export interface SandboxStatus {
  projectId: string;
  status: 'stopped' | 'starting' | 'running' | 'failed';
  port: number;
  url: string;
  logs: string[];
  pid?: number;
  startedAt?: string;
  error?: string;
}

interface RunnerInstance {
  projectId: string;
  process?: ChildProcess;
  port: number;
  status: 'stopped' | 'starting' | 'running' | 'failed';
  logs: string[];
  startedAt?: string;
  error?: string;
}

const g = globalThis as unknown as { __factorySandboxes?: Map<string, RunnerInstance> };
const runners = (g.__factorySandboxes ??= new Map<string, RunnerInstance>());
const DEFAULT_SANDBOX_PORT = 3006;

function getBaseSandboxDir(): string {
  if (process.platform === 'linux' && fs.existsSync('/srv/www')) {
    const dir = '/srv/www/sandboxes';
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        return path.join(process.cwd(), '.data', 'sandboxes');
      }
    }
    return dir;
  }
  const dir = path.join(process.cwd(), '.data', 'sandboxes');
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {}
  }
  return dir;
}

export function getProjectSandboxDir(projectId: string): string {
  const dir = path.join(getBaseSandboxDir(), projectId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Synchronizes file records from the database to disk, and links node_modules.
 */
export async function syncProjectFilesToDisk(targetDir: string, files: ProjectFile[]): Promise<number> {
  let count = 0;
  for (const f of files) {
    const fullPath = path.join(targetDir, f.file_path);
    const parent = path.dirname(fullPath);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    fs.writeFileSync(fullPath, f.file_content, 'utf-8');
    count++;
  }

  // Ensure node_modules symlink/junction exists so npm install is zero-cost
  const targetNodeModules = path.join(targetDir, 'node_modules');
  if (!fs.existsSync(targetNodeModules)) {
    const sourceNodeModules = path.join(process.cwd(), 'node_modules');
    if (fs.existsSync(sourceNodeModules)) {
      try {
        const type = process.platform === 'win32' ? 'junction' : 'dir';
        fs.symlinkSync(sourceNodeModules, targetNodeModules, type);
      } catch {
        // Continue if symlink permission not available
      }
    }
  }

  return count;
}

export function getSandboxRunnerStatus(projectId: string): SandboxStatus {
  const r = runners.get(projectId);
  const port = r?.port ?? DEFAULT_SANDBOX_PORT;
  const isVps = process.env.NEXT_PUBLIC_APP_URL?.includes('43.156.236.102') || process.platform === 'linux';
  const url = isVps ? 'https://43.156.236.102/sandbox-live/' : `http://localhost:${port}`;

  if (!r) {
    return {
      projectId,
      status: 'stopped',
      port,
      url,
      logs: [],
    };
  }

  return {
    projectId,
    status: r.status,
    port: r.port,
    url,
    logs: r.logs.slice(-50),
    pid: r.process?.pid,
    startedAt: r.startedAt,
    error: r.error,
  };
}

export async function stopSandboxRunner(projectId: string): Promise<void> {
  const r = runners.get(projectId);
  if (r?.process) {
    try {
      r.process.kill('SIGTERM');
    } catch {}
    r.status = 'stopped';
    r.logs.push('[Runner] Proses dihentikan.');
  }
}

export async function startSandboxRunner(
  projectId: string,
  files: ProjectFile[],
  port = DEFAULT_SANDBOX_PORT
): Promise<SandboxStatus> {
  // 1. Stop any currently active runner on this port
  for (const [id, active] of runners.entries()) {
    if (active.port === port && active.status !== 'stopped') {
      await stopSandboxRunner(id);
    }
  }

  const sandboxDir = getProjectSandboxDir(projectId);
  await syncProjectFilesToDisk(sandboxDir, files);

  const instance: RunnerInstance = {
    projectId,
    port,
    status: 'starting',
    logs: [
      `[Runner] Menyiapkan direktori sandbox: ${sandboxDir}`,
      `[Runner] Menghubungkan modul bersama & mem-boot Next.js dev server pada port ${port}...`,
    ],
    startedAt: new Date().toISOString(),
  };
  runners.set(projectId, instance);

  // Locate next binary
  const nextBin = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next');
  const cmd = fs.existsSync(nextBin) ? nextBin : 'npx';
  const args = fs.existsSync(nextBin) ? ['dev', '-p', String(port)] : ['next', 'dev', '-p', String(port)];

  try {
    const proc = spawn(cmd, args, {
      cwd: sandboxDir,
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'development',
      },
      shell: true,
    });

    instance.process = proc;

    proc.stdout?.on('data', (d) => {
      const text = d.toString();
      instance.logs.push(text);
      if (text.includes('Ready in') || text.includes('ready') || text.includes('Local:')) {
        instance.status = 'running';
      }
    });

    proc.stderr?.on('data', (d) => {
      const text = d.toString();
      instance.logs.push(`[stderr] ${text}`);
    });

    proc.on('exit', (code) => {
      instance.status = 'stopped';
      instance.logs.push(`[Runner] Proses berhenti (exit code: ${code})`);
    });

    proc.on('error', (err) => {
      instance.status = 'failed';
      instance.error = err.message;
      instance.logs.push(`[Runner] Error: ${err.message}`);
    });

    setTimeout(() => {
      if (instance.status === 'starting') {
        instance.status = 'running';
      }
    }, 3500);

    return getSandboxRunnerStatus(projectId);
  } catch (err: any) {
    instance.status = 'failed';
    instance.error = err?.message;
    return getSandboxRunnerStatus(projectId);
  }
}
