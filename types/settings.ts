export interface AISettings {
  geminiApiKey: string;
  hasGeminiKey?: boolean;
  primaryModel: string;
  fallbackModels: string[];
  routerUrl: string;
  routerApiKey: string;
  hasRouterKey?: boolean;
  mockMode: boolean;
}

export interface VPSSettings {
  hermesEndpoint: string;
  openWebUiEndpoint: string;
  pocketbaseUrl: string;
  storeDriver: 'auto' | 'file' | 'pocketbase';
}

export interface GitHubSettings {
  githubToken: string;
  hasGithubToken?: boolean;
  defaultOwner: string;
  defaultRepo: string;
  targetBranch: string;
  autoPushOnSuccess: boolean;
}

export interface OrchestrationSettings {
  kikyApprovalGates: 'strict' | 'autonomous';
  loggingLevel: 'debug' | 'info' | 'warn' | 'error';
  divisionRouting: Record<string, 'gemini' | 'hermes' | 'antigravity'>;
}

export interface AppearanceSettings {
  frostedGlass: boolean;
  reducedMotion: boolean;
  soundEffects: boolean;
  voiceLanguage: 'id-ID' | 'en-US';
  autoSubmitVoiceSilence: boolean;
}

export interface FactorySettings {
  ai: AISettings;
  vps: VPSSettings;
  github: GitHubSettings;
  orchestration: OrchestrationSettings;
  appearance: AppearanceSettings;
  updatedAt?: string;
}

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
