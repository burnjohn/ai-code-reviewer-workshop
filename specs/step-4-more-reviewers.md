# Step 4 · More reviewers

**Goal.** Three agents (general, security, spec-conformance) run together, and their duplicate findings are merged before the review is posted.
**Why.** Spec-only defects have no wrong line in the diff: something required is missing. A reviewer that reasons from the spec finds them. Three agents also report one bug three times, so you need a merge step and a cost line per agent.

## Files
- `.reviewer/agents/security.md`
- `.reviewer/agents/spec-conformance.md`
- `src/dedup.ts`

## What to write
- Agent file = frontmatter (`name`, `model`, `fail_on`, optional `spec:`) + system prompt; the file name is the agent id. Start from `fixtures/agents/`. Body: narrow scope, a negative list, a cap on findings. The spec agent has `spec: docs/specs/analytics-dashboard-spec.md`, checks every `AC-x.y`, reports broken ones as category `spec` with the AC id first in the title, and counts missing code.
- `dedupFindings(perAgent)`: same problem = same `file`, overlapping ranges, and `sameProblem()` true (helpers given). A merged finding keeps the text and severity of the most severe report and lists every agent once. Sort by severity, then file, then `start_line`.
- Already wired: parallel run, `AGENTS=…` filter, `REVIEW_MODEL`, per-agent tokens and cost.

## Acceptance
1. WHEN two agents report the same file, overlapping lines and a similar title, the reviewer SHALL merge them, keep the highest severity and list both agents.
2. WHEN a file `<id>.md` is in `.reviewer/agents/`, the reviewer SHALL run it as an agent.
3. WHEN the spec agent has a `spec:` line, the reviewer SHALL put that doc into the context.
4. WHEN all agents finish, the reviewer SHALL print tokens and cost per agent and a deduped total.

## Done when
`npm test` → `45 passed`.

## Steps
1. `git stash && git checkout step-3-gate-action`
2. Paste the prompt into your coding agent.
3. `npm test`
4. `npm run review:mock -- --dry-run`: three agents, and the spec in the context log.
5. `npm run review` (or `npm run ui`): three `■` sections with cost, then `Findings per agent: … → N after dedup`.

## Prompt
```text
Step 4 · More reviewers. Spec: specs/step-4-more-reviewers.md (read it first).
Implement:
1. Copy fixtures/agents/security.md and fixtures/agents/spec-conformance.md to .reviewer/agents/ (same file names).
   Tighten security.md: keep its narrow scope and negative list, add a cap of 5 findings, worst first, and ask for the
   attacker input. Keep spec-conformance.md's `spec: docs/specs/analytics-dashboard-spec.md` line, its AC-id-first title
   rule and "missing code counts"; add a negative list (style, requirements the PR does not touch).
2. src/dedup.ts: implement dedupFindings(perAgent). Walk agents in order; for each finding find an already merged one with
   sameProblem(merged, finding) (it checks file, overlapping ranges, title similarity). No match: push { ...finding,
   agents: [agent] }. Match: add the agent if not listed; if the new severity is higher by RANK, copy the new finding over
   the merged one but keep the agents list. Return the list sorted by RANK desc, then file, then start_line.
Constraints: do not change tests or any other file in src/.
Verify: run `npm test` until 45 passed. Then run `npm run review:mock -- --dry-run` and show me the three agents and the
context log lines for the spec.
```

## Start from
`git stash && git checkout step-3-gate-action`

## Lost?
`git stash && git checkout step-4-more-reviewers`
