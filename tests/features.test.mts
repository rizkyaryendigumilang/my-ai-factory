import test from 'node:test';
import assert from 'node:assert/strict';
import { isRemoteDivision, DEFAULT_DIVISIONS } from '../lib/division-types.ts';

test('isRemoteDivision identifies remote VPS configurations', () => {
  assert.equal(isRemoteDivision(DEFAULT_DIVISIONS['agent-1-pm']), true); // Hermes VPS
  assert.equal(isRemoteDivision(DEFAULT_DIVISIONS['agent-5-ux']), false); // Native
  assert.equal(isRemoteDivision(undefined), false);

  const customConfig = {
    ...DEFAULT_DIVISIONS['agent-coder'],
    source: 'router9-vps' as const,
  };
  assert.equal(isRemoteDivision(customConfig), true);
});
