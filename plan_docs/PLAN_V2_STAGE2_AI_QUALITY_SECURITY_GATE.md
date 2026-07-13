# Words Learning App For Mimi V2 Stage 2: AI Quality And Security Gate

Created: 2026-07-13 20:59 AEST
Last updated: 2026-07-14 01:32 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE1_PRODUCT_METRIC_DATA_CONTRACT.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `ARCHITECTURE.md`
- `AGENTS.md`

Input evidence:

- The user's accepted V2 AI enrichment requirements and strict cost / abuse boundary.
- The user's 2026-07-13 decisions to use a 120-entry evaluation corpus, proceed with paid Gemini, remove Datamuse and Free Dictionary from V2, and treat Groq as outside the active Stage 2 comparison.
- The user's confirmation that the intended app users and use case satisfy the current Gemini age and professional / business-purpose conditions.
- User-reported account evidence on 2026-07-13: the approved Gemini billing account required an AUD 20 Prepay（预付费）purchase and has Auto-reload（自动充值）disabled. This account-specific UI state was not independently inspected by the agent.
- Official Gemini model, lifecycle, pricing, billing, terms, Structured Output（结构化输出）, thinking, and release-note pages re-checked on 2026-07-13.

Consumer / next stage:

- V2-3 Data Model And Backup Parity.
- V2-3.1 Review Interaction And Context Word Actions.
- V2-7 AI Enrichment And Cost Guard.
- V2-8 Dashboard Insights And Release Gate.

Document nature:

This is a derived V2 Stage 2 plan and executable local quality / safety gate. It is not an independent peer plan. It may run a bounded, explicitly approved non-Production Gemini evaluation, but it does not create a public AI route or authorize a Production credential, migration, deployment, or user-data transmission.

Current operational tier: Tier 3.

Target capability tier: Tier 3.

Working tier: Tier 3.

Status: the first bounded run produced 114 valid and 6 rejected drafts. Completed Stage 2-B produced 120 / 120 locally valid drafts and documented remaining lexical defects. After reviewing concrete cases, the user conditionally accepted the observed error range for supplementary, editable AI drafts with explicit acceptance and a visible model/inaccuracy notice. V2-7 local implementation may proceed under that boundary. Production credential, provider activation, migration, and deployment remain separately approved work.

## Scope

- Freeze paid `gemini-3.1-flash-lite` as the only live Stage 2 model candidate.
- Remove Datamuse, Free Dictionary API, and Groq calls from the active V2 Stage 2 route.
- Reconcile the V2 cost calculation with the current official Gemini price.
- Define a fixed 120-entry, PTE-oriented academic-English evaluation corpus using non-personal fixture data.
- Freeze the outbound lexical allowlist, strict Structured Output, local validation, versioned disclosure, quality rubric, and acceptance thresholds.
- Add provider-neutral TypeScript contracts for request validation, draft validation, token / cost calculation, quota reservations, degraded mode, and Kill Switch behavior.
- Add a guarded local Node.js evaluation runner that uses the explicit stable model id, maximum 120 submitted calls, concurrency 1, minimal thinking, a bounded output limit, no tools, and no automatic retry.
- Store raw evaluation artifacts only under an ignored local path and store no secret in tracked files or logs.
- Run the approved non-Production evaluation only against the fixed corpus; send no Production vocabulary, person id, notes, tags, review history, timestamps, or other personal study data.
- Record structure, latency, token, cost, and failure evidence without claiming that an automated check replaces human lexical review.

## Non-Scope

