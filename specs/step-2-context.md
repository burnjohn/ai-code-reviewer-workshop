# Step 2 · Repository context

**Goal.** The reviewer sees more than the diff: the project's own rules, the spec the PR is built from, the full files it changes, and who calls the functions it touches. All of it fits a fixed budget, in a fixed priority order, and the log says exactly what went in.
**Why.** A diff cannot show a missing check, a violated project rule or a broken caller. The model can only reason about what is in its prompt, so context decides which defects are even visible.

## Files you change
- `src/context.ts`

## What to write
`src/context.ts` already has the types, constants and `changedFiles()`. Replace the `TODO`s:

| Function | Does |
|---|---|
| `extractLinkedDocs(body)` | up to 5 unique repo paths ending in `.md` (with a `/`) mentioned in the PR body; a `/blob/<ref>/` URL becomes a repo path; other URLs, `node_modules/`, `../` ignored |
| `extractSymbols(rawDiff)` | names of functions or components the diff changes in files that already existed (added `function x`, `const x = () =>`, `class x`, `def x`, and the enclosing name in the `@@` header); 4+ characters, unique, max 12 |
| `findCallers(symbols, files, maxHits)` | whole-word grep: one `Hit` per matching line; max 20 hits overall, 5 per symbol |
| `assembleContext(candidates, budget)` | priority **rules > specs > full files > callers**; each block is cut to its own cap, then to what is left; under 300 chars of room → skipped; every block goes through `wrapUntrusted()`; one log line per block and a final `context: N block(s), X / BUDGET chars` line |
| `gatherContext(source, opts)` | builds the candidates from a `RepoSource`: **(a)** `CLAUDE.md`, `AGENTS.md`, `README.md` if present; **(b)** docs linked from the PR body, plus `docs/**/*.md` the PR touches, plus `opts.extraDocs`; **(c)** head version of files the PR **modifies** (a new file is already complete in the diff); **(d)** callers of the changed symbols in files the diff does not touch |

The source is one interface with two implementations, already written in `src/source.ts`: a local directory (`--repo-dir`, the CI checkout, or the recorded fixture) and the GitHub API at the PR head commit (`--pr owner/repo#N`; it uses `GITHUB_TOKEN` if set). `--no-context` and `--dry-run` are already wired in `src/index.ts`.

## Acceptance criteria
1. WHEN the PR body links a doc, or the diff touches a `docs/**/*.md`, the reviewer SHALL include it as a specification block. Check: `npm test -- context`.
2. WHEN the diff changes a function, the reviewer SHALL list its usages outside the diff and SHALL skip `node_modules`. Check: `npm test -- context`.
3. WHEN the total exceeds the budget, the reviewer SHALL skip or cut the lowest-priority blocks and say so in the log. Check: `CONTEXT_BUDGET=20000 npm run review:mock -- --dry-run` prints at least one line with `skipped` or `cut from`.
4. WHEN the context is built, every block SHALL be wrapped as untrusted data. Check: `npm test -- context` (the "wraps every block" test).
5. WHEN the reviewer runs, it SHALL log which blocks were included and their sizes. Check: `npm run review:mock -- --dry-run` lists `CLAUDE.md` and `docs/specs/analytics-dashboard-spec.md`.
6. WHEN `--no-context` is passed, the reviewer SHALL print `Context: off` and a smaller prompt. Check: `npm run review:mock -- --dry-run --no-context`, then compare the token count with the run above.

## Done when
`npm test -- context` prints `16 passed`. `npm run review:mock -- --dry-run` prints a context log that lists `CLAUDE.md` and `docs/specs/analytics-dashboard-spec.md`, ends with a `context: N block(s), X / 60,000 chars` line, and then prints a prompt size per agent. The same command with `--no-context` prints a smaller prompt. The full `npm test` shows `10 failed | 31 passed`: those are steps 3 and 4.

## Prompt
```text
Read specs/step-2-context.md and implement it in src/context.ts. Do not change tests, src/source.ts or src/index.ts.
Run `npm test -- context` until it is green.
Run `npm run review:mock -- --dry-run` and show me the context log: which blocks went in, how big, and which were cut or skipped.
Run it again with `--no-context` and tell me how much smaller the prompt is.
```

## Start from
`git stash && git checkout step-1`

## Lost?
`git stash && git checkout step-2`
