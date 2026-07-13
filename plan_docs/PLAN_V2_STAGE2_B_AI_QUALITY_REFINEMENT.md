# Words Learning App For Mimi V2 Stage 2-B: AI Quality Refinement

Created: 2026-07-13 21:47 AEST
Last updated: 2026-07-13 23:00 AEST

Source plan:

- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md`

Derived from:

- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md`
- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_EVIDENCE.md`
- `plan_docs/PLAN_V2_MASTER.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- the user's 2026-07-13 instruction to execute Stage 2-B and fix the observed AI quality problems

Input evidence:

- First run: 120 submitted, 114 valid, 6 locally rejected, 0 provider/network failures.
- First-run structural validity was 95%, below the accepted provisional 100% threshold.
- The first agent lexical precheck found maximum-filling behavior, learnable fields containing misspellings or malformed phrases, meta labels such as `vs.`, and selected examples that did not use the source term.
- Stage 2 runner version 3 already closes the first-run accounting, provider-stop, and undersized-reservation gaps without changing the first Prompt.
- The user accepted the proposed Stage 2-B direction: valid learnable candidates only, no erroneous form in `Add to learning`, a combined candidate ceiling, Prompt revision, and a same-corpus second evaluation.

Consumer / next stage:

- Human lexical review of the second-run worksheet.
- V2-7 AI Enrichment And Cost Guard, only if the Stage 2-B evidence gate passes and receives human acceptance.

Document nature:

This is a derived Stage 2-B implementation and evaluation plan. It is not a peer master plan. It authorizes one bounded second evaluation against the unchanged non-personal 120-entry corpus after local tests pass. It does not authorize a third paid run, Production credential, user-facing AI route, database change, or deployment.

Current operational tier: Tier 3.

Working tier: Tier 3.

Status: executed and conditionally accepted by the user on 2026-07-13. The unchanged-corpus evaluation produced 120 / 120 locally valid drafts with no provider failure and an estimated US$0.027943 cost. Known lexical inaccuracies are accepted only for supplementary, editable AI drafts with explicit user acceptance and the model/inaccuracy notice frozen in `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_EVIDENCE.md`. V2-7 local implementation may proceed; Production activation remains separately approved work.

## Scope

- Preserve the first-run Prompt and schema files as immutable audit inputs.
- Add Prompt v2 and response-schema v2 with the same four-field output shape but stricter quality semantics.
- Limit `similarWords` plus `confusableWords` to at most three candidates in total.
- Require every candidate value to be a standalone, correctly formed English headword or grammatical phrase suitable for a separate learning entry.
- Reject candidate fields containing meta comparison labels, unsupported characters, URLs, or explanations that identify the candidate itself as an error, misspelling, malformed form, or nonstandard expression.
- Reject generated examples with visible `Correct`, `Incorrect`, `Wrong`, `X`, or equivalent error-example markers.
- Reject exact normalized duplicates within generated meanings/examples and exact duplicates of meanings/examples already supplied to the model.
- Keep whole-draft rejection for any failed local rule; do not silently delete a bad item and accept the remainder.
- Update the runner to pass the full trusted lexical context into local validation and version the second-run Prompt/schema/runner identity.
- Reuse the exact 120-entry corpus and unchanged reviewer-only expected relations.
- Run local tests and dry-run before the second paid evaluation.
- Execute at most 120 second-run requests at concurrency 1 with no automatic retry and no model/tool change.
- Compare structure, candidate saturation, selected quality defects, token/cost, latency, exact reviewer-hint matches, and terminal categories against the first run.
- Produce a new ignored raw artifact set, a tracked Stage 2-B evidence record, and a blank human lexical worksheet.

## Non-Scope

- No rewrite or deletion of the first Prompt, schema, corpus, raw artifact, or evidence record.
- No corpus-answer leakage: `primaryGroup` and `expectedRelations` remain local and are never sent to Gemini.
- No Datamuse, Free Dictionary, Groq, Search Grounding（搜索增强）, URL context, function calling, file, audio, external dictionary, or third-party lexical verification.
- No `commonError` persisted object in Stage 2-B. Incorrect spellings and malformed phrases are omitted from learnable candidates. A future non-learnable teaching surface would need a separate plan and UI.
- No claim that an ASCII-form guard proves dictionary validity, pronunciation similarity, semantic usefulness, or natural Chinese nuance.
- No automatic acceptance, automatic vocabulary creation, or current `Add to learning` runtime implementation.
- No third paid run or selective retry if the second run fails.
- No Production API route, Production key, Vercel variable, Postgres table, schema migration, backup-format change, user data, Production write, or deployment.
- No change to the Stage 1 daily-study contract, Recognition/Active scheduler, mobile UI, dashboard, or V1 behavior.

## Exit Criteria