- No Datamuse request, key, candidate score, attribution, Cache, or adapter.
- No Free Dictionary request, returned definition persistence, audio link, license dependency, or adapter.
- No Groq account, model call, failover, comparison, or retention-control setup.
- No use of `gemini-flash-latest`; that alias currently points to Gemini 3.5 Flash and may be hot-swapped. Stage 2 pins `gemini-3.1-flash-lite`.
- No browser-visible API route, provider SDK in client code, `NEXT_PUBLIC_` secret, Production key, Vercel environment variable, Preview variable, or deployment.
- No Postgres table, Schema Version 5 change, migration, repository integration, backup format, formal AI lineage row, or user-data mutation.
- No automatic acceptance of model output and no automatic creation or modification of a vocabulary entry.
- No Google Search grounding, URL context, file upload, audio, code execution, function calling, arbitrary Prompt（提示词）, multi-turn chat, or model-selected tools.
- No claim that Prepay or a provider Spend Cap alone prevents token abuse or guarantees an exact final bill.
- No final Production provider activation. V2-7 must re-check current official facts and receive separate approval for a new Production-only credential and live route.

## Safety / Side Effects

- The user explicitly approved local credential injection and the fixed-corpus external test. The credential is stored only in ignored `.env.stage2.local`, under the server-only name `GEMINI_API_KEY`.
- The Stage 2 credential must never be committed, logged, displayed, copied to Vercel, exposed through `NEXT_PUBLIC_`, or promoted to Production. V2-7 must use a separately reviewed Production credential.
- The AUD 20 prepaid balance and disabled Auto-reload reduce the provider-level financial blast radius. They do not prevent a leaked key from consuming the available balance, and Google documents possible billing-processing latency / overage. Application-side controls remain mandatory.
- The local runner defaults to dry-run. Live mode requires a second command-line confirmation, exactly 120 valid fixture entries, an explicit model match, and the local key.
- Live evaluation uses concurrency 1, no automatic retry, at most one submitted request per corpus entry, and an absolute run ceiling of 120 submitted requests.
- A submitted timeout, provider error, safety refusal, malformed result, or validation failure consumes its evaluation attempt. The runner does not silently resubmit it.
- The first evaluation sends only fixture `term`, `meaningsZh`, and `examples`. Reviewer-only category labels and expected relations are excluded from the provider payload.
- Raw provider bodies and drafts stay under `local_artifacts/v2-stage2-ai/`, which is ignored. Tracked evidence contains aggregate metrics, failure categories, hashes, and selected redacted examples only.
- The runner must redact provider errors and never serialize request headers, the API key, Basic Auth values, `.env` contents, or unrestricted response metadata.
- Production V1, its database, current Basic Auth, user study records, Vercel settings, and deployment remain untouched.

## Exit Criteria

- All Stage 2 user revisions are reflected in the master plan, architecture, README, AGENTS, changelog, and AI log.
- The canonical corpus contains exactly 120 unique entries and covers academic words, polysemy（多义词）, phrases / fixed collocations, spelling confusion, sound confusion, usage confusion, and edge cases.
- The outbound contract permits only the fixture or server-read lexical fields and rejects raw prompts, provider/model selection, URLs, files, audio, user ids, and unknown fields.
- The draft contract enforces exact fields, compact arrays, relation enums, text limits, no duplicate candidates, and zero-or-two comparison examples.
- The corrected synchronous Standard pricing configuration uses US$0.25 per million text-input tokens and US$1.50 per million output / thinking tokens, with a checked-at date and fail-closed stale-price behavior.
- The full 400,000 input plus 140,000 output / thinking daily reservation is documented as US$0.31 at the corrected Standard price.
- Production-design controls preserve 100 attempts per person, 200 global attempts, concurrency 2, US$0.40 daily estimated cost, and US$2 monthly estimated cost as independent ceilings.
- Evaluation-only controls prove the maximum 120-call, concurrency-1, no-retry envelope without weakening future Production controls.
- Dry-run, contract tests, governance preflight, lint, typecheck, full tests, backup fixture checks, build, and secret-boundary checks pass.
- The bounded live run produces aggregate provider evidence or stops safely with a redacted failure reason.
- Stage 2 records automated structural results and a review-ready lexical worksheet. Final lexical quality acceptance remains explicitly human-confirmed before V2-7 Production integration.

