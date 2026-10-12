# Dan Flashes

> Complicated shirts. Complicated prices.

An e-commerce storefront for Dan Flashes, where every shirt is vibrant and the price goes up with the complexity of its pattern. Built with spec-driven development using [GitHub Spec Kit](https://github.com/github/spec-kit).

## How this repo is organized

| Path | What it is |
| --- | --- |
| `.specify/memory/constitution.md` | The project's governing principles. Every spec and plan is checked against it. |
| `specs/NNN-feature-name/` | One folder per feature: `spec.md` (what & why), `plan.md` (how), `research.md`, `tasks.md` |
| `.specify/templates/` | Spec Kit templates for specs, plans, tasks, and checklists |
| `.claude/skills/speckit-*` | The `/speckit-*` skills Claude Code uses to run the workflow |

## Workflow

```text
/speckit-constitution  → once per project
/speckit-specify       → per feature: what & why, no tech
/speckit-clarify       → optional: de-risk ambiguity before planning
/speckit-plan          → tech stack, architecture, data model
/speckit-checklist     → optional: "unit tests for English"
/speckit-tasks         → ordered, dependency-aware task list
/speckit-analyze       → optional: cross-artifact consistency check
/speckit-implement     → build it
/speckit-converge      → repeat implement → converge until Converged
```
