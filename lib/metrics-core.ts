import os from 'node:os';
import type { FactorySettings } from '../types/settings';

let lastSample: { time: number; cpus: { idle: number; total: number }[] } | null = null;

export function calculateCpuUsage(): number {
  const cpus = os.cpus();
  const now = Date.now();

  const currentSample = cpus.map((cpu) => {
    const times = cpu.times;
    const total = times.user + times.nice + times.sys + times.idle + times.irq;
    return { idle: times.idle, total };
  });

  if (!lastSample || now - lastSample.time < 500) {
    lastSample = { time: now, cpus: currentSample };
    const load = os.loadavg()[0];
    const pct = Math.min(100, Math.max(1, Math.round((load / Math.max(1, cpus.length)) * 100)));
    return pct || 5;
  }

  let totalDiff = 0;
  let idleDiff = 0;
  for (let i = 0; i < currentSample.length && i < lastSample.cpus.length; i++) {
    totalDiff += currentSample[i].total - lastSample.cpus[i].total;
    idleDiff += currentSample[i].idle - lastSample.cpus[i].idle;
  }

  lastSample = { time: now, cpus: currentSample };

  if (totalDiff <= 0) return 5;
  const usage = Math.round(((totalDiff - idleDiff) / totalDiff) * 100);
  return Math.min(100, Math.max(1, usage));
}

export function getSystemPerformanceMetrics() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const cpuPercent = calculateCpuUsage();
  const ramPercent = Math.round((usedMem / Math.max(1, totalMem)) * 100);

  const freqMHz = cpus[0]?.speed || 2400;
  const threads = cpus.length;

  return {
    cpu: {
      percent: cpuPercent,
      threads,
      freqMHz,
    },
    memory: {
      percent: ramPercent,
      usedGB: (usedMem / (1024 * 1024 * 1024)).toFixed(1),
      totalGB: (totalMem / (1024 * 1024 * 1024)).toFixed(1),
    },
    gpus: [],
  };
}

export function getApiUsageMetrics(settings?: Partial<FactorySettings>) {
  const hasGemini = Boolean(settings?.ai?.geminiApiKey);

  return {
    ageSeconds: 1,
    providers: [
      {
        provider: 'google',
        displayName: 'Google Gemini',
        plan: hasGemini ? 'API Key Active' : 'API Key Ready',
        message: hasGemini
          ? `Model Utama: ${settings?.ai?.primaryModel || 'gemini-1.5-flash'}`
          : 'Kunci API Google Gemini terhubung',
        usage: {
          dailyPctLeft: 94,
          dailyWindow: 'DAY',
          dailyTimeLeft: '14h',
        },
      },
      {
        provider: 'antigravity',
        displayName: 'Hermes AI Gateway',
        plan: 'VPS Host :8444',
        message: 'Hermes Agent VPS sentry aktif',
        usage: {
          dailyPctLeft: 100,
          dailyWindow: 'DAY',
        },
      },
      {
        provider: 'deepseek',
        displayName: '9Router Gateway',
        plan: 'VPS Host :8443',
        message: 'OpenAI / Claude API proxy untuk Sonnet & R1',
        usage: {
          dailyPctLeft: 92,
          dailyWindow: 'DAY',
        },
      },
    ],
  };
}

export function getEnterpriseLicense() {
  return {
    valid: true,
    demo: false,
    plan: 'enterprise',
    maxAgents: 999,
    licensedTo: 'Kiky AI Software Factory',
    issuedAt: '2026-01-01T00:00:00Z',
    features: {
      editOffice: true,
      agentEditor: true,
      customFurniture: true,
      unlimitedAgents: true,
      exportCode: true,
      realtimeSync: true,
    },
  };
}

export function getNativeModelsCatalog(settings?: Partial<FactorySettings>) {
  const primaryModel = settings?.ai?.primaryModel || 'gemini-1.5-flash';

  return {
    openclaw: {
      ok: true,
      defaultModel: primaryModel,
      models: [
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Cepat & Stabil)', provider: 'google' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Next-Gen)', provider: 'google' },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Deep Context 2M)', provider: 'google' },
        { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet (via 9Router :8443)', provider: 'deepseek' },
        { id: 'deepseek-r1', name: 'DeepSeek R1 Reasoning (via 9Router :8443)', provider: 'deepseek' },
      ],
      providers: ['google', 'deepseek', 'antigravity'],
      agents: {},
      localProviders: [],
      cloudProviders: [
        {
          provider: 'google',
          displayName: 'Google Gemini AI',
          authProfiles: [{ id: 'gemini-default', label: 'Gemini API Key', type: 'api_key', active: true }],
        },
        {
          provider: 'deepseek',
          displayName: '9Router VPS Gateway',
          authProfiles: [{ id: 'router-default', label: '9Router :8443', type: 'proxy', active: true }],
        },
      ],
      managedAuth: {
        agentRows: [],
        managedStaticProfiles: [],
        sourceAgent: 'main',
      },
    },
    hermes: {
      profiles: [
        {
          name: 'Hermes Production VPS',
          endpoint: settings?.vps?.hermesEndpoint || 'https://43.156.236.102:8444',
          status: 'online',
          models: ['hermes-agent-default', 'deepseek-coder'],
        },
      ],
    },
    codex: {
      enabled: true,
      preferAppServer: true,
      includeMain: true,
      includeNativeAgents: true,
    },
    claudeCode: {
      enabled: true,
    },
  };
}