## Verified Provider Baseline

Checked on 2026-07-13 against official Google documentation, with the synchronous Standard price re-checked and corrected on 2026-07-14:

| Area | Stage 2 fact | Implementation consequence |
| --- | --- | --- |
| Model | `gemini-3.1-flash-lite` is Stable / GA; current published earliest shutdown date is 2027-05-07 | Pin the exact stable id and re-check before V2-7 |
| Alias | `gemini-flash-latest` currently points to Gemini 3.5 Flash and `latest` aliases may be hot-swapped | Do not use the user's example alias in tests or runtime |
| Structured output | Gemini 3.1 Flash-Lite supports JSON Schema Structured Output | Send a strict response schema and validate again locally |
| Thinking | Gemini 3.1 Flash-Lite supports `minimal`; minimal does not promise absolutely zero thinking | Set `thinkingLevel = minimal` and account for reported thought tokens |
| Price | Standard synchronous paid text input US$0.25 / 1M tokens; output including thinking US$1.50 / 1M tokens. US$0.125 / US$0.75 are Batch/Flex rates | Version both price and consumption mode; calculate from provider usage metadata |
| Paid data | Paid prompts / responses are not used to improve Google products; limited safety / legal logging may still occur | Disclose limited retention accurately; do not claim Zero Retention |
| Billing | Prepay / project caps may have processing latency and account-specific availability | Preserve app-side request, token, cost, concurrency, and Kill Switch controls |
| Terms | User has confirmed all intended users and intended use satisfy the current age and purpose conditions | Record confirmation; re-check after a material terms or audience change |

Official sources:

- <https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite>
- <https://ai.google.dev/gemini-api/docs/models>
- <https://ai.google.dev/gemini-api/docs/deprecations>
- <https://ai.google.dev/gemini-api/docs/pricing>
- <https://ai.google.dev/gemini-api/docs/billing>
- <https://ai.google.dev/gemini-api/terms>
- <https://ai.google.dev/gemini-api/docs/generate-content/structured-output>
- <https://ai.google.dev/gemini-api/docs/generate-content/gemini-3>
- <https://ai.google.dev/gemini-api/docs/changelog>

Provider facts are checked evidence, not permanent constants. The price config, model config, Prompt version, schema version, and disclosure version must all be independently versioned.

## Accepted Provider And Lexical Flow

V2 no longer depends on external lexical candidate or dictionary services:

```text
server-read vocabulary entry or fixed evaluation fixture
  -> allowlisted term / current Chinese meanings / current examples
  -> pinned Gemini 3.1 Flash-Lite with tools disabled
  -> strict structured draft
  -> local schema and semantic validation
  -> editable preview
  -> human edit / delete / reject / accept
  -> accepted enrichment or separately confirmed Add to learning
```

Consequences of removing Datamuse and Free Dictionary:

- Gemini proposes similar and confusable candidates directly.
- A candidate is an AI suggestion, not a dictionary-verified fact.
- The UI and stored lineage must not use `verified`, `dictionary confirmed`, or an invented source label.
- Human preview is mandatory, and zero output is valid when the model cannot give a useful candidate confidently.
- The 120-entry gate must explicitly measure unsupported or fabricated candidates because there is no independent lexical-source check in V2.
- A later deterministic lexical source may be proposed through a new child plan; it is not silently reintroduced.

## Outbound Data Contract

### Public request shape reserved for V2-7

The future browser request may contain only:

```json
{
  "vocabularyEntryId": "server-owned-id",
  "feature": "enrichment_v1",
  "disclosureVersion": "ai-disclosure-v1",
  "idempotencyKey": "opaque-client-key"
}
```

The browser cannot provide model id, Prompt, lexical text, token settings, tool settings, provider, URL, file, audio, or arbitrary options. The server re-reads the entry and constructs the provider payload.

