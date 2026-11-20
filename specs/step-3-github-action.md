# Step 3 · Gate + GitHub Action

**Goal.** Pass or fail is decided by code, never by the model's own verdict. Then the reviewer runs on every pull request in your QuickBlog fork, posts inline comments and turns the check red or green.
**Why.** A model can say "approve" while it lists a CRITICAL finding. The gate must be deterministic, and the workflow that holds your secrets must be safe against code from a pull request.

## Files you change
- `src/gate.ts`
- `examples/quick-blog-workflow.yml`

## What to write
**1. The gate.** `countBlockers(findings: Finding[], failOn: FailOn): number` returns how many findings have `RANK[severity] >= MIN_RANK[failOn]` (both tables are already in the file). It must not look at `verdict`. Posting the review (`toReviewPayload`, `postReview`) is already written.

| `failOn` | blocks on |
|---|---|
| `critical` | CRITICAL |
| `warning` | CRITICAL, WARNING |
| `any` | everything |
| `never` | nothing |

**2. The workflow.** `examples/quick-blog-workflow.yml` is the file you copy into your fork. Three `TODO`s are the security rules: add the `permissions:` block (`contents: read`, `pull-requests: write`), add the fork guard (`if:` the PR's head repo equals `github.repository`), and set `persist-credentials: false` on both checkouts. The four rules are listed in the file's header; rule 1 (`pull_request`, never `pull_request_target`) and rule 4 (PR text never inside `${{ }}` in `run:`) are already followed.

**3. Run it in your fork of QuickBlog.**
1. Fork `burnjohn/quick-blog`. **Untick "Copy the main branch only"**, or the analytics branch will not exist in your fork.
2. In the fork: **Actions** tab → enable workflows (forks start with Actions off).
3. In the fork: **Settings → Secrets and variables → Actions** → secret `OPENROUTER_API_KEY`.
4. Copy `examples/quick-blog-workflow.yml` to `.github/workflows/ai-review.yml` on the **main** branch of the fork (GitHub web UI: Add file → Create new file).
5. Open a pull request **inside your fork**: base `main`, compare = the analytics branch your instructor names (for the current PR it is `feat/analytics-dashboard-run2`). Make sure the base repository is **your fork**, not `burnjohn/quick-blog`.

## Acceptance criteria
1. WHEN `failOn` is `critical`, the reviewer SHALL count only CRITICAL findings; for `warning` and `any` it SHALL also count lower severities; for `never` it SHALL count zero. Check: `npm test -- gate`.
2. WHEN the workflow file is read, it SHALL follow the four security rules. Check: `npm test -- workflow`.
3. WHEN blockers exist, the reviewer SHALL exit with code 1 and print `Gate: FAIL`; otherwise `Gate: PASS` and `0`. Check: `npm run review:mock; echo $?` (after `npm run record` has produced answers).
4. WHEN the PR is opened in the fork, the workflow SHALL post one review with inline comments, and the check SHALL be red exactly when the log says `blockers: <n>` with n above 0. Check: the Actions tab and the PR "Files changed" tab.

## Done when
`npm test -- gate workflow` prints `9 passed`, and the full `npm test` shows `4 failed | 41 passed` (only step 4 is left). In your fork, the `AI code review` run finishes, the PR has an `AI Review` review with at least one inline comment on a changed line, and the check colour matches the `blockers:` line of the log.

## Prompt
```text
Read specs/step-3-github-action.md and implement countBlockers() in src/gate.ts. Do not change tests.
Then fix the three TODOs in examples/quick-blog-workflow.yml (permissions, fork guard, persist-credentials).
Run `npm test -- gate workflow` until all 9 tests are green.
Explain in two lines why the workflow uses `pull_request` and not `pull_request_target`.
Do not push anything.
```

## Start from
`git stash && git checkout step-2-context`

## Lost?
`git stash && git checkout step-3-gate-action`
