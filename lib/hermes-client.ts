import https from 'node:https';
import type { AgentRole } from '@/types';
import type { DivisionAgentConfig } from './division-types';
import { extractJsonFromText } from './json-extract';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export { isRemoteDivision } from './division-types';
export { extractJsonFromText } from './json-extract';

export interface RemoteDispatchResult {
  ok: boolean;
  text?: string;
  source: string;
  error?: string;
  latencyMs: number;
}


/**
 * Dispatches an agent task to the remote VPS endpoint configured for this division.
 * Supports Hermes VPS (port 8444), 9Router (port 8443 / 20128), and Ollama VM via Open WebUI / Muse Bridge.
 */
export async function dispatchToRemoteAgent(
  role: AgentRole,
  config: DivisionAgentConfig,
  taskPrompt: string,
  systemInstruction?: string,
  options: { timeoutMs?: number; maxTokens?: number } = {}
): Promise<RemoteDispatchResult> {
  const start = Date.now();
  let apiKey = process.env.HERMES_API_KEY || 'Apaya1234';
  if (config.source === 'router9-vps') {
    apiKey = process.env.ROUTER_9_API_KEY || 'sk-11229f9206f6a4c2-dox3gw-a168f1b5';
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
      ? 'gemini-flash'
      : 'hermes-coder';

  const model = config.modelOrProfile || defaultModel;
  const timeoutMs = options.timeoutMs ?? 75_000;
  const maxTokens = options.maxTokens ?? 8192;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const payload = {
      model,
      stream: false,
      messages: [
        ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
        { role: 'user', content: taskPrompt },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
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
      // If Ollama VM returns error, try automatic fallback to 9Router if available
      if (config.source === 'ollama-vm' && targetUrl !== 'https://43.156.236.102:8443/v1/chat/completions') {
        const fallbackConfig: DivisionAgentConfig = {
          ...config,
          source: 'router9-vps',
          modelOrProfile: 'gemini-flash',
          endpointUrl: 'https://43.156.236.102:8443/v1/chat/completions',
        };
        const fbRes = await dispatchToRemoteAgent(role, fallbackConfig, taskPrompt, systemInstruction, {
          timeoutMs: 30_000,
          maxTokens,
        });
        if (fbRes.ok) return fbRes;
      }

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
    // If Ollama VM times out, fallback to 9Router
    if (config.source === 'ollama-vm') {
      try {
        const fallbackConfig: DivisionAgentConfig = {
          ...config,
          source: 'router9-vps',
          modelOrProfile: 'gemini-flash',
          endpointUrl: 'https://43.156.236.102:8443/v1/chat/completions',
        };
        const fbRes = await dispatchToRemoteAgent(role, fallbackConfig, taskPrompt, systemInstruction, {
          timeoutMs: 30_000,
          maxTokens,
        });
        if (fbRes.ok) return fbRes;
      } catch {}
    }

    return {
      ok: false,
      source: config.source,
      error: err?.message || 'Connection failed',
      latencyMs: Date.now() - start,
    };
  }
}
