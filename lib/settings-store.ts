import fs from 'node:fs';
import path from 'node:path';
import type { FactorySettings } from '@/types/settings';

export const DEFAULT_FACTORY_SETTINGS: FactorySettings = {
  ai: {
    geminiApiKey: '',
    primaryModel: 'gemini-1.5-flash',
    fallbackModels: ['gemini-2.0-flash', 'gemini-1.5-pro'],
    routerUrl: 'https://43.156.236.102:8443',
    routerApiKey: '',
    mockMode: false,
  },
  vps: {
    hermesEndpoint: 'https://43.156.236.102:8444',
    openWebUiEndpoint: 'https://43.156.236.102:8080',
    pocketbaseUrl: 'http://127.0.0.1:8090',
    storeDriver: 'auto',
  },
  github: {
    githubToken: '',
    defaultOwner: '',
    defaultRepo: '',
    targetBranch: 'main',
    autoPushOnSuccess: false,
  },
  orchestration: {
    kikyApprovalGates: 'strict',
    loggingLevel: 'info',
    divisionRouting: {
      research: 'gemini',
      analyst: 'gemini',
      designer: 'gemini',
      architect: 'gemini',
      frontend: 'gemini',
      backend: 'gemini',
      qa: 'gemini',
      devops: 'hermes',
    },
  },
  appearance: {
    frostedGlass: true,
    reducedMotion: false,
    soundEffects: true,
    voiceLanguage: 'id-ID',
    autoSubmitVoiceSilence: true,
  },
};

const SETTINGS_FILE = path.join(process.cwd(), '.data', 'settings.json');

function mask(value?: string): string {
  if (!value || value.trim().length === 0) return '';
  const trimmed = value.trim();
  if (trimmed.length <= 8) return '••••••••';
  const visible = trimmed.slice(-4);
  return '••••••••••••' + visible;
}

function isMasked(value?: string): boolean {
  return typeof value === 'string' && value.startsWith('••');
}

