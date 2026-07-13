# Words Learning App For Mimi V2 Stage 2-B: Second AI Quality Evidence

Created: 2026-07-13 22:06 AEST
Last updated: 2026-07-14 01:32 AEST

Source plan:

- `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_REFINEMENT.md`

Derived from:

- `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_REFINEMENT.md`
- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md`
- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_EVIDENCE.md`
- `plan_docs/PLAN_V2_MASTER.md`
- `test_fixtures/v2-stage2-ai-corpus.json`
- `src/lib/ai-enrichment/prompt-v2.txt`
- `src/lib/ai-enrichment/gemini-response-schema-v2.json`
- the ignored second-run evidence under `local_artifacts/v2-stage2-ai/2026-07-13T11-58-48-962Z/`
- selected usage checks from Cambridge Dictionary and Merriam-Webster, linked below

Scope:

- Record the one user-approved second evaluation against the unchanged 120-entry non-personal corpus.
- Compare Prompt v2 and the stricter local contract with the first run without rewriting first-run evidence.
- Separate automated structural validity, agent lexical precheck, and pending human lexical acceptance.
- Decide whether Stage 2-B is sufficient to unlock V2-7 AI Enrichment And Cost Guard.

Non-Scope:

- No third paid run, selective retry, model change, threshold change, Production credential, public API route, database change, Vercel change, or deployment.
- No automatic saving, deletion, or correction of any generated draft.
- No claim that local regular expressions prove dictionary validity, semantic accuracy, natural Chinese, pronunciation similarity, or learner usefulness.
- No human lexical score is inferred from the agent precheck.
- No dictionary API or external lexical source is added to the product architecture.

Exit criteria:

- The second run identity, exact Prompt/schema/corpus hashes, outcome, token use, estimated cost, latency, and terminal categories are recorded.
- First- and second-run metrics use the same corpus and clearly state the first runner's missing-usage limitation.
- All first-run defect classes are revisited and remaining second-run defects are recorded without a third provider call.
- The 100% automated structural threshold, unscored numeric worksheet, and later human product-tolerance decision are recorded separately.
- Secret, Production, and ignored-artifact boundaries are rechecked before handoff.

Document nature:

This is a derived execution-evidence document. It preserves the second run as evidence and does not authorize another paid run, Production credential, deployment, or Production activation. The later human tolerance decision allows V2-7 planning and local implementation only under the draft-review boundary below.

Status: conditionally accepted by the user on 2026-07-13 after reviewing concrete second-run cases. The 120 / 120 automated structural result and known lexical inaccuracies are acceptable for an editable AI-draft workflow because Gemini output is supplementary rather than the only correct answer. V2-7 may proceed with local implementation of review/edit/reject/accept behavior and the required model notice. Production credential, activation, migration, and deployment remain separately approved work.

## Run Identity

| Field | Recorded value |
| --- | --- |
| Provider | Google Gemini API |
| Configured and observed model | `gemini-3.1-flash-lite` |
| Runner | `v2-ai-quality-runner-v4` |
| Prompt version | `v2-ai-enrichment-prompt-v2` |
| Prompt v2 SHA-256 | `558ad2d6cce75b0333091ece9a428a92c86104bef9a21e64ea287444dea6a7e7` |
| Output schema version | `v2-ai-enrichment-draft-v2` |
| Response-schema v2 SHA-256 | `de6088679199b472b3f0d791efabaa041683f0e6ce2cc90585fe46d160c5958b` |
| Corpus entries | 120 unique non-personal fixtures |
| Corpus SHA-256 | `97ca46b1ce2ff414c046625e739a5a2fa362243798b88ed3dbb97735554009c8` |
| Prompt v1 locked SHA-256 | `374595ac60994d6621f83fc2c6e7ea83fd9b39b93c5ed10f6ab84196b0b11c9e` |
| Response-schema v1 locked SHA-256 | `f341e52ac70cdc712d2a76b9732d1aae7b6ef09afdbe990b561ba9b377662dd5` |
| Start | 2026-07-13 21:58:48 AEST |
| Finish | 2026-07-13 22:01:55 AEST |
| Execution envelope | 120 maximum calls, concurrency 1, no retry, minimal thinking, 700 output-token limit |
| Ignored artifact directory | `local_artifacts/v2-stage2-ai/2026-07-13T11-58-48-962Z/` |

