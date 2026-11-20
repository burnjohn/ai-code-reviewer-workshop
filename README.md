# Build your own AI code reviewer

Hands-on workshop, GDG DevFest Warsaw 2026 · 45 minutes.

You build a reviewer that runs as a GitHub Action, reads the repository (not only the diff), calls a model through OpenRouter, gets **structured** findings back, drops findings that cite lines outside the diff, runs several specialised agents, and decides pass/fail **in code**. A human still merges.

The review target is a real public repo, [`burnjohn/quick-blog`](https://github.com/burnjohn/quick-blog): an analytics-dashboard pull request with planted defects, some of which are visible only against its spec.

```
PR + repo ─► context ─► prompt ─► OpenRouter (json_schema) ─► grounding ─► dedup ─► gate ─► inline review
```

## Setup (5 min)

1. **Use this template → Create a new repository.** Tick **Include all branches** (you need the `step-N` checkpoints). Keep it **public**: your workflow checks it out without a token.
2. Open a Codespace on `main` (or locally: Node 22).
3. Create `.env` from the example and add your OpenRouter key (`.env` is gitignored):

```bash
cp .env.example .env      # then set OPENROUTER_API_KEY=sk-or-...
npm ci
npm test                  # red by design: 29 failed | 12 passed
npm run review:mock       # offline: recorded PR + recorded model answers
npm run review            # real: fetches the PR from GitHub, calls OpenRouter
```

`REVIEW_PR` in `.env` is the default PR (`burnjohn/quick-blog#34`); `--pr owner/repo#N` overrides it. Without a `GITHUB_TOKEN` the GitHub API allows 60 requests per hour per IP, which a room on one Wi-Fi shares; set `GITHUB_TOKEN` in `.env` (a Codespace already has one), or use `npm run review:mock`.

## Steps

Each step has a spec in [`specs/`](specs/README.md) with a prompt for your coding agent. Steps are cumulative: step N starts from the solution of step N-1.

| Step | You change | Spec |
|---|---|---|
| 1 · Findings you can trust | `src/schema.ts`, `src/prompt.ts`, `src/grounding.ts` | [step-1](specs/step-1-findings.md) |
| 2 · Repository context | `src/context.ts` | [step-2](specs/step-2-context.md) |
| 3 · Gate + GitHub Action | `src/gate.ts`, `examples/quick-blog-workflow.yml` | [step-3](specs/step-3-github-action.md) |
| 4 · More reviewers | `.reviewer/agents/*.md`, `src/dedup.ts` | [step-4](specs/step-4-more-reviewers.md) |

Lost? `git stash && git checkout step-N` jumps to the solution of step N.

## Step 3: run it on QuickBlog in your fork

1. Fork `burnjohn/quick-blog`. **Untick "Copy the main branch only"**, otherwise the analytics branch is not copied.
2. In the fork, **Actions** tab: enable workflows. Forks start with Actions off.
3. In the fork, **Settings → Secrets and variables → Actions**: add `OPENROUTER_API_KEY`.
4. Copy `examples/quick-blog-workflow.yml` to `.github/workflows/ai-review.yml` on the fork's `main`.
5. Open a pull request inside your fork: base `main`, compare = the analytics branch. Inline comments and a red check appear within a couple of minutes.

## Environment variables

| Name | Meaning |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter key |
| `REVIEW_PR` | default PR, `owner/repo#N` |
| `GITHUB_TOKEN` | optional locally (rate limit); required in CI |
| `REVIEW_MODEL` | overrides the `model:` of every agent |
| `AGENTS=general,security` | run only these agents |
| `CONTEXT_BUDGET` | context size in characters (default 60000) |
| `REVIEW_MOCK=1` | no network: recorded PR and answers from `fixtures/quick-blog/` |

CLI flags: `--pr`, `--repo-dir <dir>`, `--no-context`, `--dry-run` (print prompt sizes, call no model), `--ci`, `-v`.

## Maintainer: recording the offline fixtures

`npm run record` stores the PR snapshot (`fixtures/quick-blog/pr.json`, `diff.patch`, `repo/`) and one real model answer per agent, with and without context (`fixtures/quick-blog/answers/`). It needs `OPENROUTER_API_KEY`, and the `final` branch. `npm run record -- --snapshot-only` needs no key. Mock mode fails with "run npm run record first" until the answers exist.

## Stretch (at home)

Branch `stretch/mcp` exposes the reviewer as an MCP tool, `review_working_copy`, for your coding agent: `claude mcp add ai-reviewer -- npx tsx mcp/server.ts`.

Core extracted and simplified from [DevDigest](https://github.com/ai-agentic-engineering-neo/dev-digest). MIT.
