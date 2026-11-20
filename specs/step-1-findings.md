# Step 1 · Findings you can trust

**Goal.** The model answers with a typed object, and every finding is checked against the diff before anyone sees it.
**Why.** The schema is the contract between model and code. Models hallucinate locations, and a comment on a line outside the diff cannot even be posted.

## Files
- `src/schema.ts`
- `src/prompt.ts`
- `src/grounding.ts`

## What to write
- `FindingSchema` + 5 fields: `severity`, `category` (enum `security`, `correctness`, `performance`, `spec`, `maintainability`), `title`, `rationale`, `suggestion`. `Finding` and `Review` become `z.infer<...>`.
- `prompt.ts`: text for `SEVERITY_RUBRIC`, `VERDICT_SEMANTICS` (`request_changes` = a CRITICAL, `comment` = only WARNING/SUGGESTION, `approve` = none) and `FINDINGS_DISCIPLINE`. Keep `INJECTION_GUARD`.
- `groundFindings(findings, diff)`: no entry in `buildLineIndex(diff)` → drop with `file '<path>' is not in the diff`. No line of `lo..hi` (min/max of start/end) in the index → drop with `lines <lo>-<hi> do not touch any hunk in '<path>'`. Else keep.

## Acceptance
1. WHEN a finding has an unknown category or no severity, the schema SHALL reject it.
2. WHEN a finding's file is not in the diff, or its lines miss every hunk, the reviewer SHALL drop it with the exact reason above.
3. WHEN a range partly overlaps a hunk, or start is after end, the reviewer SHALL keep it.
4. WHEN the prompt is built, it SHALL contain no `TODO` and keep the injection guard.

## Done when
`npm test -- schema grounding` → `10 passed` (full `npm test`: `23 failed | 22 passed`, those are steps 2–4).

## Steps
1. `git checkout main`
2. Paste the prompt into your coding agent.
3. `npm test -- schema grounding`
4. `npm run review:mock` (or `npm run review` / `npm run ui`): no `undefined`; each `DROPPED` line has a reason.

## Prompt
```text
Step 1 · Findings you can trust. Spec: specs/step-1-findings.md (read it first).
Implement in src/schema.ts, src/prompt.ts and src/grounding.ts:
1. schema.ts: add to FindingSchema, after end_line: severity (Severity), category (z.enum of security, correctness,
   performance, spec, maintainability), title, rationale, suggestion (strings; suggestion is '' when there is none).
   Use .describe() on the strings. Replace the temporary Finding and Review types with z.infer of their schemas.
2. prompt.ts: replace the three TODO blocks, keeping their headings. SEVERITY_RUBRIC: one concrete line each for CRITICAL,
   WARNING, SUGGESTION. VERDICT_SEMANTICS: request_changes = at least one CRITICAL, comment = only WARNING/SUGGESTION,
   approve = no findings. FINDINGS_DISCIPLINE: only added or changed lines, cite NEW-side line numbers as printed, one
   finding per root cause, zero findings is valid. Do not touch INJECTION_GUARD or wrapUntrusted.
3. grounding.ts: implement groundFindings(findings, diff) using buildLineIndex. File not in the index -> dropped, reason
   "file '<path>' is not in the diff". lo/hi = min/max of start_line and end_line; no line in lo..hi in the index -> dropped,
   reason "lines <lo>-<hi> do not touch any hunk in '<path>'". Otherwise kept.
Constraints: do not change tests, fixtures or any other file.
Verify: run `npm test -- schema grounding` until 10 passed. Then run `npm run review:mock` and show me the printed
findings (severity, file:line, title, no "undefined") and each DROPPED line with its reason.
```

## Start from
`git checkout main`

## Lost?
`git stash && git checkout step-1-findings`
