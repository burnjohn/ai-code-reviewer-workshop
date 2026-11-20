# Step 2 · Repository context

**Goal.** The reviewer sees more than the diff: project rules, the spec, the full files the PR changes, and callers of what it touches, within a fixed budget.
**Why.** A diff cannot show a missing check, a broken project rule or a broken caller. The model can only reason about what is in its prompt.

## Files
- `src/context.ts`

## What to write
- `extractLinkedDocs(body)`: up to 5 unique `.md` paths containing `/` from the PR body; a `/blob/<ref>/` URL becomes a repo path, other URLs, `node_modules/` and `../` are ignored.
- `extractSymbols(rawDiff)`: names changed in files that already existed, not in new files or `DATA_PATH` files: added `function x`, `const x = () =>`, `class x`, `def x`, plus the name after the second `@@`. 4+ chars, unique, max 12.
- `findCallers(symbols, files, maxHits)`: whole-word grep, max 20 hits, 5 per symbol, text = trimmed line (160 chars).
- `assembleContext(candidates, budget)`: priority rules > spec > file > callers; cut to `maxChars`, then to what is left; under `MIN_USEFUL` → skipped; every block via `wrapUntrusted`; one log line each and a final `context: …` line.
- `gatherContext(source, opts)`: rules files, linked + touched `docs/**/*.md` + `extraDocs`, modified code files (smallest first), callers outside the diff.

## Acceptance
1. WHEN the PR body links a doc, or the diff touches `docs/**/*.md`, the reviewer SHALL add it as a spec block.
2. WHEN the diff changes a function, the reviewer SHALL list its usages outside the diff and skip `node_modules`.
3. WHEN the total exceeds the budget, the reviewer SHALL cut or skip the lowest-priority blocks and log it.
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
Implement in src/context.ts, replacing the TODOs (types, constants, changedFiles are given):
1. extractLinkedDocs(body): up to MAX_LINKED_DOCS unique repo paths ending in .md that contain a "/". A URL with
   /blob/<ref>/<path>.md gives <path>; other URLs, node_modules/ and ../ are ignored; strip a leading ./; keep order.
2. extractSymbols(rawDiff): in files that already existed (skip "new file mode" and DATA_PATH files) take names from added
   lines (function x, const x = (...) =>, const x = async y =>, class x, def x) and from the text after the second @@
   of a hunk header. Keep names of 4+ chars, unique, not in `stop`, at most MAX_SYMBOLS.
3. findCallers(symbols, files, maxHits): whole-word match per line (not inside a longer identifier); one Hit per line and
   symbol; at most maxHits overall and 5 per symbol; text = trimmed line, 160 chars.
4. assembleContext(candidates, budget): sort by PRIORITY (rules, spec, file, callers). room = min(maxChars, budget - used);
   room < MIN_USEFUL -> skipped, logged "✗ … skipped (budget exhausted)". Longer text is cut to room - TRUNCATED.length plus
   TRUNCATED. Block = `### ${HEADING[kind]}: ${label}\n${wrapUntrusted(`${kind}:${label}`, text)}`. Log ✓ / ~ (cut from N) / ✗
   per candidate and a final "context: N block(s), X / BUDGET chars (~T tokens)" line. Return { blocks, log, chars, budget }.
5. gatherContext(source, opts): candidates from RULES_FILES; specs (extractLinkedDocs(prBody) + changed docs/**/*.md that are not
   deleted + extraDocs, max MAX_LINKED_DOCS + 2, maxChars MAX_DOC_CHARS); modified files (not new, not deleted, CODE_EXT, not
   NOT_REVIEWABLE or DATA_PATH), smallest first, maxChars MAX_FILE_CHARS; callers of extractSymbols in source.list() files not
   in the diff (up to source.scanLimit, nearest directories first), one block, maxChars 4000. Use mapLimit for reads.
Constraints: do not change tests, src/source.ts or src/index.ts.
Verify: run `npm test -- context` until 16 passed. Then run `npm run review:mock -- --dry-run` and show me the context log
(what went in, sizes, what was cut or skipped), and run it again with --no-context and tell me how much smaller the prompt is.
```

## Start from
`git stash && git checkout step-1-findings`

## Lost?
`git stash && git checkout step-2-context`