- A derived Stage 2-B plan exists before executable changes and remains linked from the parent and master plans.
- Prompt v1 and response-schema v1 remain byte-identical with their first-run hashes.
- Prompt/schema v2 and runner version are independently hashed and recorded.
- The output shape remains compatible while the local contract enforces a combined candidate maximum of three.
- Candidate surface validation accepts ordinary English words/phrases with spaces, apostrophes, or hyphens and rejects meta labels, invalid characters, URLs, and known error-form explanations.
- Generated meaning/example arrays reject normalized duplicates of themselves and supplied source content.
- Comparison examples reject visible correct/incorrect teaching markers; both examples, when present, must still be non-blank and total exactly two.
- The Production-design quota contract rejects undersized token and cost reservations.
- Focused tests, Tier 3 governance preflight, lint, typecheck, full tests, both backup fixture dry-runs, build, diff checks, and secret-boundary checks pass.
- The second live run either completes 120 auditable one-shot attempts or stops safely on a documented guard.
- No external request occurs before local validation passes; no third request batch occurs automatically.
- Tracked evidence distinguishes automated structure, agent lexical precheck, and pending human acceptance.

## Accepted Quality Contract

### Candidate budget

```text
similarWords.length + confusableWords.length <= 3
```

Zero candidates remain valid. The Prompt asks for one or two candidates in ordinary cases and permits three only when every item is independently useful. It must not fill a quota merely because the schema allows three.

### Learnable candidate surface

A candidate `word` value may contain:

- English letters;
- internal apostrophes, including curly apostrophes;
- internal hyphens;
- single normalized spaces between words.

It may not contain:

- comparison labels such as `vs` or `versus`;
- parentheses, brackets, colon, slash, newline, URL, or explanatory punctuation;
- `Correct`, `Incorrect`, `Wrong`, or an error marker used as metadata;
- the source term after normalization;
- a duplicate of any other candidate after normalization.

This is a conservative shape guard, not a dictionary. A well-formed invented word can still pass shape validation, so Prompt discipline, agent precheck, editable preview, and human acceptance remain required.

### Incorrect-form exclusion

The candidate arrays contain only valid learnable forms. The difference explanation must not describe its own candidate as:

- a spelling or grammar error;
- malformed, nonstandard, or incorrect;
- something that must be replaced with another form.

Examples rejected from the first run include `interperet`, `in term of`, `at the other hand`, `a wide ranger of`, and `in respond to`. Stage 2-B omits these rather than storing them as vocabulary candidates.

### Meaning and example novelty

The local validator receives the exact trusted lexical payload sent to the provider:

```json
{
  "term": "effect",
  "meaningsZh": ["影响；结果"],
  "examples": ["The policy had a measurable effect."]
}
```

It rejects an additional meaning or example that normalizes to:

- another generated item in the same array; or
- an existing supplied item.

This catches exact or punctuation-only repetition. It cannot prove that two differently worded Chinese meanings are semantically redundant.

### Example quality boundary

- New examples should be natural, correct English and use the source word/phrase or a normal inflection.
- `examplePair`, when present, contains two correct natural sentences: one demonstrates the source and one demonstrates the candidate.
- Wrong-form demonstrations and labels such as `Correct:` / `Incorrect:` are rejected.
- Exact lemma/inflection usage remains a human/lexical check because deterministic English morphology would introduce false rejection for irregular forms.

## Prompt v2 Strategy

Prompt v2 adds an explicit silent quality pass before JSON output:

1. Treat supplied meanings/examples as already saved; add only genuinely new content.
2. Prefer an empty array over a paraphrase, weak association, obscure distractor, or quota filler.
3. Keep both candidate arrays to three items combined.
4. Use only valid standard-English learnable candidates.
5. Exclude misspellings, malformed phrases, meta labels, and error demonstrations.
6. Distinguish relation types precisely:
   - `similar`: genuine synonym or near-synonym;
   - `spelling`: two valid forms with meaningfully similar spelling;
   - `sound`: two valid forms with genuinely similar pronunciation;
   - `usage`: two valid forms commonly confused in meaning or grammatical use.
7. Check uniqueness, learnability, example correctness, and combined count before returning JSON.

Prompt v2 may cite short negative instructions based on first-run defect classes, but it does not include the reviewer-only expected answers for the 120 fixtures.

## Second Evaluation Envelope

The second evaluation retains:

| Control | Stage 2-B value |
| --- | --- |
| Model | `gemini-3.1-flash-lite` |
| Corpus | unchanged 120 entries |
| Corpus SHA-256 | `97ca46b1ce2ff414c046625e739a5a2fa362243798b88ed3dbb97735554009c8` |
| Maximum submitted calls | 120 |
| Concurrency | 1 |
| Automatic retries | 0 |
| Thinking | `minimal` |
| Maximum output/thinking allocation | 700 tokens per call |
| Maximum reserved run cost | US$0.10 guard; current computed reservation US$0.093 |
| Tools / grounding / files / audio | absent |
| Credential | ignored `.env.stage2.local`, local mode `600` |
| Raw output | ignored `local_artifacts/v2-stage2-ai/**` |

The existing test key remains a non-Production credential. It is not copied to Vercel or promoted to V2-7.

