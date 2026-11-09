export type GemPersona =
  | 'mvp-speedrunner'
  | 'security-architect'
  | 'fullstack-engineer'
  | 'product-designer';

export const GEM_PERSONAS: Record<
  GemPersona,
  { label: string; desc: string; directive: string }
> = {
  'mvp-speedrunner': {
    label: 'MVP Speedrunner',
    desc: 'Kecepatan pembuatan MVP, stack ringan, iterasi cepat.',
    directive:
      'Prioritize shipping speed. Smallest viable scope, lightweight stack, minimal dependencies, cut anything not needed for the first release.',
  },
  'security-architect': {
    label: 'Security Architect',
    desc: 'Hardening OWASP Top 10 dan arsitektur aman.',
    directive:
      'Prioritize security. Apply OWASP Top 10 mitigations everywhere: input validation, authz checks, secure headers, secrets handling, least privilege.',
  },
  'fullstack-engineer': {
    label: 'Fullstack Engineer',
    desc: 'Arsitektur full-stack lengkap, frontend dan backend terpadu.',
    directive:
      'Prioritize a complete, maintainable full-stack architecture: clear layering, typed contracts, tests, error handling.',
  },
  'product-designer': {
    label: 'Product Designer',
    desc: 'UX/UI, design tokens, pengalaman pengguna prima.',
    directive:
      'Prioritize UX/UI quality: consistent design tokens, accessibility, empty/loading/error states, polished micro-interactions.',
  },
};

export const GEM_PERSONA_IDS = Object.keys(GEM_PERSONAS) as [GemPersona, ...GemPersona[]];

export interface DesignReference {
  type: 'image' | 'url';
  url: string;
  name?: string;
}

export type ProjectStatus = 'draft' | 'running' | 'completed' | 'failed';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  raw_prompt: string;
  gem_persona: GemPersona;
  design_ref_url: DesignReference[];
  skills: string[];
  status: ProjectStatus;
  created: string;
  updated: string;
}

export type DocType =
  | 'brd_prd'
  | 'erd'
  | 'dfd'
  | 'uml'
  | 'tech_stack'
  | 'qa_plan'
  | 'architecture'
  | 'design_tokens'
  | 'risk_analysis';

export interface ProjectDocument {
  id: string;
  project_id: string;
  doc_type: DocType;
  content_json: any;
  created: string;
  updated: string;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  file_path: string;
  file_content: string;
  created: string;
  updated: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  content?: string;
}

export type AgentRole =
  | 'agent-5-ux'
  | 'intelligence-risk'
  | 'agent-1-pm'
  | 'agent-4-analyst'
  | 'tech-stack-security'
  | 'agent-coder';

export interface AgentLog {
  id: string;
  project_id: string;
  agent: AgentRole | 'system';
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message: string;
  timestamp: string;
}

export interface DesignToken {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    [k: string]: string;
  };
  typography: {
    heading: string;
    body: string;
    scale?: Record<string, string>;
  };
  spacing?: Record<string, string>;
  radius?: string;
  uiStructure?: string[];
  source?: string;
}

export interface DiagramDoc {
  title: string;
  mermaid: string;
  nodes: { id: string; label: string; group?: string }[];
  edges: { from: string; to: string; label?: string }[];
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  label: string;
  created: string;
  file_count: number;
  doc_count: number;
}

export interface ProjectState {
  project: Project;
  documents: ProjectDocument[];
  files: ProjectFile[];
  logs: AgentLog[];
  versions: ProjectVersion[];
}
