import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
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

export const DEFAULT_SANDBOX_PORT = 3006;
export const SANDBOX_PORT_START = 3006;
export const SANDBOX_PORT_END = 3015;

/**
 * Returns a URL for the given sandbox port based on hosting environment.
 */
export function getSandboxRunnerUrl(port: number): string {
  const isVps = process.env.NEXT_PUBLIC_APP_URL?.includes('43.156.236.102') || process.platform === 'linux';
  if (!isVps) return `http://localhost:${port}`;
  return port === DEFAULT_SANDBOX_PORT
    ? 'https://43.156.236.102/sandbox-live/'
    : `https://43.156.236.102/sandbox/${port}/`;
}

/**
 * Allocates the next available port in range 3006-3015 to allow multi-tenant live sandboxes.
 */
export function allocateSandboxPort(projectId: string): number {
  const existing = runners.get(projectId);
  if (existing && existing.port && existing.status !== 'stopped') return existing.port;

  const usedPorts = new Set(
    Array.from(runners.values())
      .filter((r) => r.status === 'running' || r.status === 'starting')
      .map((r) => r.port)
  );

  for (let p = SANDBOX_PORT_START; p <= SANDBOX_PORT_END; p++) {
    if (!usedPorts.has(p)) return p;
  }

  return DEFAULT_SANDBOX_PORT;
}

export function getBaseSandboxDir(): string {
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
export async function syncProjectFilesToDisk(
  targetDir: string,
  files: ProjectFile[],
  port: number = DEFAULT_SANDBOX_PORT
): Promise<number> {
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

  // Ensure basePath is configured for Caddy subpath reverse proxy
  const isVps = process.env.NEXT_PUBLIC_APP_URL?.includes('43.156.236.102') || process.platform === 'linux';
  if (isVps) {
    const basePath = port === DEFAULT_SANDBOX_PORT ? '/sandbox-live' : `/sandbox/${port}`;
    const nextConfigPath = path.join(targetDir, 'next.config.mjs');
    const nextConfigJsPath = path.join(targetDir, 'next.config.js');
    const nextConfigTsPath = path.join(targetDir, 'next.config.ts');

    if (!fs.existsSync(nextConfigPath) && !fs.existsSync(nextConfigJsPath) && !fs.existsSync(nextConfigTsPath)) {
      fs.writeFileSync(
        nextConfigPath,
        `/** @type {import('next').NextConfig} */\nconst nextConfig = {\n  basePath: '${basePath}',\n  reactStrictMode: false,\n};\nexport default nextConfig;\n`,
        'utf-8'
      );
    } else {
      const activePath = fs.existsSync(nextConfigPath)
        ? nextConfigPath
        : fs.existsSync(nextConfigJsPath)
        ? nextConfigJsPath
        : nextConfigTsPath;
      let content = fs.readFileSync(activePath, 'utf-8');
      if (!content.includes('basePath')) {
        content = content.replace(/(const\s+nextConfig\s*=\s*{)/, `$1\n  basePath: '${basePath}',`);
        fs.writeFileSync(activePath, content, 'utf-8');
      }
    }
  }

  return count;
}

export function getSandboxRunnerStatus(projectId: string): SandboxStatus {
  const r = runners.get(projectId);
  const port = r?.port ?? allocateSandboxPort(projectId);
  const url = getSandboxRunnerUrl(port);

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
    const pid = r.process.pid;
    try {
      r.process.kill('SIGTERM');
      // Force kill after 3 seconds if not gracefully stopped
      setTimeout(() => {
        try {
          if (pid && !r.process?.killed) {
            process.kill(pid, 'SIGKILL');
          }
        } catch {}
      }, 3000);
    } catch {}
    r.status = 'stopped';
    r.logs.push('[Runner] Proses dihentikan dengan aman.');
  }
}

export async function removeProjectSandbox(projectId: string): Promise<boolean> {
  await stopSandboxRunner(projectId);
  runners.delete(projectId);
  const dir = path.join(getBaseSandboxDir(), projectId);
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function startSandboxRunner(
  projectId: string,
  files: ProjectFile[],
  requestedPort?: number
): Promise<SandboxStatus> {
  // Pre-spawn RAM Check: if VPS free RAM < 150MB, trigger eager cleanup
  const freeMemMb = Math.round(os.freemem() / (1024 * 1024));
  if (freeMemMb < 150) {
    try {
      const { runCleanupCycle } = await import('./cleanup');
      await runCleanupCycle();
    } catch {}
  }

  // Allocate port (dynamic multi-tenant)
  const port = requestedPort ?? allocateSandboxPort(projectId);

  // If another sandbox occupies this port, stop it first
  for (const [id, active] of runners.entries()) {
    if (id !== projectId && active.port === port && active.status !== 'stopped') {
      await stopSandboxRunner(id);
    }
  }

  const sandboxDir = getProjectSandboxDir(projectId);
  await syncProjectFilesToDisk(sandboxDir, files, port);

  const instance: RunnerInstance = {
    projectId,
    port,
    status: 'starting',
    logs: [
      `[Runner] Menyiapkan direktori sandbox: ${sandboxDir}`,
      `[Runner] Alokasi port sandbox: ${port} (Batas V8 RAM: 256MB)`,
      `[Runner] Mem-boot Next.js dev server pada port ${port}...`,
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
        NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --max-old-space-size=256`.trim(),
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
