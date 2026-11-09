import fs from 'node:fs';
import path from 'node:path';
import type { AgentRole } from '@/types';
import {
  DEFAULT_DIVISIONS,
  type DivisionAgentConfig,
} from './division-types';

export * from './division-types';

const CONFIG_FILE = path.join(process.cwd(), '.data', 'division-config.json');

export function getDivisionConfigs(): Record<AgentRole, DivisionAgentConfig> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_DIVISIONS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_DIVISIONS };
}

export function saveDivisionConfigs(
  updated: Record<string, Partial<DivisionAgentConfig>>
): Record<AgentRole, DivisionAgentConfig> {
  const current = getDivisionConfigs();
  const merged: Record<AgentRole, DivisionAgentConfig> = { ...current };

  for (const [key, val] of Object.entries(updated)) {
    const role = key as AgentRole;
    if (merged[role]) {
      merged[role] = { ...merged[role], ...val };
    }
  }

  try {
    const dir = path.dirname(CONFIG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
  } catch {}

  return merged;
}
