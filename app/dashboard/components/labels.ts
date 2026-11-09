import type { AgentRole, DocType } from '@/types';

export const AGENT_LABELS: Record<AgentRole, string> = {
  'agent-5-ux': 'Token Desain & UI',
  'intelligence-risk': 'Risiko & Biaya Cloud',
  'agent-1-pm': 'Spesifikasi Produk (PRD)',
  'agent-4-analyst': 'Diagram Sistem',
  'tech-stack-security': 'Arsitektur & Keamanan',
  'agent-coder': 'Generator Kode',
};

export const DOC_LABELS: Record<DocType, string> = {
  design_tokens: 'Design Tokens',
  risk_analysis: 'Risiko & Biaya',
  brd_prd: 'BRD & PRD',
  uml: 'Diagram Kelas (UML)',
  erd: 'Skema Data (ERD)',
  dfd: 'Aliran Data (DFD)',
  architecture: 'Arsitektur Sistem',
  tech_stack: 'Tech Stack & OWASP',
  qa_plan: 'Rencana Pengujian (QA)',
};

export const DOC_ORDER = Object.keys(DOC_LABELS) as DocType[];
