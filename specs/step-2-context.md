# Step 2 · Repository context

**Goal.** The reviewer sees more than the diff: project rules, the spec, the full files the PR changes, and callers of what it touches, within a fixed budget.
**Why.** A diff cannot show a missing check, a broken project rule or a broken caller. The model can only reason about what is in its prompt.

## Files
- `src/context.ts`

## What to write
- `extractLinkedDocs(body)`: up to 5 unique `.md` paths with a `/` from the PR body; `/blob/<ref>/` URLs become repo paths.
- `extractSymbols(rawDiff)`: skip new files and `DATA_PATH` files; names from added lines (`function x`, `const x = () =>`, `class x`, `def x`) and from the text after the second `@@` of a hunk header; 4+ chars, unique, not in `STOP_SYMBOLS` (given), max 12.
- `findCallers(symbols, files, maxHits)`: whole-word grep, max 20 hits, 5 per symbol.
- `assembleContext(candidates, budget)`: priority rules > spec > file > callers; cut to the block's cap, then to the room left; room under `MIN_USEFUL` → skipped; `wrapUntrusted` on every block; one log line each.
- `gatherContext(source, opts)`: rules files, linked and touched docs, modified code files (smallest first), callers outside the diff.

## Acceptance
1. WHEN the PR body links a doc, or the diff touches `docs/**/*.md`, the reviewer SHALL add it as a spec block.
2. WHEN the diff changes a function, the reviewer SHALL list its usages outside the diff and skip `node_modules`.
3. WHEN the total exceeds the budget, the reviewer SHALL cut a block to the room left, or skip it when the room is under `MIN_USEFUL`, in priority order, and log it.
4. WHEN blocks are built, every one SHALL be wrapped as untrusted data.

## Done when
`npm test -- context` → `16 passed` (full `npm test`: `10 failed | 35 passed`, steps 3–4).

## Steps
1. `git stash && git checkout step-1-findings`
2. Paste the prompt into your coding agent.
3. `npm test -- context`
4. `npm run review:mock -- --dry-run`: the log lists `CLAUDE.md` and `docs/specs/analytics-dashboard-spec.md`, then `context: N block(s), X / 60,000 chars`.
5. Add `--no-context` and compare the prompt size (or use `npm run ui`).

## Prompt
```text
Step 2 · Repository context. Spec: specs/step-2-context.md (read it first).
Implement in src/context.ts, replacing the TODOs (types, constants, changedFiles, mapLimit are given):
1. extractLinkedDocs(body): up to MAX_LINKED_DOCS unique paths ending in .md that contain "/". A /blob/<ref>/<path>.md URL
   gives <path>; other URLs, node_modules/ and ../ are ignored; strip a leading ./; keep order.
2. extractSymbols(rawDiff): skip new files and DATA_PATH files; take names from added lines (function x, const x = (...) =>,
   class x, def x) and from the text after the second @@. 4+ chars, unique, not in STOP_SYMBOLS (given), max MAX_SYMBOLS.
3. findCallers(symbols, files, maxHits): whole-word match per line; max maxHits overall, 5 per symbol; text = trimmed line, 160 chars.
4. assembleContext(candidates, budget): sort by PRIORITY; room = min(maxChars, budget - used); room < MIN_USEFUL -> log
   "✗ … skipped (budget exhausted)"; longer text is cut to fit room with TRUNCATED appended; block =
   `### ${HEADING[kind]}: ${label}
${wrapUntrusted(`${kind}:${label}`, text)}`; log ✓ / ~ (cut from N) / ✗ per candidate and a
   final "context: N block(s), X / BUDGET chars (~T tokens)". Return { blocks, log, chars, budget }.
5. gatherContext(source, opts): RULES_FILES; docs (linked + changed docs/**/*.md + extraDocs, max MAX_LINKED_DOCS + 2, MAX_DOC_CHARS);
   modified code files (CODE_EXT, not NOT_REVIEWABLE/DATA_PATH), smallest first, MAX_FILE_CHARS; callers of the symbols in
   source.list() files outside the diff (up to source.scanLimit), one block, maxChars 4000.
Constraints: do not change tests, src/source.ts or src/index.ts.
Verify: run `npm test -- context` until 16 passed. Then run `npm run review:mock -- --dry-run` and show me the context log, and
again with --no-context and how much smaller the prompt is.
```

## Start from
`git stash && git checkout step-1-findings`

## Lost?
`git stash && git checkout step-2-context`
