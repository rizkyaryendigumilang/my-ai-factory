import type { DesignToken, DiagramDoc } from '@/types';

/**
 * Offline demo content, used only when GEMINI_API_KEY is missing (or FACTORY_MOCK=1)
 * so the whole workflow can be exercised without calling the AI. Output is generic and
 * clearly labelled as demo data.
 */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'app';

export function mockTokens(): DesignToken & { extractedTokens: string[] } {
  return {
    colors: { primary: '#2563eb', secondary: '#7c3aed', background: '#0f172a', text: '#e2e8f0', accent: '#22d3ee' },
    typography: { heading: 'Inter', body: 'Inter', scale: { h1: '3rem', h2: '2rem', body: '1rem' } },
    spacing: { sm: '0.5rem', md: '1rem', lg: '2rem' },
    radius: '0.75rem',
    uiStructure: ['Top navbar', 'Hero with primary CTA', 'Feature cards grid', 'Footer'],
    source: 'demo',
    extractedTokens: ['colors', 'typography', 'spacing', 'radius'],
  };
}

export function mockRisk(title: string) {
  return {
    risks: [
      { title: 'Lonjakan trafik AI', severity: 'high', description: 'Pemanggilan LLM berbiaya dan lambat saat banyak pengguna.', mitigation: 'Antrian job, cache hasil, dan batas kuota per pengguna.' },
      { title: 'SQLite single-writer', severity: 'medium', description: 'PocketBase (SQLite) membatasi penulisan paralel.', mitigation: 'Batch penulisan, WAL mode, migrasi ke Postgres bila perlu.' },
    ],
    bottlenecks: ['Latensi respons LLM', 'Ukuran payload file proyek besar'],
    costEstimate: {
      currency: 'USD',
      tiers: [
        { name: 'MVP (≤100 user)', monthlyUsd: 15 },
        { name: 'Growth (≤5k user)', monthlyUsd: 180 },
        { name: 'Scale (≤50k user)', monthlyUsd: 1400 },
      ],
      breakdown: [
        { item: 'Hosting (Vercel/VPS)', monthlyUsd: 10 },
        { item: 'Database & storage', monthlyUsd: 5 },
        { item: 'Gemini API', monthlyUsd: 0 },
      ],
      notes: `Data demo untuk "${title}". Estimasi nyata dihasilkan oleh AI.`,
    },
  };
}

export function mockPrd(title: string, prompt: string) {
  return {
    brd: `# BRD — ${title}\n\n## Latar belakang\n${prompt}\n\n## Tujuan bisnis\n- Meluncurkan MVP dalam hitungan hari\n- Memvalidasi kebutuhan pengguna utama\n\n## Metrik keberhasilan\n- 100 pengguna aktif dalam 30 hari pertama`,
    prd: `# PRD — ${title}\n\n## Ringkasan\n${prompt}\n\n## Kebutuhan fungsional\n1. Pengguna dapat mendaftar dan masuk\n2. Pengguna dapat membuat dan mengelola data inti\n3. Pengguna melihat ringkasan di dashboard\n\n## Kebutuhan non-fungsional\n- Waktu muat < 2 detik\n- Mematuhi OWASP Top 10`,
    userStories: [
      { id: 'US-1', story: 'Sebagai pengguna, saya ingin mendaftar agar data saya tersimpan.', acceptanceCriteria: ['Form menolak email tidak valid', 'Akun dibuat dan pengguna diarahkan ke dashboard'] },
      { id: 'US-2', story: 'Sebagai pengguna, saya ingin membuat item baru agar bisa mengelolanya.', acceptanceCriteria: ['Item tampil di daftar segera setelah dibuat', 'Judul wajib diisi'] },
      { id: 'US-3', story: 'Sebagai pengguna, saya ingin melihat ringkasan agar cepat memahami status.', acceptanceCriteria: ['Dashboard menampilkan jumlah item', 'Data diperbarui tanpa reload'] },
    ],
  };
}

const mk = (title: string, mermaid: string, nodes: DiagramDoc['nodes'], edges: DiagramDoc['edges']): DiagramDoc => ({ title, mermaid, nodes, edges });

