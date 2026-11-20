# Step 3 · Gate + GitHub Action

**Goal.** Pass or fail is decided by code, and the reviewer runs on every PR in your QuickBlog fork with inline comments and a red or green check.
**Why.** A model can say "approve" while listing a CRITICAL finding. And the workflow that holds your secrets must be safe against code from a pull request.

## Files
- `src/gate.ts`
- `examples/quick-blog-workflow.yml`

## What to write
- `countBlockers(findings, failOn)`: count findings with `RANK[severity] >= MIN_RANK[failOn]` (tables are in the file). Never read `verdict`. `critical` → CRITICAL; `warning` → +WARNING; `any` → all; `never` → 0.
- Workflow, three TODOs: top-level `permissions:` with `contents: read` and `pull-requests: write`; fork guard `if: github.event.pull_request.head.repo.full_name == github.repository` on the job; `persist-credentials: false` on both checkouts.
- Keep: trigger `pull_request` (never `pull_request_target`), and no PR text inside `${{ }}` in `run:`.

## Acceptance
1. WHEN `failOn` is `critical`, the reviewer SHALL count only CRITICAL; for `warning` and `any` it SHALL count lower severities too; for `never`, zero.
2. WHEN the workflow file is read, it SHALL follow the four security rules in its header.
3. WHEN blockers exist, the reviewer SHALL print `Gate: FAIL` and exit 1.
4. WHEN the PR is opened in your fork, the workflow SHALL post one review with inline comments, red exactly when `blockers` > 0.

## Done when
`npm test -- gate workflow` → `9 passed` (full `npm test`: `4 failed | 41 passed`, step 4).

## Steps
1. `git stash && git checkout step-2-context`
2. Paste the prompt into your coding agent, then `npm test -- gate workflow`.
3. Fork `burnjohn/quick-blog` (untick "Copy the main branch only"); in the fork enable Actions and add secret `OPENROUTER_API_KEY`.
4. Copy the workflow to `.github/workflows/ai-review.yml` on the fork's `main` (you push, not the agent).
5. Open a PR in your fork: base `main`, compare = the analytics branch. Check the Actions tab and "Files changed".

## Prompt
```text
Step 3 · Gate + GitHub Action. Spec: specs/step-3-github-action.md (read it first).
Implement in src/gate.ts and examples/quick-blog-workflow.yml:
1. gate.ts: countBlockers(findings, failOn) returns how many findings have RANK[f.severity] >= MIN_RANK[failOn]
   (both tables exist). Do not look at the model's verdict. Remove the void/return 0 placeholder and its TODO.
2. quick-blog-workflow.yml, replace the three TODO comments: (a) a top-level block
   `permissions:` with `contents: read` and `pull-requests: write`; (b) on the review job
   `if: github.event.pull_request.head.repo.full_name == github.repository`; (c) `persist-credentials: false` in the `with:`
   of BOTH actions/checkout steps.
   Keep `on: pull_request` (never pull_request_target) and keep PR text out of `run:` lines.
Constraints: do not change tests or any other file. Do not push, commit or touch any remote.
Verify: run `npm test -- gate workflow` until 9 passed. Then explain in two lines why the workflow uses pull_request and
not pull_request_target, and show me the final workflow file.
```

## Start from
`git stash && git checkout step-2-context`

## Lost?
`git stash && git checkout step-3-gate-action`