The runner verified all three first-run baseline hashes before the first second-run request. The corpus, model, request allowlist, no-tools state, concurrency, retry count, output cap, and cost reservation therefore remained comparable.

## Automated Outcome

| Outcome | Count | Rate |
| --- | ---: | ---: |
| Submitted | 120 | 100% |
| Valid local draft | 120 | 100% |
| Invalid local draft | 0 | 0% |
| Provider / network failure | 0 | 0% |
| `valid_draft` terminal category | 120 | 100% |

Every result reported `finishReason = STOP`, the observed model matched the pinned model, and no runner stop condition fired.

Group outcome:

| Corpus group | Submitted | Valid | Invalid |
| --- | ---: | ---: | ---: |
| Academic | 30 | 30 | 0 |
| Polysemy | 20 | 20 | 0 |
| Phrase / collocation | 20 | 20 | 0 |
| Spelling | 20 | 20 | 0 |
| Sound | 20 | 20 | 0 |
| Usage | 10 | 10 | 0 |

The provisional automated structural threshold was 100%. The second run achieved 120 / 120 and passed that threshold.

## Output Density

Prompt v2 reduced maximum-filling materially:

| Field | First run among 114 valid drafts | Second run among 120 valid drafts |
| --- | --- | --- |
| Additional meanings | 1: 1; 2: 33; 3: 80 | 0: 2; 1: 25; 2: 78; 3: 15 |
| New examples | 3: 114 | 1: 2; 2: 99; 3: 19 |
| Similar words | 1: 1; 2: 5; 3: 108 | 0: 2; 1: 40; 2: 78 |
| Confusable words | 1: 53; 2: 59; 3: 2 | 0: 44; 1: 76 |
| Combined candidates | 2: 1; 3: 5; 4: 47; 5: 59; 6: 2 | 1: 8; 2: 72; 3: 40 |

The second run returned 272 combined candidates, compared with 512 across the first run's 114 valid drafts. The average fell from 4.49 to 2.27 candidates per valid draft. All second-run drafts stayed within the shared maximum of three. No second-run draft returned zero combined candidates, so residual suggestion pressure remains possible even though the worst maximum-filling behavior was removed.

## Usage, Cost, And Latency

Second-run usage was retained for all 120 responses:

| Usage field | Second-run count |
| --- | ---: |
| Prompt tokens | 76,214 |
| Candidate-output tokens | 24,555 |
| Reported thinking tokens | 0 |
| Total tokens | 100,769 |
| Historical runner-recorded estimate | US$0.027943 |
| Corrected Standard estimate | US$0.055886 |

Prompt v2 is longer, so input use increased. Candidate-output use fell 39.27% in total despite six more structurally valid drafts. Candidate-output tokens per valid draft fell from about 354.70 to 204.63.

The first run's cost remains an interval because runner version 1 lost usage for six invalid HTTP 200 responses. On 2026-07-14, Stage 3.1 confirmed that both synchronous `generateContent` runs must use Standard US$0.25 / US$1.50 pricing; the runner had used the separate Batch/Flex rate. The corrected comparison from the retained token evidence is:

| Cost | First run | Second run | Change |
| --- | ---: | ---: | ---: |
| Historical runner estimate | US$0.034275–0.038925 | US$0.027943 | 18.47%–28.21% lower |
| Corrected Standard estimate | US$0.068550–0.077850 | US$0.055886 | 18.47%–28.21% lower |

Both Stage 2 paid runs together are corrected to a bounded Standard estimate of US$0.124436–0.133736. The historical runner total was US$0.062218–0.066868. These are usage-based estimates, not a provider invoice.

Recorded latency:

| Run | Minimum | p50 | p95 | Maximum | Wall time |
| --- | ---: | ---: | ---: | ---: | ---: |
| First | 1,524 ms | 2,001 ms | 2,388 ms | 2,876 ms | 241.808 s |
| Second | 1,228 ms | 1,529 ms | 1,842 ms | 2,293 ms | 186.396 s |

Second-run p50 and p95 latency were 23.59% and 22.86% lower respectively. This single fixed run is descriptive evidence, not a service-level guarantee.

