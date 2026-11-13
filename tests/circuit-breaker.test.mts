import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isCircuitOpen,
  recordEndpointFailure,
  recordEndpointSuccess,
  resetCircuitBreakers,
  CIRCUIT_FAILURE_THRESHOLD,
} from '../lib/circuit-breaker.ts';

test('Circuit breaker trips to OPEN after threshold failures and resets on success', () => {
  resetCircuitBreakers();
  const testEndpoint = 'https://fake-hermes-test:8444/v1/chat/completions';

  assert.equal(isCircuitOpen(testEndpoint), false);

  // Record 2 failures -> should still be CLOSED
  recordEndpointFailure(testEndpoint);
  recordEndpointFailure(testEndpoint);
  assert.equal(isCircuitOpen(testEndpoint), false);

  // Record 3rd failure -> trips to OPEN
  recordEndpointFailure(testEndpoint);
  assert.equal(isCircuitOpen(testEndpoint), true);

  // Reset/success resets the circuit to CLOSED
  recordEndpointSuccess(testEndpoint);
  assert.equal(isCircuitOpen(testEndpoint), false);
});
