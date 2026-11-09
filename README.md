# my-ai-factory

> **Autonomous AI Software Engineering Foundry & 2D Virtual Office**  
> An end-to-end multi-agent software engineering system that transforms user prompts and visual wireframes into structured specifications, formal architecture diagrams (.drawio & Mermaid), and production Next.js + PocketBase applications.

---

## 🌟 Key Features

1. **Autonomous Multi-Agent Pipeline:**
   - **Agent 5 (UI/UX Specialist & Stitch Integrator):** Design token extraction & UI design system.
   - **Intelligence & Risk Scout:** Architecture risk analysis, bottleneck detection, and 3-scale cloud infrastructure cost estimation.
   - **Agent 1 (Product Manager):** Structured BRD, PRD, and User Stories with Acceptance Criteria.
   - **Agent 4 (System Analyst):** UML Class, ERD, DFD Level 1, and System Architecture diagrams formatted for Mermaid.js and Draw.io XML.
   - **Agents 2 & 3 (Tech Stack & Security Architect):** OWASP Top 10 hardening, stack selection, and comprehensive QA testing plans.
   - **Agent Coder (Extended Context Compressor):** Full-directory code generation synchronized with the PRD and data model.

2. **2D Virtual Office Simulator (`/office`):**
   - Retro canvas office visualizing real-time agent states (typing, discussing, idle).
   - Multi-agent VPS connectivity (VPS Hermes `:8444`, 9Router `:8443`, Native).
   - Executive desk for CEO "Kiky", PM, Stitch, Scout, Analyst, Security, Coder, and Hermes.

3. **Built-in Craft & Capability Skills:**
   - `unslop-craft`: Strict 4px grid, graphite neutral ramps, clean micro-interactions, no AI slop gradients.
   - `security-hardening`: CSP, HSTS, rate limiting, and threat modeling.
   - `payment-gateway`: Midtrans / Stripe checkout & webhook signatures.
   - `auth`: PocketBase authentication and session guards.
   - `testing`: Vitest + React Testing Library integration.

4. **Production CI/CD to VPS (`.github/workflows/deploy-vps.yml`):**
   - Automated testing and production bundling on `git push main`.
   - Atomic zero-downtime deployment to VPS over SSH.
   - Automatic snapshot backup and instant rollback on failure.
   - Managed via PM2 (`ecosystem.config.cjs`) with automatic process reloading.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ (Node 22 recommended)
- Google Gemini API Key (`GEMINI_API_KEY`)

### Installation

```bash
git clone https://github.com/rizkyaryendigumilang/my-ai-factory.git
cd my-ai-factory
npm install
```

### Environment Configuration

Create `.env.local`:

```env
GEMINI_API_KEY="your-google-ai-studio-api-key"
GEMINI_MODEL="gemini-3.5-flash"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) for the factory dashboard and [http://localhost:3000/office](http://localhost:3000/office) for the Virtual Office.

### Run Automated Tests

```bash
npm test
```

---

## 🚢 VPS Deployment Setup

Add the following GitHub Repository Secrets:

- `VPS_HOST`: IP address of your VPS (e.g. `43.156.236.102`)
- `VPS_USERNAME`: SSH username (e.g. `ubuntu` or `root`)
- `VPS_SSH_KEY`: Private SSH Key (ed25519)
- `VPS_SSH_PORT`: SSH Port (default: 22 / 2222)

Push to `main` to trigger the automated CI/CD pipeline.

### Production Ports & Proxy Architecture
- **Internal PM2 Node Process:** Port `3005` (ecosystem.config.cjs)
- **Public Reverse Proxy:** Caddy HTTPS on Port `8450` (`https://<VPS_HOST>:8450`) with auto-TLS to prevent port collisions with other VPS services.
