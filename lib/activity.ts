import type { AgentLog, AgentRole } from '@/types';

export type OfficeState = 'idle' | 'typing' | 'discussing';

export const ROLE_ORDER: AgentRole[] = [
  'agent-5-ux',
  'intelligence-risk',
  'agent-1-pm',
  'agent-4-analyst',
  'tech-stack-security',
  'agent-coder',
];

export type RoleStatus = 'pending' | 'running' | 'completed' | 'failed';

/** Latest status of each agent according to the log stream. */
export function roleStatuses(logs: AgentLog[]): Record<AgentRole, RoleStatus> {
  const out = Object.fromEntries(ROLE_ORDER.map((r) => [r, 'pending'])) as Record<AgentRole, RoleStatus>;
  for (const l of logs) {
    if (l.agent in out) out[l.agent as AgentRole] = l.status;
  }
  return out;
}

/**
 * Map the log stream to character behaviour in the Pixel Office:
 * the running agent types; the agent that just handed over work discusses with it.
 */
export function officeActivity(logs: AgentLog[], now = Date.now()): Record<AgentRole, OfficeState> {
  const st = roleStatuses(logs);
  const out = Object.fromEntries(ROLE_ORDER.map((r) => [r, 'idle'])) as Record<AgentRole, OfficeState>;
  const running = ROLE_ORDER.find((r) => st[r] === 'running');
  if (!running) return out;
  out[running] = 'typing';

  const idx = ROLE_ORDER.indexOf(running);
  const prev = ROLE_ORDER[idx - 1];
  if (prev && st[prev] === 'completed') {
    const startedAt = [...logs].reverse().find((l) => l.agent === running && l.status === 'running')?.timestamp;
    if (startedAt && now - new Date(startedAt).getTime() < 8000) {
      out[prev] = 'discussing';
      out[running] = 'discussing';
    }
  }
  return out;
}
