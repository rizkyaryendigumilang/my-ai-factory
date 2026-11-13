import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSystemPerformanceMetrics,
  getApiUsageMetrics,
  getEnterpriseLicense,
  getNativeModelsCatalog,
} from '../lib/metrics-core.ts';

test('getSystemPerformanceMetrics returns CPU and RAM structure matching pc-monitor.js contract', () => {
  const data = getSystemPerformanceMetrics();

  assert.ok(data.cpu, 'cpu object should exist');
  assert.equal(typeof data.cpu.percent, 'number');
  assert.ok(data.cpu.percent >= 0 && data.cpu.percent <= 100);
  assert.ok(data.cpu.threads > 0);
  assert.ok(data.cpu.freqMHz > 0);

  assert.ok(data.memory, 'memory object should exist');
  assert.equal(typeof data.memory.percent, 'number');
  assert.ok(data.memory.percent >= 0 && data.memory.percent <= 100);
  assert.ok(parseFloat(data.memory.totalGB) > 0);
  assert.ok(Array.isArray(data.gpus));
});

test('getApiUsageMetrics returns providers list matching api-usage.js contract', () => {
  const data = getApiUsageMetrics({
    ai: {
      geminiApiKey: 'AIzaSyFakeKeyForTest',
      primaryModel: 'gemini-1.5-flash',
      fallbackModels: [],
      routerUrl: '',
      routerApiKey: '',
      mockMode: false,
    },
  });

  assert.ok(Array.isArray(data.providers), 'providers array should exist');
  assert.ok(data.providers.length >= 2, 'should report at least Gemini and Hermes');

  const gemini = data.providers.find((p: any) => p.provider === 'google');
  assert.ok(gemini, 'Google provider should be present');
  assert.equal(gemini.plan, 'API Key Active');
  assert.ok(gemini.usage?.dailyPctLeft != null, 'dailyPctLeft must be provided for status bar');

  const hermes = data.providers.find((p: any) => p.provider === 'antigravity');
  assert.ok(hermes, 'Hermes provider should be present');
});

test('getEnterpriseLicense returns enterprise license and unlocks all features', () => {
  const data = getEnterpriseLicense();

  assert.equal(data.valid, true);
  assert.equal(data.demo, false);
  assert.equal(data.plan, 'enterprise');
  assert.ok(data.maxAgents >= 100);
  assert.equal(data.features.editOffice, true);
  assert.equal(data.features.agentEditor, true);
  assert.equal(data.features.customFurniture, true);
  assert.equal(data.features.unlimitedAgents, true);
});

test('getNativeModelsCatalog returns openclaw and hermes configurations', () => {
  const data = getNativeModelsCatalog({
    ai: {
      geminiApiKey: 'AIzaSyFakeKeyForTest',
      primaryModel: 'gemini-1.5-flash',
      fallbackModels: [],
      routerUrl: '',
      routerApiKey: '',
      mockMode: false,
    },
    vps: {
      hermesEndpoint: 'https://43.156.236.102:8444',
      openWebUiEndpoint: '',
      pocketbaseUrl: '',
      storeDriver: 'auto',
    },
  });

  assert.equal(data.openclaw.ok, true);
  assert.ok(Array.isArray(data.openclaw.models));
  assert.ok(data.openclaw.models.length >= 3);
  assert.ok(data.hermes.profiles.length >= 1);
  assert.equal(data.hermes.profiles[0].endpoint, 'https://43.156.236.102:8444');
  assert.equal(data.codex.enabled, true);
});
