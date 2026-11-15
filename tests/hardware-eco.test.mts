import test from 'node:test';
import assert from 'node:assert/strict';
import { recordThought, recordTokenUsage, getTelemetry, resetTelemetry } from '../lib/telemetry.ts';
import { setHardwareEcoMode, isHardwareEcoModeActive } from '../lib/eco-mode.ts';

test('eco-mode correctly toggles hardware eco flag', () => {
  setHardwareEcoMode(true);
  assert.equal(isHardwareEcoModeActive(), true);

  setHardwareEcoMode(false);
  assert.equal(isHardwareEcoModeActive(), false);
});

test('telemetry store enforces sliding window and memory bounding', () => {
  const proj = `eco-test-${Date.now()}`;
  resetTelemetry(proj);

  // Add 40 thoughts (capped at last 30)
  for (let i = 0; i < 40; i++) {
    recordThought(proj, 'agent-coder', `Thought sequence ${i}`);
  }

  const telem = getTelemetry(proj);
  assert.equal(telem.thoughts.length, 30);
  assert.equal(telem.thoughts[telem.thoughts.length - 1].thought, 'Thought sequence 39');

  // Token recording
  recordTokenUsage(proj, 150, 45);
  const telem2 = getTelemetry(proj);
  assert.equal(telem2.totalTokensUsed, 150);
  assert.equal(telem2.estimatedTokensSaved, 45);

  resetTelemetry(proj);
});
