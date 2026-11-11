import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { syncProjectFilesToDisk, getSandboxRunnerStatus } from '../lib/vps-runner.ts';

test('syncProjectFilesToDisk creates project files and symlinks node_modules', async () => {
  const tmpDir = path.join(os.tmpdir(), 'test-sandbox-' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });

  const dummyFiles = [
    { file_path: 'package.json', file_content: '{"name":"test-app","scripts":{"dev":"next dev"}}' },
    { file_path: 'app/page.tsx', file_content: 'export default function Page(){ return <h1>Halo</h1>; }' },
    { file_path: 'app/layout.tsx', file_content: 'export default function Root({children}: any){ return <html><body>{children}</body></html>; }' },
  ];

  await syncProjectFilesToDisk(tmpDir, dummyFiles as any);

  assert.equal(fs.existsSync(path.join(tmpDir, 'package.json')), true);
  assert.equal(fs.existsSync(path.join(tmpDir, 'app', 'page.tsx')), true);
  assert.equal(fs.existsSync(path.join(tmpDir, 'app', 'layout.tsx')), true);

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('getSandboxRunnerStatus returns stopped status for unstarted project', () => {
  const status = getSandboxRunnerStatus('unstarted-project-xyz');
  assert.equal(status.status, 'stopped');
  assert.equal(status.port, 3006);
  assert.equal(Array.isArray(status.logs), true);
});
