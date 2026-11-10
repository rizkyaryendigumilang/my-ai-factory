# Kiky's AI Factory - Shared Engineering Artifacts

This directory contains verified artifacts produced by each specialized AI engineer subagent operating in isolated conversation contexts within Antigravity, governed by Kiky.

## Directory Structure

```text
docs/factory/
├── 01-spec/           # PRD, BRD, User Stories, Acceptance Criteria (@pm_spec)
├── 02-design/         # Apple HIG Design Tokens, Layouts, Motion Physics (@ux_ui_designer)
├── 03-architecture/   # Mermaid ERD, Draw.io Schemas, DFD, API Contracts (@system_analyst)
├── 04-security/       # OWASP Top 10 Hardening, Secret Audits, CSP/CORS Headers (@security_auditor)
├── 05-qa/             # Test Plans, Verification Runs, Break-UI Reports (@qa_engineer)
└── 06-devops/         # Deployment Manifests, VPS Port Telemetry, PM2 Logs (@devops_sentry)
```

## Governance Protocol

1. **Artifact Immutability:** Once an artifact is approved by Kiky, it serves as the single source of truth for downstream engineers.
2. **Context Independence:** Each engineer reads approved artifacts from this folder without needing to be polluted by the conversational chat history of prior engineers.
3. **Approval Required:** Any change to an existing artifact requires re-approval from Kiky.
