// Entry point.
//   npm run review        real model, PR from REVIEW_PR (.env)
//   npm run review:mock   offline, recorded PR + recorded answers
//   --pr owner/repo#N     which PR (default: REVIEW_PR)      --repo-dir <dir>   read files from a checkout
//   --no-context          diff only, no repository context   --dry-run          print prompt sizes, call no model
//   --ci                  GitHub Action mode: reads GITHUB_REPOSITORY, PR_NUMBER, GITHUB_TOKEN and POSTS the review
import './env.ts';
import { parseArgs } from 'node:util';
import { loadAgents } from './agents.ts';
import { gatherContext, type Context } from './context.ts';
import { dedupFindings } from './dedup.ts';
import { countBlockers, toReviewPayload, type AgentOutcome } from './gate.ts';
import { postReview } from './github.ts';
import { parseUnifiedDiff } from './diff.ts';
import { loadTarget } from './pr.ts';
import { promptFor, reviewWithAgent, type ReviewInput } from './review.ts';

const { values } = parseArgs({
  options: {
    ci: { type: 'boolean' },
    pr: { type: 'string' },
    'repo-dir': { type: 'string' },
    'no-context': { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    verbose: { type: 'boolean', short: 'v' },
  },
});

const C = { dim: '\x1b[2m', red: '\x1b[31m', yel: '\x1b[33m', blu: '\x1b[34m', grn: '\x1b[32m', off: '\x1b[0m' };
const SEV = {
  CRITICAL: `${C.red}CRITICAL${C.off}`,
  WARNING: `${C.yel}WARNING ${C.off}`,
  SUGGESTION: `${C.blu}SUGGEST ${C.off}`,
};
const n = (x: number) => x.toLocaleString('en-US');

async function main() {
  const { ref, pr, source } = await loadTarget({ ci: values.ci, pr: values.pr, repoDir: values['repo-dir'] });
  console.log(`${C.dim}PR ${ref.owner}/${ref.repo}#${ref.number} · ${pr.title}${C.off}`);

  const agents = loadAgents();
  let context: Context | null = null;
  if (values['no-context']) {
    console.log(`${C.dim}Context: off (--no-context)${C.off}`);
  } else {
    console.log(`${C.dim}Context from ${source.label}:${C.off}`);
    context = await gatherContext(source, {
      rawDiff: pr.diff,
      prBody: pr.body,
      extraDocs: agents.flatMap((a) => (a.specPath ? [a.specPath] : [])),
    });
    for (const line of context.log) console.log(`${C.dim}${line}${C.off}`);
  }
  const input: ReviewInput = { rawDiff: pr.diff, prTitle: pr.title, prBody: pr.body, context: context?.blocks };

  if (values['dry-run']) {
    console.log('\nPrompt sizes (no model is called):');
    for (const a of agents) {
      const [sys, user] = promptFor(a, input);
      const chars = sys.content.length + user.content.length;
      console.log(
        `  ${a.id.padEnd(18)} system ${n(sys.content.length)} + user ${n(user.content.length)} chars ≈ ${n(Math.round(chars / 4))} tokens → ${a.model}`,
      );
    }
    return;
  }

  console.log(`\n${C.dim}Reviewing with ${agents.length} agent(s): ${agents.map((a) => `${a.id} → ${a.model}`).join(', ')}${C.off}\n`);

  // Agents are independent, so they run in parallel.
  const results = await Promise.all(agents.map((a) => reviewWithAgent(a, input)));
  const outcomes: AgentOutcome[] = [];
  let totalCost = 0;
  let totalIn = 0;
  let totalOut = 0;
  for (const { outcome, dropped, llm } of results) {
    outcomes.push(outcome);
    totalCost += llm.costUsd ?? 0;
    totalIn += llm.tokensIn;
    totalOut += llm.tokensOut;
    console.log(
      `■ ${outcome.agent}  ${C.dim}${llm.model} · ${n(llm.tokensIn)} in / ${n(llm.tokensOut)} out · $${(llm.costUsd ?? 0).toFixed(5)} · ${llm.ms} ms${C.off}`,
    );
    for (const f of outcome.findings) console.log(`  ${SEV[f.severity]}  ${f.file}:${f.start_line}  ${f.title}`);
    for (const d of dropped) console.log(`  ${C.dim}DROPPED   ${d.finding.title} — ${d.reason}${C.off}`);
    if (values.verbose) console.log(JSON.stringify(llm.review, null, 2));
    console.log();
  }

  const merged = dedupFindings(outcomes.map((o) => ({ agent: o.agent, findings: o.findings })));
  const perAgent = outcomes.map((o) => `${o.agent} ${o.findings.length}`).join(' · ');
  console.log(`Findings per agent: ${perAgent} → ${merged.length} after dedup`);
  const blockers = outcomes.reduce((acc, o) => acc + countBlockers(o.findings, o.failOn), 0);
  console.log(`Total: ${n(totalIn)} in / ${n(totalOut)} out tokens · $${totalCost.toFixed(5)} · blockers: ${blockers}`);

  if (values.ci) {
    const payload = toReviewPayload(outcomes, parseUnifiedDiff(pr.diff));
    await postReview(ref, process.env.GITHUB_TOKEN ?? '', payload);
    console.log(`Posted ${payload.event} with ${payload.comments.length} inline comment(s).`);
  }
  if (blockers > 0) {
    console.log(`${C.red}Gate: FAIL${C.off} (the model's own verdict is ignored)`);
    process.exitCode = 1;
  } else {
    console.log(`${C.grn}Gate: PASS${C.off}`);
  }
}

// Hard fail: any error → exit 1 and post nothing. A silent green check is worse than a red one.
main().catch((e) => {
  console.error(`\x1b[31mReview failed:\x1b[0m ${(e as Error).message}`);
  process.exitCode = 1;
});
