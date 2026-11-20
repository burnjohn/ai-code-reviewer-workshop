# Step 4 · More reviewers

**Goal.** Reviewers are configuration, not code: one Markdown file per agent, each with its own model and rules. A general, a security and a spec-conformance agent run together, and their duplicate findings are merged before the review is posted.
**Why.** The spec-only defects have no wrong line in the diff: something required is missing. A reviewer that reasons from the specification finds them, and a narrow security agent finds what a general one skims over. Three agents also report the same bug three times, so you need a merge step, and a per-agent cost line to see what each one is worth.

## Files you change
- `.reviewer/agents/security.md`
- `.reviewer/agents/spec-conformance.md`
- `src/dedup.ts`

## What to write
**1. Two agent files.** Start from the templates in `fixtures/agents/`. A file is frontmatter plus the system prompt; the file name (without `.md`) is the agent id:

```
---
name: Security reviewer
model: google/gemini-3.8-flash
fail_on: critical            # never | critical | warning | any
spec: docs/specs/analytics-dashboard-spec.md   # optional: a doc that goes into the context
---
<system prompt>
```

A good body has a narrow scope, a **negative list** (what not to report) and a cap on findings. The spec agent must check every `AC-x.y`, report broken ones as category `spec` with the AC id at the start of the title, and count missing code as a finding.

**2. `src/dedup.ts`.** Implement `dedupFindings(perAgent)`; the helpers above it (`titleSimilarity`, `sameProblem`) are written. Two findings are the same problem when they have the same file, overlapping line ranges and similar titles. A merged finding keeps the text and severity of the most severe report and lists every agent that reported it. The result is sorted by severity (high to low), then file, then `start_line`.

The runner already runs every file in `.reviewer/agents/` in parallel, honours `AGENTS=general,security`, and prints per-agent tokens and cost and the deduped total. `REVIEW_MODEL=<openrouter model id>` overrides every agent's model; a `model:` line sets it per agent.

## Acceptance criteria
1. WHEN findings from two agents point at the same file, overlapping lines and a similar title, the reviewer SHALL merge them, keep the highest severity and list both agents. Check: `npm test -- dedup`.
2. WHEN a file `<id>.md` is in `.reviewer/agents/`, the reviewer SHALL run it as an agent. Check: `npm run review:mock -- --dry-run` prints three rows: `general`, `security`, `spec-conformance`.
3. WHEN `AGENTS=security` is set, the reviewer SHALL run only that agent. Check: `AGENTS=security npm run review:mock -- --dry-run` prints one row.
4. WHEN the spec agent has a `spec:` line, the reviewer SHALL put that doc into the context. Check: the context log of `npm run review:mock -- --dry-run` lists `docs/specs/analytics-dashboard-spec.md`.
5. WHEN all agents finish, the reviewer SHALL print tokens and cost per agent and a deduped total. Check: `npm run review | grep -E "^■|Findings per agent"` prints three `■` lines and `Findings per agent: … → N after dedup`, where N is at most the sum of the per-agent counts.

## Done when
`npm test` prints `41 passed`. A run (`npm run review`, or `npm run review:mock` after `npm run record`) prints three `■` sections (`General reviewer`, `Security reviewer`, `Spec conformance`), each with `in / out` tokens and a cost, then `Findings per agent: … → N after dedup` and a `Total:` line with the summed cost.

## Prompt
```text
Read specs/step-4-more-reviewers.md. Copy fixtures/agents/security.md and fixtures/agents/spec-conformance.md
into .reviewer/agents/ and tighten one of them (a negative list, or a cap on findings).
Implement dedupFindings() in src/dedup.ts. Do not change tests or any other file in src/.
Run `npm test` until all 41 tests are green.
Run `npm run review:mock -- --dry-run` and show me the three agents and the context log.
```

## Start from
`git stash && git checkout step-3`

## Lost?
`git stash && git checkout step-4`
