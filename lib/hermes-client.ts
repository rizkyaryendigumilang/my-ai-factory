import 'server-only';
import https from 'node:https';
import http from 'node:http';
import type { AgentRole } from '@/types';
import type { DivisionAgentConfig } from './division-types';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export { isRemoteDivision } from './division-types';

export interface RemoteDispatchResult {
  ok: boolean;
  text?: string;
  source: string;
  error?: string;
  latencyMs: number;
}

/**
 * Dispatches an agent task to the remote VPS endpoint configured for this division.
 * Supports Hermes VPS (port 8444), 9Router (port 8443), and Ollama VM via Open WebUI / Muse Bridge.
 */
export async function dispatchToRemoteAgent(
  role: AgentRole,
  config: DivisionAgentConfig,
  taskPrompt: string,
  systemInstruction?: string
): Promise<RemoteDispatchResult> {
  const start = Date.now();
  let apiKey = process.env.HERMES_API_KEY || 'Apaya1234';
  if (config.source === 'router9-vps') {
    apiKey = process.env.ROUTER_9_API_KEY || 'Apaya1234';
  } else if (config.source === 'ollama-vm') {
    apiKey = process.env.OPEN_WEBUI_API_KEY || 'sk-factory-kiky-ollama-2026';
  }

  let targetUrl = config.endpointUrl;
  if (!targetUrl || targetUrl.trim() === '') {
    if (config.source === 'router9-vps') {
      targetUrl = process.env.ROUTER_9_URL || 'https://43.156.236.102:8443/v1/chat/completions';
    } else if (config.source === 'ollama-vm') {
      targetUrl = process.env.OPEN_WEBUI_URL || 'https://43.156.236.102/api/chat/completions';
    } else {
      targetUrl = process.env.HERMES_VPS_URL || 'https://43.156.236.102:8444/v1/chat/completions';
    }
  }

  // Ensure OpenAI-compatible chat completions endpoint if root URL given
  if (
    !targetUrl.includes('/v1/chat/completions') &&
    !targetUrl.includes('/api/chat/completions') &&
    !targetUrl.includes('?profile=')
  ) {
    targetUrl = targetUrl.replace(/\/+$/, '') + '/v1/chat/completions';
  }

  const defaultModel =
    config.source === 'ollama-vm'
      ? role === 'agent-coder'
        ? 'muse_bridge.ollama-qwen-coder'
        : 'muse_bridge.ollama-deepseek'
      : config.source === 'router9-vps'
      ? 'claude-3-5-sonnet'
      : 'hermes-coder';

  const model = config.modelOrProfile || defaultModel;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);

    const payload = {
      model,
      messages: [
        ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
        { role: 'user', content: taskPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    };

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Agent-Role': role,
        'X-Division': config.divisionTitle,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      // @ts-ignore - custom httpsAgent for self-signed certificates
      agent: targetUrl.startsWith('https:') ? httpsAgent : undefined,
    });

    clearTimeout(timeout);
    const elapsed = Date.now() - start;

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        ok: false,
        source: config.source,
        error: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
        latencyMs: elapsed,
      };
    }

    const data = await res.json().catch(() => null);
    const content =
      data?.choices?.[0]?.message?.content ??
      data?.response ??
      data?.output ??
      (typeof data === 'string' ? data : JSON.stringify(data));

    return {
      ok: true,
      text: content,
      source: `${config.source} (${model})`,
      latencyMs: elapsed,
    };
  } catch (err: any) {
    return {
      ok: false,
      source: config.source,
      error: err?.message || 'Connection failed',
      latencyMs: Date.now() - start,
    };
  }
}
