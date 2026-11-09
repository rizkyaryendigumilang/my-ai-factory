import type { AgentRole } from '@/types';

export type AgentSource = 'native' | 'hermes-vps' | 'router9-vps' | 'custom-vps';

export interface DivisionAgentConfig {
  role: AgentRole;
  divisionTitle: string;
  defaultName: string;
  source: AgentSource;
  agentName: string;
  modelOrProfile: string;
  endpointUrl: string;
  description: string;
}

export interface ProviderPreset {
  id: string;
  label: string;
}

export interface ProviderInfo {
  id: AgentSource;
  label: string;
  port: string;
  defaultUrl: string;
  description: string;
  presets: ProviderPreset[];
}

export const PROVIDER_OPTIONS: Record<AgentSource, ProviderInfo> = {
  'hermes-vps': {
    id: 'hermes-vps',
    label: 'Hermes VPS Agent (8444)',
    port: '8444',
    defaultUrl: 'https://43.156.236.102:8444/?profile=',
    description: 'Autonomous multi-profile agent running on VPS port 8444',
    presets: [
      { id: 'default', label: 'Hermes Default Profile' },
      { id: 'hermes-pm-v1', label: 'Hermes PM Specialist' },
      { id: 'hermes-scout', label: 'Hermes Cloud & Risk Scout' },
      { id: 'hermes-analyst', label: 'Hermes Architecture Analyst' },
      { id: 'hermes-security', label: 'Hermes Security Hardening' },
      { id: 'hermes-coder', label: 'Hermes Fullstack Coder' },
    ],
  },
  'router9-vps': {
    id: 'router9-vps',
    label: '9Router AI Gateway (8443)',
    port: '8443',
    defaultUrl: 'https://43.156.236.102:8443/',
    description: 'Unified multi-model LLM router on VPS port 8443',
    presets: [
      { id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
      { id: 'deepseek-coder-v2', label: 'DeepSeek Coder V2' },
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
      { id: 'qwen-2.5-coder', label: 'Qwen 2.5 Coder' },
    ],
  },
  native: {
    id: 'native',
    label: 'Native AI Factory',
    port: 'Local',
    defaultUrl: '/api/agents',
    description: 'Internal engine with local rule-based and direct model execution',
    presets: [
      { id: 'native-stitch', label: 'Stitch UI Specialist' },
      { id: 'gemini-flash', label: 'Gemini Direct API' },
      { id: 'demo-offline', label: 'Deterministic Demo Engine' },
    ],
  },
  'custom-vps': {
    id: 'custom-vps',
    label: 'Kustom VPS Endpoint',
    port: 'Custom',
    defaultUrl: 'https://43.156.236.102:8444/',
    description: 'Custom self-hosted endpoint or agent pipeline',
    presets: [{ id: 'custom-profile', label: 'Custom Profile' }],
  },
};

export const DEFAULT_DIVISIONS: Record<AgentRole, DivisionAgentConfig> = {
  'agent-1-pm': {
    role: 'agent-1-pm',
    divisionTitle: 'Product Management (BRD & PRD)',
    defaultName: 'PM',
    source: 'hermes-vps',
    agentName: 'Hermes PM Agent',
    modelOrProfile: 'hermes-pm-v1',
    endpointUrl: 'https://43.156.236.102:8444/?profile=default',
    description: 'Menyusun BRD & PRD, mendefinisikan user stories, acceptance criteria, dan skenario bisnis.',
  },
  'agent-5-ux': {
    role: 'agent-5-ux',
    divisionTitle: 'UI/UX Design & Token Antarmuka',
    defaultName: 'Stitch',
    source: 'native',
    agentName: 'Stitch UI Specialist',
    modelOrProfile: 'native-stitch',
    endpointUrl: 'https://43.156.236.102:8443/',
    description: 'Mengekstrak design tokens, palet warna, tipografi, dan spesifikasi komponen antarmuka.',
  },
  'intelligence-risk': {
    role: 'intelligence-risk',
    divisionTitle: 'Cloud Risk & Estimasi Infrastruktur',
    defaultName: 'Scout',
    source: 'hermes-vps',
    agentName: 'Hermes Risk Scout',
    modelOrProfile: 'hermes-scout',
    endpointUrl: 'https://43.156.236.102:8444/?profile=default',
    description: 'Menganalisis potensi bottleneck, estimasi biaya cloud AWS/GCP, dan kalkulasi skalabilitas.',
  },
  'agent-4-analyst': {
    role: 'agent-4-analyst',
    divisionTitle: 'System Analyst (ERD, UML, DFD)',
    defaultName: 'Analyst',
    source: 'router9-vps',
    agentName: '9Router System Analyst',
    modelOrProfile: 'claude-3-5-sonnet',
    endpointUrl: 'https://43.156.236.102:8443/',
    description: 'Merancang arsitektur data ERD, sequence UML, data flow DFD, dan format visual DrawIO.',
  },
  'tech-stack-security': {
    role: 'tech-stack-security',
    divisionTitle: 'Security Architect (OWASP Hardening)',
    defaultName: 'Security',
    source: 'hermes-vps',
    agentName: 'Hermes Security Hardening',
    modelOrProfile: 'hermes-security',
    endpointUrl: 'https://43.156.236.102:8444/?profile=default',
    description: 'Mengaudit keamanan OWASP Top 10, validasi input sanitization, dan proteksi credential.',
  },
  'agent-coder': {
    role: 'agent-coder',
    divisionTitle: 'Fullstack Next.js Coder (ECC)',
    defaultName: 'Coder',
    source: 'router9-vps',
    agentName: '9Router DeepSeek Coder',
    modelOrProfile: 'deepseek-coder-v2',
    endpointUrl: 'https://43.156.236.102:8443/',
    description: 'Mengonstruksi kode Next.js 15 App Router, TypeScript, dan unit test berbasis ECC.',
  },
};