### Provider-bound lexical fields

```json
{
  "term": "take into account",
  "meaningsZh": ["考虑到"],
  "examples": ["The report takes regional differences into account."]
}
```

Allowed:

- normalized display term or phrase;
- current Chinese meanings selected for the entry;
- current examples selected for the entry.

Excluded:

- person id, display name, Basic Auth identity, email, IP address;
- tags, private notes, source file name, import batch, rarity score;
- created / updated / review timestamps, ratings, due dates, review history, daily goals;
- raw typed answers, audio, transcript, learning performance, and unrelated vocabulary;
- model, Prompt, tools, URL, file, or token controls supplied by the browser.

## Structured Draft Contract

The draft remains:

```json
{
  "additionalMeaningsZh": [],
  "examples": [],
  "similarWords": [
    {
      "word": "large",
      "differenceZh": "更常用于描述尺寸或规模"
    }
  ],
  "confusableWords": [
    {
      "word": "effect",
      "type": "usage",
      "differenceZh": "effect 通常作名词，affect 通常作动词",
      "examplePair": []
    }
  ]
}
```

Contract limits:

- exact four root fields; unknown fields fail validation;
- `additionalMeaningsZh`: `0..3`, each non-blank and at most 80 Unicode code points;
- `examples`: `0..3`, each non-blank and at most 240 code points;
- `similarWords`: `0..3` unique normalized candidates;
- `confusableWords`: `0..3` unique normalized candidates;
- candidate word / phrase: at most 80 code points;
- `differenceZh`: at most 180 code points;
- relation `type`: `spelling | sound | usage` for confusable entries;
- `examplePair`: either empty or exactly two non-blank strings, each at most 240 code points;
- no candidate may normalize to the source term or appear in both candidate arrays;
- AI may return empty arrays; filler content is worse than an honest empty result;
- local validation failure rejects the whole draft and does not auto-retry.

## 120-Entry Corpus

The tracked corpus contains exactly 120 unique terms. It is a project-curated PTE-oriented evaluation fixture, not an official Pearson vocabulary list and not Production learner data.

Target composition:

| Primary group | Count |
| --- | ---: |
| Common academic words | 30 |
| Polysemous words | 20 |
| Phrases and fixed collocations | 20 |
| Spelling confusables | 20 |
| Sound / homophone confusables | 20 |
| Usage-confusion edge cases | 10 |
| **Total** | **120** |

Each entry contains:

- stable fixture id;
- term;
- `word` or `phrase` kind;
- existing Chinese meaning list;
- existing example list;
- reviewer-only primary group and optional expected relation hints.

Only term, meanings, and examples are sent. Group labels and reviewer hints remain local so the provider does not see the answer key.

## Quality Rubric

Automated checks:

- 100% parseable JSON and exact local contract validity;
- correct root fields and relation enums;
- no duplicate or self-referential candidates;
- all length / count boundaries respected;
- provider model id and usage metadata present;
- no tool call, citation claim, URL, or source-verification claim;
- latency, input tokens, visible output tokens, thinking tokens when reported, total tokens, and estimated cost recorded.

Lexical review uses one row per entry:

- Chinese meaning accuracy: `accept | minor_edit | reject`;
- example naturalness / grammar: `accept | minor_edit | reject`;
- candidate relevance: `accept | minor_edit | reject | no_candidate`;
- unsupported / fabricated claim: `none | minor | critical`;
- overall action: `accept | edit | reject`;
- short reviewer note.

Provisional pass thresholds requiring later human confirmation:

- Structured Output and local contract validity: 100%;
- critical unsupported / fabricated claims: 0;
- Chinese meaning `accept + minor_edit`: at least 90%;
- examples `accept + minor_edit`: at least 85%;
- returned candidate relevance `accept + minor_edit`: at least 80%;
- overall hard reject: at most 5%;
- all 120 attempts have an auditable terminal category even when the provider does not return a valid draft.

