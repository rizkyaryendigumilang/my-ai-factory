import test from 'node:test';
import assert from 'node:assert/strict';

export interface GateState {
  currentGate: string | null;
  executionMode: 'auto' | 'step';
}

export function evaluateGateProgress(
  mode: 'auto' | 'step',
  phaseJustFinished: string
): { shouldPause: boolean; gateId: string | null; nextPhase: string } {
  if (mode !== 'step') {
    return { shouldPause: false, gateId: null, nextPhase: 'continue' };
  }

  switch (phaseJustFinished) {
    case 'agent-1-pm':
      return { shouldPause: true, gateId: 'gate_pm', nextPhase: 'agent-4-analyst' };
    case 'agent-4-analyst':
      return { shouldPause: true, gateId: 'gate_arch', nextPhase: 'tech-stack-security' };
    case 'tech-stack-security':
      return { shouldPause: true, gateId: 'gate_security', nextPhase: 'agent-coder' };
    default:
      return { shouldPause: false, gateId: null, nextPhase: 'continue' };
  }
}

test('evaluateGateProgress correctly pauses on step mode and flows on auto mode', () => {
  // Auto mode never pauses
  const autoRes = evaluateGateProgress('auto', 'agent-1-pm');
  assert.equal(autoRes.shouldPause, false);
  assert.equal(autoRes.gateId, null);

  // Step mode pauses after PM
  const pmRes = evaluateGateProgress('step', 'agent-1-pm');
  assert.equal(pmRes.shouldPause, true);
  assert.equal(pmRes.gateId, 'gate_pm');
  assert.equal(pmRes.nextPhase, 'agent-4-analyst');

  // Step mode pauses after Analyst
  const archRes = evaluateGateProgress('step', 'agent-4-analyst');
  assert.equal(archRes.shouldPause, true);
  assert.equal(archRes.gateId, 'gate_arch');
  assert.equal(archRes.nextPhase, 'tech-stack-security');

  // Step mode pauses after Security
  const secRes = evaluateGateProgress('step', 'tech-stack-security');
  assert.equal(secRes.shouldPause, true);
  assert.equal(secRes.gateId, 'gate_security');
  assert.equal(secRes.nextPhase, 'agent-coder');
});
