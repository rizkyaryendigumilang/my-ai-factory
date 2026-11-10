---
name: kiky-factory-orchestrator
description: Coordinate and orchestrate Kiky's AI Software Factory inside Antigravity, running each specialist engineer (PM, UX, Architect, Security, Coder, QA, DevOps) in an isolated conversation context with human-in-the-loop approval gates controlled by Kiky.
---

# Kiky Factory Orchestrator

This skill guides the primary Antigravity agent in orchestrating multi-agent software engineering workflows where every engineer works in a dedicated conversation context to eliminate context contamination, strictly controlled by Kiky (Lead Architect).

## Roles & Subagent Types

1. **`pm_spec`**: Elicits requirements, writes PRD, BRD, user stories, acceptance criteria (`docs/factory/01-spec/`).
2. **`ux_ui_designer`**: Creates Apple-grade UI design tokens, responsive layouts, motion springs, anti-slop guidelines (`docs/factory/02-design/`).
3. **`system_analyst`**: Produces ERD (Mermaid/Draw.io), DFD Level 1, Class diagrams, API contracts (`docs/factory/03-architecture/`).
4. **`security_auditor`**: Conducts OWASP reviews, threat models, secret isolation checks (`docs/factory/04-security/`).
5. **`fullstack_engineer`**: Writes Next.js 15, TypeScript, React 19, and Tailwind code (`app/`, `components/`, `lib/`).
6. **`qa_engineer`**: Implements automated test suites (`tests/`), validates edge cases, provides pass/fail evidence (`docs/factory/05-qa/`).
7. **`devops_sentry`**: Manages CI/CD workflows, VPS health (PM2 :3005, Caddy :8450, Open WebUI :8080), rollback procedures (`docs/factory/06-devops/`).

---

## Standard Execution Procedure

### Step 1: Ingest Directive from Kiky
When Kiky provides a task or feature request (e.g., "Bangun fitur X" or "Tambahkan modul Y"):
- Clarify any ambiguities immediately with Kiky.
- Outline the multi-agent pipeline plan.

### Step 2: Dispatch to Isolated Subagent
Invoke the appropriate specialist using `invoke_subagent`:
- `TypeName`: `<subagent_name>`
- `Role`: Specific role title
- `Prompt`: Comprehensive brief with references to preceding artifacts in `docs/factory/`.
- `Workspace`: `inherit` (sharing the same project repository).

### Step 3: Present to Kiky at the Approval Gate
When the subagent completes its work and sends a message back:
- Summarize the subagent's deliverables and key design choices.
- Point to the generated artifact in `docs/factory/`.
- Ask Kiky for approval:
  - **Option A:** Approve and proceed to next specialist.
  - **Option B:** Request revisions (send message back to the subagent).
  - **Option C:** Adjust direction.

### Step 4: Progression to Implementation & Quality
Only when all specifications (PM -> UX -> System -> Security) are greenlit by Kiky:
1. Dispatch to `fullstack_engineer` to write the code.
2. Verify build compilation (`npm run build`).
3. Dispatch to `qa_engineer` to write and execute tests (`npm test`).
4. Only with 100% test pass evidence and Kiky's approval, dispatch to `devops_sentry` for deployment.
