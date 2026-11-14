/**
 * Real-Time Telemetry & Reasoning Stream (Based on ai-agent-super-skill & token-efficient)
 * Tracks live token burn rate, accumulated reasoning chains (thoughts), and token savings.
 */

export interface ReasoningThought {
  id: string;
  agent: string;
  thought: string;
  timestamp: string;
}

export interface TelemetryState {
  projectId: string;
  activeAgent: string;
  activeStep: string;
  burnRate: number; // Tokens per second
  totalTokensUsed: number;
  estimatedTokensSaved: number;
  thoughts: ReasoningThought[];
  lastUpdated: string;
}

// In-memory process storage for live telemetry
const telemetryStore = new Map<string, TelemetryState>();
const burnHistory = new Map<string, { timestamp: number; tokens: number }[]>();

function ensureState(projectId: string): TelemetryState {
  let state = telemetryStore.get(projectId);
  if (!state) {
    state = {
      projectId,
      activeAgent: 'system',
      activeStep: 'idle',
      burnRate: 0,
      totalTokensUsed: 0,
      estimatedTokensSaved: 0,
      thoughts: [],
      lastUpdated: new Date().toISOString(),
    };
    telemetryStore.set(projectId, state);
  }
  return state;
}

/**
 * Appends a thought block to the live reasoning stream for the active agent.
 */
export function recordThought(projectId: string, agent: string, thoughtText: string): ReasoningThought {
  const state = ensureState(projectId);
  state.activeAgent = agent;
  state.lastUpdated = new Date().toISOString();

  const thought: ReasoningThought = {
    id: `th-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    agent,
    thought: thoughtText.trim(),
    timestamp: state.lastUpdated,
  };

  // Keep last 30 thought items to prevent boundless memory growth
  state.thoughts = [...state.thoughts.slice(-29), thought];
  return thought;
}

/**
 * Records token consumption and calculates live burn rate (tokens/sec).
 */
export function recordTokenUsage(
  projectId: string,
  tokenCount: number,
  tokensSaved = 0,
  agent?: string,
  step?: string
): void {
  const state = ensureState(projectId);
  if (agent) state.activeAgent = agent;
  if (step) state.activeStep = step;

  state.totalTokensUsed += Math.max(0, tokenCount);
  state.estimatedTokensSaved += Math.max(0, tokensSaved);
  state.lastUpdated = new Date().toISOString();

  // Update sliding window for burn rate (last 10 seconds)
  const now = Date.now();
  let history = burnHistory.get(projectId);
  if (!history) {
    history = [];
    burnHistory.set(projectId, history);
  }

  history.push({ timestamp: now, tokens: tokenCount });
  // Evict entries older than 10 seconds
  const cutoff = now - 10_000;
  const validHistory = history.filter((h) => h.timestamp >= cutoff);
  burnHistory.set(projectId, validHistory);

  const windowTokens = validHistory.reduce((sum, h) => sum + h.tokens, 0);
  const timeSpanSec = validHistory.length > 1
    ? Math.max(1, (now - validHistory[0].timestamp) / 1000)
    : 1;

  state.burnRate = Math.round(windowTokens / timeSpanSec);
}

/**
 * Retrieves the current live telemetry for a given project.
 */
export function getTelemetry(projectId: string): TelemetryState {
  return ensureState(projectId);
}

/**
 * Resets telemetry data for a project when a new run begins.
 */
export function resetTelemetry(projectId: string): void {
  telemetryStore.delete(projectId);
  burnHistory.delete(projectId);
}