Automated validation can prove structure and accounting. It cannot alone prove Chinese nuance, natural usage, pronunciation similarity, or whether a suggestion is worth learning. The generated worksheet therefore remains an explicit human acceptance gate.

## Cost And Abuse Controls

### Current price calculation

Corrected Standard synchronous configuration, checked on 2026-07-14:

```text
input:  US$0.25 / 1,000,000 tokens
output: US$1.50 / 1,000,000 tokens, including thinking
```

Accepted Production planning envelope:

```text
400,000 input tokens  * 0.25 / 1,000,000 = US$0.100
140,000 output tokens * 1.50 / 1,000,000 = US$0.210
full reserved day                             US$0.310
```

The existing US$0.40 daily and US$2 monthly application limits remain independent conservative ceilings. At this corrected price, US$2 represents about 6.45 full reserved daily envelopes. Actual throughput stops at whichever request, token, cost, concurrency, or provider boundary is reached first.

The 2026-07-13 runner configuration mistakenly used the separate Batch/Flex rates even though it called synchronous REST `generateContent`. Historical runner-recorded costs remain audit facts, while current estimates are recomputed from retained usage under Standard pricing. Full correction evidence is in `plan_docs/PLAN_V2_STAGE3_1_REVIEW_INTERACTION_CONTEXT_WORD_ACTIONS.md`.

### Stage 2 evaluation envelope

- exact model: `gemini-3.1-flash-lite`;
- exact corpus: 120 entries;
- maximum submitted requests: 120;
- concurrency: 1;
- automatic retries: 0;
- thinking level: `minimal`;
- maximum output / thinking allocation requested per call: 700 tokens;
- tools, grounding, URL context, files, audio, and function calls: absent;
- local artifact directory: ignored;
- key source: ignored `.env.stage2.local` only;
- live execution requires the exact confirmation flag documented by the runner;
- the original US$0.10 evaluation cost ceiling is retained; corrected Standard pricing reserves US$0.186 for 120 maximum attempts, so another live batch now fails closed and requires a new human-approved cost boundary;
- unexpected model id, missing usage metadata, stale price config, invalid corpus size, duplicate corpus term, or missing local artifact boundary stops the run.

### Future Production envelope retained for V2-7

- 100 submitted provider attempts per person per local day;
- 200 submitted provider attempts across Production per `Australia/Melbourne` budget day;
- global provider concurrency 2;
- 2,000 input-token and 700 output / thinking-token planning reservations per attempt;
- US$0.40 estimated daily and US$2 estimated monthly ceilings;
- atomic request / token / cost reservation;
- request count never restored after provider submission;
- usage reconciliation, idempotency, bounded Cache variants, Basic Auth re-check, WAF outer rate limit, and Kill Switch;
- no automatic provider failover.

## Local Credential Boundary

Stage 2 uses:

```text
.env.stage2.local
  variable name: GEMINI_API_KEY
  value: ignored local secret, intentionally omitted
```

Rules:

- `.env.stage2.local` must remain ignored and absent from `git ls-files`.
- Commands and logs may report only `configured` / `missing`; never a prefix, suffix, length, hash, or value.
- The runner reads the variable at process start and never writes it to artifacts.
- Provider errors are mapped to safe categories before writing.
- The key is not added to `.env.example`, `.env.local`, Vercel, Preview, Production, or source code in Stage 2.
- A separate Production credential and environment plan is required in V2-7.

## First Execution Result — Historical Gate State

The first fixed-corpus run submitted exactly 120 one-shot requests and observed the pinned `gemini-3.1-flash-lite` model. It produced 114 valid drafts, 6 locally rejected duplicate/self-candidate results, and no provider or network failure. The 95% valid-draft rate is below the provisional 100% structural threshold.