/** Read raw settings from disk without masking secrets */
export function readRawSettings(): FactorySettings {
  try {
    let stored: Partial<FactorySettings> = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
      stored = JSON.parse(raw);
    }

    // Merge with defaults & environment variables
    const merged: FactorySettings = {
      ai: {
        ...DEFAULT_FACTORY_SETTINGS.ai,
        ...stored.ai,
        geminiApiKey:
          stored.ai?.geminiApiKey ||
          process.env.GEMINI_API_KEY ||
          process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
          '',
        primaryModel:
          stored.ai?.primaryModel ||
          process.env.GEMINI_MODEL ||
          DEFAULT_FACTORY_SETTINGS.ai.primaryModel,
        fallbackModels:
          stored.ai?.fallbackModels ||
          (process.env.GEMINI_FALLBACK_MODELS
            ? process.env.GEMINI_FALLBACK_MODELS.split(',').map((s) => s.trim())
            : DEFAULT_FACTORY_SETTINGS.ai.fallbackModels),
        routerUrl:
          stored.ai?.routerUrl ||
          DEFAULT_FACTORY_SETTINGS.ai.routerUrl,
        routerApiKey:
          stored.ai?.routerApiKey ||
          process.env.ROUTER_API_KEY ||
          '',
        mockMode:
          typeof stored.ai?.mockMode === 'boolean'
            ? stored.ai.mockMode
            : process.env.FACTORY_MOCK === '1',
      },
      vps: {
        ...DEFAULT_FACTORY_SETTINGS.vps,
        ...stored.vps,
        hermesEndpoint:
          stored.vps?.hermesEndpoint ||
          process.env.HERMES_AGENT_ENDPOINT ||
          DEFAULT_FACTORY_SETTINGS.vps.hermesEndpoint,
        openWebUiEndpoint:
          stored.vps?.openWebUiEndpoint ||
          process.env.OPEN_WEBUI_ENDPOINT ||
          DEFAULT_FACTORY_SETTINGS.vps.openWebUiEndpoint,
        pocketbaseUrl:
          stored.vps?.pocketbaseUrl ||
          process.env.POCKETBASE_URL ||
          DEFAULT_FACTORY_SETTINGS.vps.pocketbaseUrl,
        storeDriver:
          stored.vps?.storeDriver ||
          (process.env.STORE_DRIVER as any) ||
          DEFAULT_FACTORY_SETTINGS.vps.storeDriver,
      },
      github: {
        ...DEFAULT_FACTORY_SETTINGS.github,
        ...stored.github,
        githubToken:
          stored.github?.githubToken ||
          process.env.GITHUB_TOKEN ||
          '',
        defaultOwner:
          stored.github?.defaultOwner ||
          process.env.GITHUB_DEFAULT_OWNER ||
          DEFAULT_FACTORY_SETTINGS.github.defaultOwner,
        defaultRepo:
          stored.github?.defaultRepo ||
          DEFAULT_FACTORY_SETTINGS.github.defaultRepo,
        targetBranch:
          stored.github?.targetBranch ||
          DEFAULT_FACTORY_SETTINGS.github.targetBranch,
        autoPushOnSuccess:
          typeof stored.github?.autoPushOnSuccess === 'boolean'
            ? stored.github.autoPushOnSuccess
            : DEFAULT_FACTORY_SETTINGS.github.autoPushOnSuccess,
      },
      orchestration: {
        ...DEFAULT_FACTORY_SETTINGS.orchestration,
        ...stored.orchestration,
        divisionRouting: {
          ...DEFAULT_FACTORY_SETTINGS.orchestration.divisionRouting,
          ...(stored.orchestration?.divisionRouting || {}),
        },
      },
      appearance: {
        ...DEFAULT_FACTORY_SETTINGS.appearance,
        ...stored.appearance,
      },
      updatedAt: stored.updatedAt || new Date().toISOString(),
    };

    return merged;
  } catch (err) {
    // shortcut: jika berkas .data/settings.json korup, tetap pertahankan kunci dari .env.local
    return {
      ...DEFAULT_FACTORY_SETTINGS,
      ai: {
        ...DEFAULT_FACTORY_SETTINGS.ai,
        geminiApiKey:
          process.env.GEMINI_API_KEY ||
          process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
          '',
        primaryModel:
          process.env.GEMINI_MODEL ||
          DEFAULT_FACTORY_SETTINGS.ai.primaryModel,
      },
      vps: {
        ...DEFAULT_FACTORY_SETTINGS.vps,
        hermesEndpoint:
          process.env.HERMES_AGENT_ENDPOINT ||
          DEFAULT_FACTORY_SETTINGS.vps.hermesEndpoint,
        pocketbaseUrl:
          process.env.POCKETBASE_URL ||
          DEFAULT_FACTORY_SETTINGS.vps.pocketbaseUrl,
      },
      github: {
        ...DEFAULT_FACTORY_SETTINGS.github,
        githubToken: process.env.GITHUB_TOKEN || '',
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

/** Get factory settings for client presentation (sensitive values masked) */
export function getFactorySettings(): FactorySettings {
  const raw = readRawSettings();
  return {
    ...raw,
    ai: {
      ...raw.ai,
      hasGeminiKey: Boolean(raw.ai.geminiApiKey?.trim()),
      geminiApiKey: mask(raw.ai.geminiApiKey),
      hasRouterKey: Boolean(raw.ai.routerApiKey?.trim()),
      routerApiKey: mask(raw.ai.routerApiKey),
    },
    github: {
      ...raw.github,
      hasGithubToken: Boolean(raw.github.githubToken?.trim()),
      githubToken: mask(raw.github.githubToken),
    },
  };
}

/** Save factory settings, preserving existing secrets if masked or omitted */
export function saveFactorySettings(incoming: Partial<FactorySettings>): FactorySettings {
  const existing = readRawSettings();

  // Resolve API key updates
  let resolvedGeminiKey = existing.ai.geminiApiKey;
  if (incoming.ai?.geminiApiKey !== undefined) {
    if (!isMasked(incoming.ai.geminiApiKey)) {
      resolvedGeminiKey = incoming.ai.geminiApiKey.trim();
    }
  }

  let resolvedRouterKey = existing.ai.routerApiKey;
  if (incoming.ai?.routerApiKey !== undefined) {
    if (!isMasked(incoming.ai.routerApiKey)) {
      resolvedRouterKey = incoming.ai.routerApiKey.trim();
    }
  }

  let resolvedGithubToken = existing.github?.githubToken;
  if (incoming.github?.githubToken !== undefined) {
    if (!isMasked(incoming.github.githubToken)) {
      resolvedGithubToken = incoming.github.githubToken.trim();
    }
  }

  const updated: FactorySettings = {
    ai: {
      ...existing.ai,
      ...(incoming.ai || {}),
      geminiApiKey: resolvedGeminiKey,
      routerApiKey: resolvedRouterKey,
    },
    vps: {
      ...existing.vps,
      ...(incoming.vps || {}),
    },
    github: {
      ...existing.github,
      ...(incoming.github || {}),
      githubToken: resolvedGithubToken || '',
    },
    orchestration: {
      ...existing.orchestration,
      ...(incoming.orchestration || {}),
      divisionRouting: {
        ...existing.orchestration.divisionRouting,
        ...(incoming.orchestration?.divisionRouting || {}),
      },
    },
    appearance: {
      ...existing.appearance,
      ...(incoming.appearance || {}),
    },
    updatedAt: new Date().toISOString(),
  };

  // Ensure directory exists
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf8');

  // Return masked version
  return getFactorySettings();
}

/** Get raw Gemini API key for server execution */
export function getEffectiveGeminiKey(): string {
  return readRawSettings().ai.geminiApiKey;
}

/** Get raw GitHub Token for server export execution */
export function getEffectiveGithubToken(): string {
  return readRawSettings().github.githubToken;
}

/** Get effective Hermes URL */
export function getEffectiveHermesUrl(): string {
  return readRawSettings().vps.hermesEndpoint;
}
