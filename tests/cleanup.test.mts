import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { Project } from '../types/index.ts';
import {
  FILE_TTL_MS,
  isProjectFilesExpired,
  getRemainingTtlMs,
} from '../lib/cleanup-core.ts';

test('isProjectFilesExpired correctly evaluates 5-hour TTL', () => {
  const now = Date.now();
  const recentTime = new Date(now - 1000 * 60 * 30).toISOString(); // 30 mins ago
  const expiredTime = new Date(now - (FILE_TTL_MS + 1000 * 60)).toISOString(); // 5 hours 1 min ago

  const freshProject: Project = {
    id: 'p1',
    user_id: 'u1',
    title: 'Fresh App',
    raw_prompt: 'build',
    gem_persona: 'mvp-speedrunner',
    design_ref_url: [],
    skills: [],
    status: 'completed',
    created: recentTime,
    updated: recentTime,
    files_ready_at: recentTime,
    downloaded: false,
  };

  assert.equal(isProjectFilesExpired(freshProject), false);
  assert.ok(getRemainingTtlMs(freshProject) > 4 * 3600 * 1000);

  const downloadedProject: Project = {
    ...freshProject,
    id: 'p2',
    files_ready_at: expiredTime,
    downloaded: true,
    downloaded_at: new Date(now - 1000 * 60).toISOString(),
  };

  // Downloaded projects do not expire
  assert.equal(isProjectFilesExpired(downloadedProject), false);
  assert.equal(getRemainingTtlMs(downloadedProject), Infinity);

  const staleProject: Project = {
    ...freshProject,
    id: 'p3',
    files_ready_at: expiredTime,
    downloaded: false,
  };

  // Expired if > 5 hours and not downloaded
  assert.equal(isProjectFilesExpired(staleProject), true);
  assert.equal(getRemainingTtlMs(staleProject), 0);

  const explicitlyExpiredProject: Project = {
    ...freshProject,
    id: 'p4',
    files_expired: true,
  };

  assert.equal(isProjectFilesExpired(explicitlyExpiredProject), true);
});
