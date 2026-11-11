# Issue Tracker Configuration

## Active Tracker
- **Type:** GitHub Issues
- **Repository:** `https://github.com/rizkyaryendigumilang/my-ai-factory`
- **CLI Tool:** `gh` (GitHub CLI)
- **External PRs as triage queue:** Disabled (off)

## Workflow
1. Issues are created via `gh issue create --title "<Title>" --body "<Description>" --label "<Labels>"`.
2. Triage agents classify incoming issues using the 5 canonical labels defined in `docs/agents/triage-labels.md`.
3. Tasks requiring implementation are handed off to Kiky's AI Factory subagents following `AGENTS.md` rules.