## Comparison Metrics

Automated comparison:

- submitted / valid / invalid / failed counts;
- structural-validity rate and rejection categories;
- valid counts by corpus group;
- array-size distribution and percentage of maximum-filled arrays;
- candidate combined-count distribution;
- exact reviewer-hint match rate, labelled diagnostic rather than a pass threshold;
- prompt, output, thinking, and total tokens;
- bounded estimated USD cost;
- minimum, p50, p95, and maximum latency;
- configured and observed model, Prompt/schema/runner versions and hashes;
- URL/meta/error-form guard hits;
- absence of the credential pattern from tracked and ignored artifacts.

Agent lexical precheck:

- revisit all first-run defect entries;
- inspect all candidate values for malformed/non-learnable forms;
- inspect candidate relation-type plausibility;
- inspect selected meanings/examples for duplication, grammar, source relevance, and fabricated claims;
- do not label this precheck as human acceptance.

Human worksheet retains the parent thresholds:

- critical unsupported/fabricated claims: 0;
- Chinese meaning `accept + minor_edit`: at least 90%;
- examples `accept + minor_edit`: at least 85%;
- candidate relevance `accept + minor_edit`: at least 80%;
- overall hard reject: at most 5%.

Automated structural validity remains 100%. If the second run is below this threshold, Stage 2-B does not pass even if every bad draft was safely rejected.

## Stop Conditions

Do not begin the second paid run if:

- Prompt/schema v1 hashes drift;
- the corpus hash or 120-entry composition changes;
- focused tests, dry-run, governance, lint, or typecheck fails;
- `.env.stage2.local` is missing, tracked, not ignored, or readable by group/other users;
- the configured model, current price evidence, output cap, no-tools state, or no-retry state drifts;
- the reserved run cost exceeds US$0.10.

Stop during the run on the existing runner guards, including authorization, quota, billing, blocked Prompt, non-`STOP` finish, missing candidate/content contract, unexpected model, missing usage accounting, token reservation breach, or user interruption.

After completion, do not run a third batch automatically. A failed second gate becomes evidence and requires a new human decision.

## Planned Files

- `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_REFINEMENT.md`
- `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_EVIDENCE.md`
- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md`
- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_EVIDENCE.md`
- `plan_docs/PLAN_V2_MASTER.md`
- `src/lib/ai-enrichment/prompt-v2.txt`
- `src/lib/ai-enrichment/gemini-response-schema-v2.json`
- `src/lib/ai-enrichment/contract.ts`
- `src/lib/ai-enrichment/contract.test.ts`
- `scripts/v2-ai-quality-runner.mjs`
- `scripts/v2-ai-quality-runner.test.mjs`
- `AGENTS.md`
- `ARCHITECTURE.md`
- `README.md`
- `CHANGELOG.md`
- `governance/AI_AGENT_LOG.md`
- ignored `.env.stage2.local`
- ignored second-run `local_artifacts/v2-stage2-ai/**`

## Validation Plan

```bash
npm run test -- src/lib/ai-enrichment/contract.test.ts scripts/v2-ai-quality-runner.test.mjs
npm run ai:quality:dry-run
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run build
git diff --check
```

The second live command remains gated by the runner's explicit confirmation flag. The key value, prefix, suffix, length, and hash must not appear in commands, output, documentation, or artifacts.

## Pre-Live Implementation Record

- Prompt v1, response-schema v1, and the 120-entry corpus remain unchanged and are locked by their first-run SHA-256 hashes.
- Prompt v2 SHA-256: `558ad2d6cce75b0333091ece9a428a92c86104bef9a21e64ea287444dea6a7e7`.
- Response-schema v2 SHA-256: `de6088679199b472b3f0d791efabaa041683f0e6ce2cc90585fe46d160c5958b`.
- Runner identity: `v2-stage2-runner-v4`.
- The focused Prompt/contract/runner suite passes 32 tests. Lint and typecheck pass.
- No second external request had been made at the time of this pre-live record.

## Execution Closure

- The pre-live stop conditions passed before any request.
- Runner version 4 submitted exactly 120 one-shot calls at concurrency 1 with no retry and no tools.
- All 120 drafts passed the then-current local structural validator; no provider/network failure or stop condition occurred.
- Prompt v2 materially reduced array saturation and candidate-output tokens, and the first-run malformed/meta candidate classes did not recur.
- The post-run agent precheck found remaining meaning, example, ordering, headword, obscurity, and relation-taxonomy defects that local shape rules cannot safely prove away.
- The automated structural threshold passed. The numeric human worksheet remains unscored, while the user made a separate qualitative product-tolerance decision after reviewing concrete cases and conditionally accepted the model for editable drafts.
- No third paid run or selective retry occurred. A further provider evaluation requires a new accepted plan.
- The focused and full test suites, Tier 3 governance preflight, lint, typecheck, both backup fixture dry-runs, Next.js Production build, Stage 2 dry-run, diff checks, and final secret-boundary checks passed.
