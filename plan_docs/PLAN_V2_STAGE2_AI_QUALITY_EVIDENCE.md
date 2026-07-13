# Words Learning App For Mimi V2 Stage 2: First AI Quality Evidence

Created: 2026-07-13 21:23 AEST
Last updated: 2026-07-14 01:32 AEST

Source plan:

- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md`

Derived from:

- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md`
- `plan_docs/PLAN_V2_MASTER.md`
- `test_fixtures/v2-stage2-ai-corpus.json`
- `src/lib/ai-enrichment/prompt-v1.txt`
- `src/lib/ai-enrichment/gemini-response-schema.json`
- the ignored first-run summary and review worksheet under `local_artifacts/v2-stage2-ai/2026-07-13T11-14-05-415Z/`

Scope:

- Record the first bounded 120-entry Gemini evaluation without promoting raw model output into tracked files.
- Separate verified structural and accounting evidence from the agent's lexical precheck and the still-pending human review.
- Record defects in the first runner and the local no-call audit repair made after the run.
- Decide whether the Stage 2 gate passed and what remains before another paid run or V2-7 Production integration.

Non-Scope:

- No second Gemini request, retry, model comparison, Prompt revision, threshold revision, human lexical acceptance, Production credential, public AI route, Vercel change, database change, or deployment.
- No Datamuse, Free Dictionary, Groq, Search Grounding（搜索增强）, URL, file, audio, or user study data.
- No claim that selected examples below are a complete lexical error count.

Exit criteria:

- The run identity, provider outcome, latency, known token usage, defensible cost interval, and six rejected entry ids are recorded.
- The 100% structural threshold is evaluated honestly.
- Human review remains visibly unresolved.
- The credential and raw-artifact boundary is rechecked without displaying secret material.
- A later paid rerun remains subject to explicit human agreement.

Document nature:

This is a derived execution-evidence document. It does not replace the parent gate, authorize another paid run, or mark Stage 2 complete.

Status: first bounded run completed; Stage 2 quality gate not passed; Production integration remains blocked.

## Run Identity

| Field | Recorded value |
| --- | --- |
| Provider | Google Gemini API |
| Configured and observed model | `gemini-3.1-flash-lite` |
| Prompt version | `v2-ai-enrichment-prompt-v1` |
| Prompt SHA-256 | `374595ac60994d6621f83fc2c6e7ea83fd9b39b93c5ed10f6ab84196b0b11c9e` |
| Output schema version | `v2-ai-enrichment-draft-v1` |
| Response-schema SHA-256 | `f341e52ac70cdc712d2a76b9732d1aae7b6ef09afdbe990b561ba9b377662dd5` |
| Corpus entries | 120 unique non-personal fixtures |
| Corpus SHA-256 | `97ca46b1ce2ff414c046625e739a5a2fa362243798b88ed3dbb97735554009c8` |
| Start | 2026-07-13 21:14:05 AEST |
| Finish | 2026-07-13 21:18:07 AEST |
| Execution envelope | 120 maximum calls, concurrency 1, no retry, minimal thinking, 700 output-token limit |
| Ignored artifact directory | `local_artifacts/v2-stage2-ai/2026-07-13T11-14-05-415Z/` |

The live runner recorded the corpus hash and version labels. Prompt and response-schema hashes were calculated locally immediately after the run from the unchanged files; current runner version 3 records those hashes directly in future dry-run and live summaries.

## Automated Outcome

| Outcome | Count | Rate |
| --- | ---: | ---: |
| Submitted | 120 | 100% |
| Valid local draft | 114 | 95% |
| Invalid local draft | 6 | 5% |
| Provider / network failure | 0 | 0% |
| Auditable terminal category | 120 | 100% |

All 114 accepted drafts reported `finishReason = STOP`. All 120 requests returned without a network, authorization, quota, timeout, or server failure. The observed model version matched the pinned model in every result where it was retained.

Group outcome:

| Corpus group | Submitted | Valid | Invalid |
| --- | ---: | ---: | ---: |
| Academic | 30 | 29 | 1 |
| Polysemy | 20 | 20 | 0 |
| Phrase / collocation | 20 | 20 | 0 |
| Spelling | 20 | 19 | 1 |
| Sound | 20 | 19 | 1 |
| Usage | 10 | 7 | 3 |

The six invalid results were:

| Entry id | Term | Safe local rejection category |
| --- | --- | --- |
| `academic-006` | `concept` | candidate duplicated another candidate or the source term |
| `spelling-011` | `precede` | candidate duplicated another candidate or the source term |
| `sound-010` | `insure` | candidate duplicated another candidate or the source term |
| `usage-003` | `historic` | candidate duplicated another candidate or the source term |
| `usage-004` | `historical` | candidate duplicated another candidate or the source term |
| `usage-007` | `fewer` | candidate duplicated another candidate or the source term |

The first runner retained only the combined validation message and discarded the rejected parsed draft. It is therefore impossible to recover whether each individual case was a same-array duplicate, cross-array duplicate, or source-term repetition. The local runner has since been upgraded without another provider call so a future HTTP 200 response records safe usage/model/finish context before JSON/draft validation and retains a rejected parsed draft only inside the ignored artifact directory. It accepts only `STOP` and stops the run on a blocked Prompt, other finish reason, or missing candidate/content contract, following Google's current `promptFeedback` and `finishReason` response contract.

## Usage, Cost, And Latency

