export type Plan = 'free' | 'pro';

export interface Skill {
  id: string;
  name: string;
  description: string;
  tier: Plan;
  /** Injected into the Tech Stack/Security agent and the Coder agent. */
  directive: string;
}

/** Skills System (Step 5): capability modules installed before code generation. */
export const SKILLS: Skill[] = [
  {
    id: 'security-hardening',
    name: 'Security Hardening',
    description: 'OWASP Top 10: validasi input, security headers, rate limiting, secret hygiene.',
    tier: 'pro',
    directive:
      'Apply advanced security hardening: zod validation on every API input, security headers (CSP, HSTS, X-Frame-Options) in next.config, rate limiting middleware, parameterised queries, no secrets in client code, authorization check on every route, and a SECURITY.md with threat model.',
  },
  {
    id: 'payment-gateway',
    name: 'Payment Gateway Integration',
    description: 'Checkout + webhook (Midtrans / Stripe) dengan verifikasi signature.',
    tier: 'free',
    directive:
      'Integrate a payment gateway (Midtrans for ID market, Stripe otherwise): checkout route, server-side webhook with signature verification, idempotent order status updates, and env placeholders for keys.',
  },
  {
    id: 'auth',
    name: 'Authentication',
    description: 'Login/registrasi email + password via PocketBase auth, route guard.',
    tier: 'free',
    directive:
      'Add authentication with PocketBase auth collection: login/register pages, httpOnly cookie session, middleware route guard, and logout.',
  },
  {
    id: 'testing',
    name: 'Automated Testing',
    description: 'Vitest + Testing Library untuk logika inti dan komponen kunci.',
    tier: 'free',
    directive:
      'Add Vitest + React Testing Library with tests for core business logic and key components, plus an npm "test" script.',
  },
  {
    id: 'i18n',
    name: 'Internationalization',
    description: 'Dukungan multi-bahasa (ID/EN) dengan kamus terpusat.',
    tier: 'free',
    directive:
      'Add i18n with a central dictionary (id, en), a language switcher, and no hard-coded UI strings.',
  },
  {
    id: 'analytics',
    name: 'Analytics & Logging',
    description: 'Event tracking ringan dan structured logging.',
    tier: 'free',
    directive: 'Add lightweight event tracking helper and structured server logging.',
  },
  {
    id: 'unslop-craft',
    name: 'Unslop Craft UI',
    description: 'Design craft standar unslop (Damir Sokolovsky): 4px grid, graphite neutral ramp, no AI gradients, calm copy.',
    tier: 'free',
    directive:
      'Apply unslop design rules (Damir Sokolovsky craft spec): strict 4px grid spacing scale, graphite neutral ramp with single quiet accent, zero hue-to-hue gradients or glows, no emojis in UI labels/buttons, sentence-case headings, tabular-nums for metrics, and quiet chrome.',
  },
];

export const getSkill = (id: string) => SKILLS.find((s) => s.id === id);

export const PLAN_LIMITS: Record<Plan, { projectsPerMonth: number }> = {
  free: { projectsPerMonth: 5 },
  pro: { projectsPerMonth: Infinity },
};

/** Current plan. No auth yet, so it is configured per deployment (FACTORY_PLAN=pro). */
export function currentPlan(): Plan {
  return process.env.FACTORY_PLAN === 'pro' ? 'pro' : 'free';
}

/** Skills the plan may install (drops pro-only skills on the free tier). */
export function allowedSkills(ids: string[], plan: Plan = currentPlan()): string[] {
  return ids.filter((id) => {
    const s = getSkill(id);
    return s && (s.tier === 'free' || plan === 'pro');
  });
}
