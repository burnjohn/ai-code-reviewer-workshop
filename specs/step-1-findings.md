# Step 1 · Findings you can trust

**Goal.** The model's answer is a typed object (not prose), the prompt has three mandatory blocks, and every finding is checked against the diff before anyone sees it. A finding that cites a file or lines outside the diff is dropped, with a reason.
**Why.** The schema is the contract between model and code, and models hallucinate locations. A comment on a line that is not in the diff cannot even be posted, and a wrong comment costs reviewer trust.

## Files you change
- `src/schema.ts`
- `src/prompt.ts`
- `src/grounding.ts`

## What to write
**1. `src/schema.ts`.** `FindingSchema` (zod) gets five new fields after `end_line`:

| Field | Type | Notes |
|---|---|---|
| `severity` | `Severity` (`CRITICAL` \| `WARNING` \| `SUGGESTION`) | the gate in step 3 counts on it |
| `category` | enum `security`, `correctness`, `performance`, `spec`, `maintainability` | |
| `title` | `string` | one short sentence, no file names |
| `rationale` | `string` | why it is a problem, citing the code |
| `suggestion` | `string` | concrete fix, `''` if none |

Use `.describe()` on the strings: it is sent to the model as part of the schema. Replace the temporary `Finding` and `Review` types with `z.infer<...>` of their schemas.

**2. `src/prompt.ts`.** Replace the three `TODO` blocks with real text (keep the headings):
- `SEVERITY_RUBRIC`: one concrete line per level (CRITICAL, WARNING, SUGGESTION).
- `VERDICT_SEMANTICS`: `request_changes` = at least one CRITICAL, `comment` = only WARNING/SUGGESTION, `approve` = no findings.
- `FINDINGS_DISCIPLINE`: only added or changed lines, cite NEW-side line numbers as printed, one finding per root cause, zero findings is a valid answer.

Do not touch `INJECTION_GUARD` or `wrapUntrusted`.

**3. `src/grounding.ts`.** Implement the body of `groundFindings(findings, diff): { kept, dropped }` (`buildLineIndex` already exists above it). For each finding, in order:
1. `lines = buildLineIndex(diff).get(f.file)`. If missing: drop with reason `file '<path>' is not in the diff`.
2. `lo`/`hi` = min/max of `start_line` and `end_line` (models sometimes swap them). If no line in `lo..hi` is in `lines`: drop with reason `lines <lo>-<hi> do not touch any hunk in '<path>'`.
3. Otherwise keep it.

## Acceptance criteria
1. WHEN a finding has a category outside the five values or no severity, the schema SHALL reject it. Check: `npm test -- schema`.
2. WHEN a finding's file is not in the diff, or its lines are outside every hunk, the reviewer SHALL drop it with the exact reason above. Check: `npm test -- grounding`.
3. WHEN a range partly overlaps a hunk, or `start_line` is greater than `end_line`, the reviewer SHALL keep it. Check: `npm test -- grounding`.
4. WHEN the prompt is built, it SHALL contain no placeholder text and keep the injection guard. Check: `grep -n TODO src/schema.ts src/prompt.ts src/grounding.ts` prints nothing, and `grep -c INJECTION_GUARD src/prompt.ts` prints `2` or more.
5. WHEN the reviewer runs, it SHALL print each kept finding as severity, `file:line` and title, and each dropped one as a `DROPPED` line that ends with its reason. Check: `npm run review:mock` (or `npm run review`) shows no `undefined`.

## Done when
`npm test -- schema grounding` prints `10 passed`, and `npm run review:mock` prints at least one finding line (`CRITICAL`, `WARNING` or `SUGGEST`, then `file:line`, then a title) with no `undefined` anywhere. Any `DROPPED` line ends with `is not in the diff` or `do not touch any hunk in '<path>'`. The full `npm test` still shows `23 failed | 18 passed`: those are steps 2, 3 and 4.

## Prompt
```text
Read specs/step-1-findings.md and implement it in src/schema.ts, src/prompt.ts and src/grounding.ts.
Do not change tests, fixtures or src/llm.ts.
Run `npm test -- schema grounding` until all 10 tests are green.
Then run `npm run review:mock` and show me the printed findings (severity, file:line, title, no "undefined")
and every DROPPED line with its reason.
```

## Start from
`git checkout main`

## Lost?
`git stash && git checkout step-1`
