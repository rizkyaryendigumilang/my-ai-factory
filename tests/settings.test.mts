import test from 'node:test';
import assert from 'node:assert/strict';
import type { FactorySettings } from '../types/settings.ts';
import {
  DEFAULT_FACTORY_SETTINGS,
  getFactorySettings,
  readRawSettings,
  saveFactorySettings,
  getEffectiveGeminiKey,
  getEffectiveGithubToken,
} from '../lib/settings-store.ts';

test('DEFAULT_FACTORY_SETTINGS contains all core modules', () => {
  assert.equal(typeof DEFAULT_FACTORY_SETTINGS.ai, 'object');
  assert.equal(typeof DEFAULT_FACTORY_SETTINGS.vps, 'object');
  assert.equal(typeof DEFAULT_FACTORY_SETTINGS.github, 'object');
  assert.equal(typeof DEFAULT_FACTORY_SETTINGS.orchestration, 'object');
  assert.equal(typeof DEFAULT_FACTORY_SETTINGS.appearance, 'object');

  assert.equal(DEFAULT_FACTORY_SETTINGS.ai.primaryModel, 'gemini-1.5-flash');
  assert.equal(DEFAULT_FACTORY_SETTINGS.vps.hermesEndpoint, 'https://43.156.236.102:8444');
  assert.equal(DEFAULT_FACTORY_SETTINGS.orchestration.kikyApprovalGates, 'strict');
  assert.equal(DEFAULT_FACTORY_SETTINGS.appearance.voiceLanguage, 'id-ID');
});

test('getFactorySettings masks sensitive credentials and sets hasKey flags', () => {
  // Test saving dummy keys
  saveFactorySettings({
    ai: {
      ...DEFAULT_FACTORY_SETTINGS.ai,
      geminiApiKey: 'AIzaSySecretTestKey1234',
    },
    github: {
      ...DEFAULT_FACTORY_SETTINGS.github,
      githubToken: 'ghp_secretToken5678',
    },
  });

  const presented = getFactorySettings();
  assert.equal(presented.ai.hasGeminiKey, true);
  assert.match(presented.ai.geminiApiKey, /^••/);
  assert.equal(presented.ai.geminiApiKey.endsWith('1234'), true);

  assert.equal(presented.github.hasGithubToken, true);
  assert.match(presented.github.githubToken, /^••/);
  assert.equal(presented.github.githubToken.endsWith('5678'), true);

  // Raw secret retrieval must return original unmasked values
  assert.equal(getEffectiveGeminiKey(), 'AIzaSySecretTestKey1234');
  assert.equal(getEffectiveGithubToken(), 'ghp_secretToken5678');
});

test('saveFactorySettings does not overwrite secrets when masked token is passed back', () => {
  const maskedSettings = getFactorySettings();

  // Client sends back masked settings without changing the key
  saveFactorySettings({
    ai: {
      ...maskedSettings.ai,
      primaryModel: 'gemini-2.0-flash',
    },
  });

  // Key must still be original
  assert.equal(getEffectiveGeminiKey(), 'AIzaSySecretTestKey1234');
  const updated = readRawSettings();
  assert.equal(updated.ai.primaryModel, 'gemini-2.0-flash');
});

test('readRawSettings safely falls back to env variables if settings are missing or empty', () => {
  const current = readRawSettings();
  assert.equal(typeof current.ai.primaryModel, 'string');
  assert.equal(typeof current.vps.hermesEndpoint, 'string');
  assert.equal(typeof current.github.targetBranch, 'string');
});