export function mockDiagrams(): Record<'uml' | 'erd' | 'dfd' | 'architecture', DiagramDoc> {
  return {
    erd: mk(
      'ERD',
      'erDiagram\n  USER ||--o{ PROJECT : owns\n  PROJECT ||--o{ ITEM : contains',
      [{ id: 'USER', label: 'USER' }, { id: 'PROJECT', label: 'PROJECT' }, { id: 'ITEM', label: 'ITEM' }],
      [{ from: 'USER', to: 'PROJECT', label: 'owns' }, { from: 'PROJECT', to: 'ITEM', label: 'contains' }]
    ),
    uml: mk(
      'UML Class Diagram',
      'classDiagram\n  class User { +id +email +login() }\n  class Project { +id +title +addItem() }\n  User "1" --> "*" Project',
      [{ id: 'User', label: 'User' }, { id: 'Project', label: 'Project' }],
      [{ from: 'User', to: 'Project', label: '1..*' }]
    ),
    dfd: mk(
      'DFD Level 1',
      'flowchart LR\n  U([User]) --> W[Web App]\n  W --> D[(Database)]\n  W --> A[AI Service]',
      [{ id: 'U', label: 'User' }, { id: 'W', label: 'Web App' }, { id: 'D', label: 'Database' }, { id: 'A', label: 'AI Service' }],
      [{ from: 'U', to: 'W', label: 'request' }, { from: 'W', to: 'D', label: 'read/write' }, { from: 'W', to: 'A', label: 'prompt' }]
    ),
    architecture: mk(
      'Architecture',
      'flowchart TD\n  B[Browser] --> N[Next.js App Router]\n  N --> P[(PocketBase)]\n  N --> G[Gemini API]',
      [{ id: 'B', label: 'Browser' }, { id: 'N', label: 'Next.js App Router' }, { id: 'P', label: 'PocketBase' }, { id: 'G', label: 'Gemini API' }],
      [{ from: 'B', to: 'N' }, { from: 'N', to: 'P' }, { from: 'N', to: 'G' }]
    ),
  };
}

export function mockStack(skills: string[]) {
  return {
    stack: [
      { layer: 'Frontend', choice: 'Next.js 15 + Tailwind CSS', reason: 'Cepat, SSR, ekosistem besar.' },
      { layer: 'Backend/DB', choice: 'PocketBase', reason: 'Satu binary, SQLite, auth bawaan.' },
      { layer: 'AI', choice: 'Gemini API', reason: 'Free tier tersedia.' },
    ],
    securityRules: [
      { owasp: 'A01 Broken Access Control', rule: 'Verifikasi kepemilikan data di setiap endpoint.' },
      { owasp: 'A03 Injection', rule: 'Validasi input dengan zod; gunakan filter terparameter.' },
      { owasp: 'A05 Security Misconfiguration', rule: 'Aktifkan security headers dan matikan debug di produksi.' },
    ],
    skillsApplied: skills,
  };
}

export function mockQa() {
  return {
    strategy: 'Unit test logika inti, integration test API, E2E untuk alur utama.',
    testCases: [
      { id: 'TC-1', title: 'Registrasi valid', steps: ['Isi form', 'Submit'], expected: 'Akun dibuat' },
      { id: 'TC-2', title: 'Judul kosong ditolak', steps: ['Buka form item', 'Submit kosong'], expected: 'Pesan error tampil' },
    ],
  };
}

