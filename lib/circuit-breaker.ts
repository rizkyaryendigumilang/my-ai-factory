export interface EndpointCircuitBreaker {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const breakers = new Map<string, EndpointCircuitBreaker>();
export const CIRCUIT_FAILURE_THRESHOLD = 3;
export const CIRCUIT_COOLDOWN_MS = 30_000;

export function isCircuitOpen(endpoint: string): boolean {
  const breaker = breakers.get(endpoint);
  if (!breaker || !breaker.isOpen) return false;
  if (Date.now() - breaker.lastFailureTime > CIRCUIT_COOLDOWN_MS) {
    // Cooldown elapsed -> half open (test next call)
    breaker.isOpen = false;
    breaker.failures = 0;
    return false;
  }
  return true;
}

export function recordEndpointSuccess(endpoint: string) {
  breakers.delete(endpoint);
}

export function recordEndpointFailure(endpoint: string) {
  const now = Date.now();
  const breaker = breakers.get(endpoint) || { failures: 0, lastFailureTime: now, isOpen: false };
  breaker.failures += 1;
  breaker.lastFailureTime = now;
  if (breaker.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    breaker.isOpen = true;
  }
  breakers.set(endpoint, breaker);
}

export function resetCircuitBreakers() {
  breakers.clear();
}