## Agent Lexical Precheck

This section is a Codex-assisted precheck. It does not fill the human worksheet or claim full lexical review acceptance.

### Improvements that were directly observed

- All six entries rejected in the first run produced locally valid drafts in the second run.
- The first-run malformed candidate strings `interperet`, `in term of`, `at the other hand`, `a wide ranger of`, `in respond to`, and `derive from vs. derive out of` did not recur.
- No candidate contained a URL, comparison label, invalid character surface, source-term duplicate, cross-array duplicate, or explanation that identified its own candidate as an error form.
- The first-run `contextual` self-contradiction and `object` example using only `objection` did not recur.
- Candidate count and output-token use fell substantially.

### Remaining substantive defects

Selected high-confidence defects found in the second run:

| Entry | Field | Observed defect |
| --- | --- | --- |
| `academic-011` / `distribute` | example | `A company that distributes organic produce nationwide.` is a sentence fragment. |
| `phrase-002` / `carry out` | meaning | `完成；终结` adds `终结`, which is misleading for the ordinary “do, perform, or complete” sense. |
| `phrase-012` / `draw a conclusion` | meaning | `达成共识` describes agreement; `draw a conclusion` means forming a judgment after considering information. |
| `spelling-010` / `stationery` | example | `She spent the afternoon browsing for unique notebooks and pens.` does not use `stationery` or an inflection. |
| `phrase-015` / `reach a consensus` | example | `approaching a consensus` replaces the source verb rather than using the source phrase or an inflection. |
| `sound-003` / `aloud` | example | `She thought her frustrations aloud` is an unnatural construction. |
| `sound-011` / `moral` | meaning | `因果教育/寓意` contains an unclear and unsupported Chinese gloss. |
| `sound-016` / `whether` | candidate explanation | The explanation says `if` cannot occur with final `or not` in indirect questions; current Cambridge grammar explicitly permits final `if ... or not`. |
| `sound-018` / `then` | example pair | The `than` sentence appears first and the `then` source sentence second, reversing the Prompt's source/candidate order. |
| `usage-006` / `infer` | meaning | `意指；暗示` teaches the disputed “imply” sense without a usage warning in a fixture designed to distinguish `infer` from `imply`. |
| `academic-028` / `significant` | candidate | `signified` is an inflected form rather than a clean headword, despite the headword instruction. |

Selected candidate-relevance concerns include obscure or weak distractors such as `interpellate` for `interpret`, `conduce` for `lead to`, and `tern` for `term`. These are valid English forms, so local shape validation correctly cannot decide their learner value. Human review must make that decision.

The reviewer-only exact hints provide a taxonomy diagnostic:

| Diagnostic | Count among 119 entries with a fixed hint |
| --- | ---: |
| Exact candidate word and relation type | 51 |
| Expected word present under a different relation type | 33 |
| Expected word absent | 35 |

The exact rate was 42.9%, down from 52.2% among the first run's structurally valid entries with a hint. The stricter candidate budget explains some loss of exact candidates, and some fixed hint types admit reasonable disagreement. The 33 same-word/different-type cases still show that the current `similar` / `spelling` / `sound` / `usage` taxonomy is not reliable enough for automatic labeling.

### Selected external verification

No source text was sent to Gemini during this check. The following pages were consulted only after the run to verify selected agent concerns:

