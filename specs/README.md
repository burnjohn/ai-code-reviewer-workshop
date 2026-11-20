# Specs

Each step has one spec: goal, files, what to write, acceptance criteria with a check command, a prompt for your coding agent, and how to start or recover.

| Step | Spec | Start from | Checkpoint (solution) |
|---|---|---|---|
| 1 · Findings you can trust | [step-1-findings.md](step-1-findings.md) | `main` | `step-1` |
| 2 · Repository context | [step-2-context.md](step-2-context.md) | `step-1` | `step-2` |
| 3 · Gate + GitHub Action | [step-3-github-action.md](step-3-github-action.md) | `step-2` | `step-3` |
| 4 · More reviewers | [step-4-more-reviewers.md](step-4-more-reviewers.md) | `step-3` | `step-4` |

`npm test` is red on `main` by design: 29 failed | 12 passed. Each step turns its own tests green: after step 1 `23 failed`, after step 2 `10 failed`, after step 3 `4 failed`, after step 4 all 41 pass.