The first runner recorded US$0.034275 of validated-response usage under the mistakenly selected Batch/Flex rate and dropped usage metadata for the six invalid HTTP 200 responses. Repricing the retained usage at the applicable Standard rate gives US$0.068550; the six-call reservation-backed upper estimate is US$0.077850. Runner version 3 retains safe accounting context before JSON/draft validation, keeps rejected parsed drafts inside ignored artifacts, accepts only `STOP`, and stops future calls on a provider prompt block, non-`STOP` finish, or missing candidate contract. No second paid call was made for those repairs, and the Stage 3.1 price correction makes no provider call.

The Production-design reservation helper now rejects a caller-supplied token reservation that differs from the configured 2,000-input / 700-output envelope or understates its configured cost. This prevents a later internal caller from bypassing monthly cost accounting with a zero or undersized reservation.

The agent lexical precheck found maximum-filling behavior, malformed/non-learnable candidate values, and selected example-relevance problems. The blank 120-row human review worksheet remains unscored. Full evidence and the proposed next decision are in `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_EVIDENCE.md`.

Consequences at the time of the first run, superseded by the later Stage 2-B evidence and human tolerance decision:

- Stage 2 did not then authorize V2-7 integration.
- The current Prompt and thresholds are not silently revised after observing the run.
- Any second paid 120-entry evaluation requires explicit agreement on the Prompt / candidate-contract revision.

Current decision: Stage 2-B is conditionally accepted for V2-7 local editable-draft implementation. This does not authorize a Production credential, Production route activation, migration, or deployment.

## Planned Files

- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_SECURITY_GATE.md`
- `plan_docs/PLAN_V2_STAGE2_AI_QUALITY_EVIDENCE.md`
- `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_REFINEMENT.md`
- `plan_docs/PLAN_V2_STAGE2_B_AI_QUALITY_EVIDENCE.md`
- `plan_docs/PLAN_V2_MASTER.md`
- `src/lib/ai-enrichment/types.ts`
- `src/lib/ai-enrichment/contract.ts`
- `src/lib/ai-enrichment/contract.test.ts`
- `src/lib/ai-enrichment/gemini-response-schema.json`
- `src/lib/ai-enrichment/prompt-v1.txt`
- `scripts/v2-ai-quality-runner.mjs`
- `scripts/v2-ai-quality-runner.test.mjs`
- `test_fixtures/v2-stage2-ai-corpus.json`
- `.gitignore`
- `package.json`
- `README.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- `CHANGELOG.md`
- `governance/AI_AGENT_LOG.md`
- ignored `.env.stage2.local`
- ignored `local_artifacts/v2-stage2-ai/**`

## Validation Plan

Local contract and dry-run:

```bash
npm run ai:quality:dry-run
npm run test -- src/lib/ai-enrichment/contract.test.ts scripts/v2-ai-quality-runner.test.mjs
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run build
git diff --check
```

Credential boundary checks must prove the ignored file is ignored, untracked, absent from diffs, and absent from the repository secret scan without printing the value.

The approved live command will be documented by the runner but must still require its explicit confirmation flag. The output summary must include submitted / succeeded / invalid / failed counts, token totals, estimated USD cost, latency distribution, model ids, corpus hash, Prompt / schema versions, and a review worksheet path.

## Stop Conditions

Stop new external requests immediately if:

- the configured model is not exactly `gemini-3.1-flash-lite`;
- the corpus is not exactly 120 unique valid entries;
- the key is missing, appears tracked, or appears in a generated artifact;
- the local output path is not ignored;
- provider usage metadata needed for cost accounting is absent;
- the checked price configuration is stale or missing;
- submitted attempts would exceed 120;
- an automatic retry path is detected;
- a response or error risks writing credentials or unrestricted provider bodies;
- the provider reports a billing, account, permission, or safety condition requiring human action;
- the provider reports a blocked Prompt, any non-`STOP` finish reason, or a missing candidate/content contract;
- the user requests a pause or scope change.