- [Cambridge Dictionary: conclusion](https://dictionary.cambridge.org/dictionary/english/conclusion) defines the relevant `draw a conclusion` sense as a judgment or opinion reached after considering information.
- [Cambridge Grammar: if or whether](https://dictionary.cambridge.org/grammar/british-grammar/if-or-whether) permits both `whether ... or not` and final-position `if ... or not`, while reserving immediate `whether or not` for `whether`.
- [Cambridge Dictionary: carry something out](https://dictionary.cambridge.org/dictionary/english/carry-out) gives the learning sense as doing, performing, fulfilling, or completing an activity.
- [Merriam-Webster: imply and infer](https://www.merriam-webster.com/grammar/usage-limericks/imply-infer) records historical `infer = hint` use but says the accepted common sense is reaching a conclusion from evidence and that the hint sense is widely frowned upon.
- [Merriam-Webster: historic and historical](https://www.merriam-webster.com/grammar/everything-youve-ever-wanted-to-know-about-historic-and-historical) confirms that modern common use usually reserves `historic` for important history and `historical` for general relation to history, while acknowledging historical overlap.

These checks support selected defect descriptions. They do not constitute a complete 120-entry dictionary audit.

## Gate Decision

| Gate | Result | Reason |
| --- | --- | --- |
| Fixed corpus and baseline comparability | Pass | Corpus and Prompt/schema v1 hashes matched before the run. |
| Bounded execution and accounting | Pass | 120 one-shot calls, no retry, no tools, complete usage, no stop condition. |
| Automated structural validity | Pass | 120 / 120 locally valid. |
| Shared candidate maximum | Pass | Every draft had at most three combined candidates. |
| First-run malformed candidate classes | Pass for this artifact | The recorded malformed/meta candidate strings did not recur. |
| Prompt-level semantic and example compliance | Known limitation | Confirmed meaning, example, ordering, and instruction-following defects remain. |
| Numeric human lexical thresholds | Not scored | The 120-row worksheet remains blank and must not be represented as a completed quantitative audit. |
| Human product-tolerance decision | Conditional pass | The user reviewed concrete acceptable, editable, and reject examples and accepts the observed error range for supplementary AI drafts. |
| V2-7 local implementation | Allowed with conditions | Results remain editable suggestions and enter formal learning data only after explicit user acceptance. |
| Production provider activation | Separate approval | V2-7 must still re-check current provider facts and receive approval for its Production-only credential, route, and deployment. |

The blank human worksheet contains all 120 rows at:

```text
local_artifacts/v2-stage2-ai/2026-07-13T11-58-48-962Z/review-worksheet.csv
```

No third paid run is authorized. The blank worksheet remains available for later quantitative calibration, but completing all 120 rows is no longer a blocking prerequisite for V2-7's editable-draft implementation.

## Human Tolerance Decision And Result Notice

The user accepts the observed error range under these product conditions:

- Gemini output is supplementary and is never presented as the only correct answer.
- Meanings, examples, similar words, and confusable words remain editable AI suggestions.
- AI-derived content enters formal learning data only after explicit user review and acceptance.
- Model lineage remains attached to the draft.
- No automatic bulk acceptance or silent addition to the learning list is introduced by this decision.

The required visible one-line copy is:

```text
Generated by Gemini 3.1 Flash-Lite · AI content may be inaccurate. Please review carefully before saving.
```

V2-7 must render this as small supporting text adjacent to the generated draft or save controls. It must remain readable rather than using extremely faint contrast. The displayed model label comes from the server-owned model lineage for that result; for the accepted Stage 2 route, `gemini-3.1-flash-lite` is displayed as `Gemini 3.1 Flash-Lite`.

This result notice is separate from the versioned first-outbound-call disclosure covering provider, sent/excluded fields, retention, usage metadata, quotas, and cost. It does not replace that disclosure.

## Validation

- Passed: focused Prompt/contract/runner Vitest suite with 32 tests before the paid run.
- Passed: full Vitest suite with 165 passed and 1 intentionally skipped database integration test.
- Passed: Tier 3 governance preflight before and after the paid run.
- Passed: ESLint and TypeScript typecheck.
- Passed: Stage 2 dry-run with all baseline/v2 hashes, exact corpus composition, US$0.093 reservation, three-field outbound allowlist, and no tools.
- Passed: schema version 3 and schema version 5 backup fixture dry-runs.
- Passed: Next.js Production build.
- Passed: final diff and secret-boundary checks recorded at handoff.

## Safety Boundary

- The second run sent only the same fixed non-personal `term`, `meaningsZh`, and `examples` fields.
- Reviewer-only groups and expected relations stayed local and were not sent to the provider.
- The local credential remained ignored, untracked, and mode `600`; its value, prefix, suffix, length, and hash were not recorded.
- Raw drafts, summary, and blank worksheet remain under the ignored local-artifact path.
- No V1 page, user vocabulary, person data, review history, database, Vercel environment, Production credential, or deployment was read or changed.
- No third provider batch or selective retry occurred.
