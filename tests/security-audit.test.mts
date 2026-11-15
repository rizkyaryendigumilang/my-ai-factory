import test from 'node:test';
import assert from 'node:assert/strict';
import { isSafeExternalUrl, scanProjectFiles } from '../lib/security-scanner.ts';
import { sanitizePath } from '../lib/ecc-core.ts';

test('isSafeExternalUrl blocks loopback, cloud metadata, and invalid protocols', () => {
  // Dangerous SSRF vectors
  assert.equal(isSafeExternalUrl('http://127.0.0.1:8090').safe, false);
  assert.equal(isSafeExternalUrl('http://localhost:3000').safe, false);
  assert.equal(isSafeExternalUrl('http://127.0.0.2:22').safe, false);
  assert.equal(isSafeExternalUrl('http://169.254.169.254/latest/meta-data/').safe, false);
  assert.equal(isSafeExternalUrl('file:///etc/passwd').safe, false);
  assert.equal(isSafeExternalUrl('gopher://evil.com').safe, false);
  assert.equal(isSafeExternalUrl('javascript:alert(1)').safe, false);

  // Safe external endpoints
  assert.equal(isSafeExternalUrl('https://43.156.236.102:8444').safe, true);
  assert.equal(isSafeExternalUrl('https://api.github.com/user').safe, true);
  assert.equal(isSafeExternalUrl('https://generativelanguage.googleapis.com').safe, true);
});

test('sanitizePath rejects directory traversal and absolute paths', () => {
  assert.equal(sanitizePath('../../etc/cron.d/malicious'), null);
  assert.equal(sanitizePath('../../../.ssh/authorized_keys'), null);
  assert.equal(sanitizePath('/etc/shadow'), null);
  assert.equal(sanitizePath('C:\\Windows\\System32\\cmd.exe'), null);
  assert.equal(sanitizePath('app/page.tsx'), 'app/page.tsx');
  assert.equal(sanitizePath('components/ui/Button.tsx'), 'components/ui/Button.tsx');
});

test('scanProjectFiles flags critical code patterns and hardcoded credentials', () => {
  const dangerousFiles = [
    {
      filePath: 'app/api/backdoor/route.ts',
      fileContent: `export async function GET() { eval(req.query.cmd); }`,
    },
    {
      filePath: 'lib/secret.ts',
      fileContent: `const api_key = "AIzaSyD-sampleFakeSecret123456789";`,
    },
  ];

  const report = scanProjectFiles(dangerousFiles);
  assert.equal(report.passed, false);
  assert.ok(report.criticalCount >= 2, 'Must detect at least 2 critical findings');
  assert.ok(report.findings.some((f) => f.ruleId === 'SEC-INJECTION'));
  assert.ok(report.findings.some((f) => f.ruleId === 'SEC-SECRET-LEAK'));
});

test('scanProjectFiles gives passing score on clean Next.js 15 production files', () => {
  const cleanFiles = [
    {
      filePath: 'app/page.tsx',
      fileContent: `export default function Page() { return <main><h1>Safe Application</h1></main>; }`,
    },
    {
      filePath: 'lib/db.ts',
      fileContent: `export const config = { dbHost: process.env.DB_HOST };`,
    },
  ];

  const report = scanProjectFiles(cleanFiles);
  assert.equal(report.passed, true);
  assert.equal(report.criticalCount, 0);
  assert.equal(report.highCount, 0);
  assert.equal(report.score, 100);
});
