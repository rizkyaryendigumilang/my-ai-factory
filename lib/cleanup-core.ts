import type { Project } from '../types/index';

/**
 * 5 Hours TTL in milliseconds.
 * If generated files are not downloaded within 5 hours, they are automatically purged.
 */
export const FILE_TTL_MS = 5 * 60 * 60 * 1000; // 5 hours in ms (18,000,000 ms)

/**
 * Checks whether a project's temporary generated files have expired.
 */
export function isProjectFilesExpired(project: Project): boolean {
  if (project.files_expired) return true;
  if (project.downloaded) return false;

  // If completed, compute time from when files were ready (or updated/created)
  if (project.status === 'completed' || project.files_ready_at) {
    const readyTimeStr = project.files_ready_at || project.updated || project.created;
    const readyTime = new Date(readyTimeStr).getTime();
    if (Number.isFinite(readyTime)) {
      return Date.now() - readyTime >= FILE_TTL_MS;
    }
  }

  return false;
}

/**
 * Returns remaining milliseconds before file expiry, or 0 if expired.
 */
export function getRemainingTtlMs(project: Project): number {
  if (project.files_expired || isProjectFilesExpired(project)) return 0;
  if (project.downloaded) return Infinity;

  const readyTimeStr = project.files_ready_at || project.updated || project.created;
  const readyTime = new Date(readyTimeStr).getTime();
  if (!Number.isFinite(readyTime)) return FILE_TTL_MS;

  const elapsed = Date.now() - readyTime;
  const remaining = FILE_TTL_MS - elapsed;
  return Math.max(0, remaining);
}