export function mockFiles(title: string, prompt: string, skills: string[]): { path: string; content: string }[] {
  const name = slug(title);
  const esc = (s: string) => s.replace(/</g, '&lt;');
  return [
    {
      path: 'package.json',
      content: JSON.stringify(
        {
          name,
          version: '0.1.0',
          private: true,
          scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
          dependencies: { next: '15.0.0', react: '^18.3.1', 'react-dom': '^18.3.1', pocketbase: '^0.21.4' },
          devDependencies: { typescript: '^5.6.3', tailwindcss: '^3.4.14', postcss: '^8.4.47', autoprefixer: '^10.4.20', '@types/react': '^18.3.0', '@types/node': '^20.16.0' },
        },
        null,
        2
      ),
    },
    { path: 'tsconfig.json', content: JSON.stringify({ compilerOptions: { target: 'ES2022', lib: ['dom', 'esnext'], jsx: 'preserve', module: 'esnext', moduleResolution: 'bundler', strict: true, noEmit: true, esModuleInterop: true, skipLibCheck: true, plugins: [{ name: 'next' }], paths: { '@/*': ['./*'] } }, include: ['**/*.ts', '**/*.tsx'], exclude: ['node_modules'] }, null, 2) },
    { path: 'tailwind.config.js', content: "module.exports = { content: ['./app/**/*.{ts,tsx}'], theme: { extend: {} }, plugins: [] };\n" },
    { path: 'postcss.config.js', content: 'module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };\n' },
    { path: 'app/globals.css', content: '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n' },
    { path: 'app/layout.tsx', content: `import './globals.css';\n\nexport const metadata = { title: ${JSON.stringify(title)} };\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="id">\n      <body className="bg-slate-900 text-slate-100">{children}</body>\n    </html>\n  );\n}\n` },
    { path: 'app/page.tsx', content: `export default function Home() {\n  return (\n    <main className="min-h-screen flex flex-col items-start justify-center gap-4 p-8 max-w-3xl mx-auto">\n      <h1 className="text-3xl font-bold">${title.replace(/[`$\\]/g, '')}</h1>\n      <p className="max-w-xl text-slate-400">${prompt.slice(0, 160).replace(/[`$\\{}<>]/g, '')}</p>\n      <button className="rounded-md bg-slate-100 text-slate-950 px-5 py-2.5 text-sm font-semibold hover:bg-slate-200">Mulai Sekarang</button>\n    </main>\n  );\n}\n` },
    { path: 'lib/pocketbase.ts', content: "import PocketBase from 'pocketbase';\n\nexport const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL ?? 'http://127.0.0.1:8090');\n" },
    { path: '.env.example', content: 'NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090\n' },
    { path: 'README.md', content: `# ${title}\n\n> Dibuat dalam mode demo offline (tanpa GEMINI_API_KEY).\n\n${prompt}\n\n## Menjalankan\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n${skills.length ? `\n## Skills terpasang\n${skills.map((s) => `- ${s}`).join('\n')}\n` : ''}` },
    {
      path: 'preview.html',
      content: `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><script src="https://cdn.tailwindcss.com"></script></head><body class="bg-slate-950 text-slate-100 min-h-screen"><nav class="flex items-center justify-between px-6 py-4 border-b border-slate-800"><span class="font-bold text-slate-100 text-lg">${esc(title)}</span><div class="flex gap-6 text-sm text-slate-400"><a href="#">Ringkasan</a><a href="#">Data Inti</a><a href="#">Laporan</a></div></nav><main class="max-w-4xl mx-auto px-6 py-14 space-y-8"><header class="space-y-3"><p class="text-xs text-slate-400">Preview Sandbox · ${esc(name)}</p><h1 class="text-3xl font-bold tracking-tight">${esc(title)}</h1><p class="max-w-2xl text-slate-300 text-sm leading-relaxed">${esc(prompt.slice(0, 220))}</p><div class="pt-2"><button class="rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-950 px-4 py-2 text-sm font-semibold">Tambah Entri Baru</button></div></header><section class="grid sm:grid-cols-2 gap-4"><div class="rounded-sm border border-slate-800 bg-slate-900/70 p-4"><p class="text-xs text-slate-400">Modul Aktif</p><p class="mt-1 font-semibold">${skills.length ? esc(skills.join(', ')) : 'Standar MVP'}</p></div><div class="rounded-sm border border-slate-800 bg-slate-900/70 p-4"><p class="text-xs text-slate-400">Entitas Database</p><p class="mt-1 font-semibold">users, projects, items</p></div></section></main></body></html>`,
    },
  ];
}
