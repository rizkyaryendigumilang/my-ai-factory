import fs from 'node:fs';
import path from 'node:path';
import * as store from '@/lib/store';
import { getBaseSandboxDir, removeProjectSandbox } from '@/lib/vps-runner';
import { FILE_TTL_MS, isProjectFilesExpired } from './cleanup-core';

export * from './cleanup-core';

/**
 * Purges the generated files for a specific project from the VPS:
 * 1. Stops any running sandbox process and wipes the /sandboxes/<id> folder
 * 2. Clears all project_files from the database
 * 3. Marks project with files_expired: true
 * 4. Adds an audit log
 */
export async function purgeProjectGeneratedFiles(projectId: string): Promise<boolean> {
  try {
    // 1. Remove disk sandbox & stop runner
    await removeProjectSandbox(projectId);

    // 2. Clear generated files from store
    await store.clearFiles(projectId);

    // 3. Mark project as expired
    await store.updateProject(projectId, {
      files_expired: true,
      files_purged_at: new Date().toISOString(),
    });

    // 4. Log the automatic cleanup
    await store.addLog(projectId, {
      agent: 'system',
      action: 'cleanup',
      status: 'completed',
      message: 'File temporary proyek otomatis dihapus dari VPS karena batas 5 jam terlampaui tanpa diunduh.',
    });

    return true;
  } catch (err: any) {
    console.error(`[Cleanup] Gagal membersihkan file proyek ${projectId}:`, err);
    return false;
  }
}

/**
 * Scans all projects and removes expired temporary files, as well as orphaned sandbox folders.
 */
export async function runCleanupCycle(): Promise<{
  purgedProjects: string[];
  purgedOrphanDirs: string[];
}> {
  const purgedProjects: string[] = [];
  const purgedOrphanDirs: string[] = [];

  try {
    const projects = await store.listProjects();

    for (const project of projects) {
      if (isProjectFilesExpired(project) && !project.files_expired) {
        const ok = await purgeProjectGeneratedFiles(project.id);
        if (ok) purgedProjects.push(project.id);
      }
    }

    // Disk sweep: purge any sandbox directories older than 5 hours that have no active project
    const baseDir = getBaseSandboxDir();
    if (fs.existsSync(baseDir)) {
      const entries = fs.readdirSync(baseDir, { withFileTypes: true });
      const now = Date.now();

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const folderPath = path.join(baseDir, entry.name);
          try {
            const stat = fs.statSync(folderPath);
            const ageMs = now - stat.mtimeMs;
            if (ageMs >= FILE_TTL_MS) {
              const matchedProj = projects.find((p) => p.id === entry.name);
              // If project doesn't exist, is expired, or was already downloaded
              if (!matchedProj || matchedProj.files_expired || matchedProj.downloaded) {
                fs.rmSync(folderPath, { recursive: true, force: true });
                purgedOrphanDirs.push(entry.name);
              }
            }
          } catch {}
        }
      }
    }
  } catch (err: any) {
    console.error('[Cleanup] Error saat menjalankan siklus pembersihan:', err);
  }

  return { purgedProjects, purgedOrphanDirs };
}

/**
 * Automatically initializes the background cleanup scheduler.
 * Runs every 15 minutes.
 */
export function initCleanupScheduler(): void {
  const g = globalThis as any;
  if (g.__factoryCleanupSchedulerActive) return;
  g.__factoryCleanupSchedulerActive = true;

  // Run initial scan after 5 seconds
  setTimeout(() => {
    void runCleanupCycle();
  }, 5000);

  // Repeat every 15 minutes
  setInterval(() => {
    void runCleanupCycle();
  }, 15 * 60 * 1000);
}

// Auto-start scheduler when this module is imported on the server
if (typeof window === 'undefined') {
  initCleanupScheduler();
}