The first summary retained exact usage only for the 114 valid drafts:

| Usage field | Known retained count |
| --- | ---: |
| Prompt tokens | 31,584 |
| Candidate-output tokens | 40,436 |
| Reported thinking tokens | 0 |
| Total tokens | 72,020 |

The original runner recorded US$0.034275 using US$0.125 / US$0.75 Batch/Flex rates. The Stage 3.1 check on 2026-07-14 confirmed that this synchronous REST `generateContent` run must use Standard US$0.25 / US$1.50 pricing. Repricing the retained tokens gives US$0.068550. The six invalid HTTP 200 responses also consumed tokens, but their usage metadata was lost in the first runner's validation-exception path. Their per-call usage had already passed the 2,000-input / 700-output reservation checks before draft validation failed. The corrected defensible interval is therefore:

```text
historical runner-recorded retained estimate     US$0.034275
corrected retained Standard estimate             US$0.068550
maximum six-call missing Standard reservation    US$0.009300
corrected bounded total              US$0.068550 - US$0.077850
```

This corrected interval replaces any current-cost description of US$0.034275 as the complete run cost. The original runner value remains historical evidence. Exact provider billing cannot be reconstructed from the saved first-run artifact.

Recorded latency across all 120 attempts:

| Minimum | p50 | p95 | Maximum |
| ---: | ---: | ---: | ---: |
| 1,524 ms | 2,001 ms | 2,388 ms | 2,876 ms |

## Agent Lexical Precheck

This section is a Codex-assisted precheck, not the required human lexical acceptance.

The model showed strong maximum-filling behavior despite the Prompt saying that empty arrays were valid:

| Field size among 114 valid drafts | Distribution |
| --- | --- |
| Additional meanings | 1 item: 1 draft; 2: 33; 3: 80 |
| New examples | 3 items: 114 drafts |
| Similar words | 1 item: 1 draft; 2: 5; 3: 108 |
| Confusable words | 1 item: 53 drafts; 2: 59; 3: 2 |

No valid draft returned an empty example, similar-word, or confusable-word array. This is evidence that the current “no filler” instruction is not strong enough; it is not proof that every returned item is filler.

Selected concrete defects found during the precheck:

- `context` returned `contextual` with a difference saying that `contextual` itself was a spelling error and then naming the same spelling as correct.
- `interpret` returned the nonstandard misspelling `interperet` as a candidate that could otherwise reach the future `Add to learning` flow.
- `derive` returned `derive from vs. derive out of` in the candidate-word field; this is explanatory text, not one learnable word or grammatical phrase.
- Phrase cases returned malformed forms such as `in term of`, `at the other hand`, `a wide ranger of`, and `in respond to` as candidate values. A common-error teaching surface would need a separate non-learnable data type; these values must not be treated as vocabulary entries.
- One generated `object` example used `objection` without using the source word `object`, showing that example relevance is not structurally guaranteed.

The reviewer-only exact relation hints matched 59 of 113 available expected relations among structurally valid drafts, or 52.2%. This is diagnostic only: an exact word-and-type match can miss a different but useful candidate, so it is not a quality pass/fail metric.

## Gate Decision

Credential and data-boundary checks after the run confirmed:

- `.env.stage2.local` exists locally, is ignored, is absent from `git ls-files`, and has filesystem mode `600`;
- the ignored Stage 2 artifact directory contains no API-key token pattern;
- tracked and current workspace source/document paths contain no API-key token pattern;
- the provider payload builder still exposes exactly `term`, `meaningsZh`, and `examples`, with no tool configuration;
- the live V1 application, Vercel environments, Production database, and user study data were not read or changed by the Stage 2 runner.

The provisional structural threshold was 100%. The first run achieved 114 / 120, or 95%, and therefore did not pass.

The blank human worksheet contains all 120 rows at:

```text
local_artifacts/v2-stage2-ai/2026-07-13T11-14-05-415Z/review-worksheet.csv
```

Chinese meaning accuracy, example naturalness, candidate relevance, unsupported/fabricated content, and overall accept/edit/reject rates remain unscored. The lexical thresholds cannot yet be evaluated. V2-7 must not use this first run as Production-provider acceptance.

## Accepted Stage 2-B Follow-Up

The user approved this follow-up on 2026-07-13. Its derived execution plan is `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_REFINEMENT.md`. The list below is preserved as the input decision for that plan; this first-run evidence remains unchanged.

The accepted revision is:

1. Permit only real standard-English words or grammatical phrases in learnable candidate fields; exclude misspellings, malformed phrases, `vs.` labels, and explanatory text.
2. Decide whether the two candidate arrays should share a combined maximum of three suggestions, reducing filler and review load, or retain the current maximum of three per array.
3. Require both comparison examples to be correct natural English. If common mistakes are useful, model them in a separate visibly non-learnable structure rather than `word`.
4. Add local guards for clearly meta-formatted candidate values while preserving full-draft rejection for duplicates and unknown fields.
5. Use runner version 3 so HTTP 200 usage, provider stop conditions, rejected-draft evidence, and bounded ignored artifacts are retained safely.
6. Run the same fixed 120-entry corpus again only after explicit approval; do not retry selected failed entries silently.

No second paid request was made while producing this evidence or repairing the runner.

Stage 2-B was later executed under separate user approval. Its unchanged-corpus second-run result and comparison are recorded in `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_EVIDENCE.md`. This first-run record remains unchanged evidence and must not be replaced by the later result.
