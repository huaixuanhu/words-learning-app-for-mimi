# Words Learning App For Mimi V2 Master Plan

Created: 2026-07-13 00:16 AEST
Last updated: 2026-07-13 00:16 AEST

Source plan:
- `plan_docs/PLAN_V1_MASTER.md`

Derived from:
- `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md`
- `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`
- `plan_docs/PLAN_V1_STAGE7_10_LIBRARY_REVIEW_CONTROLS.md`
- `plan_docs/PLAN_V1_STAGE7_11_REVIEW_ROLLBACK_AUTO_REFRESH.md`
- `plan_docs/PLAN_V1_STAGE8_REVIEW_MEMORY_ALGORITHM.md`
- `plan_docs/PLAN_V1_STAGE8_5_DATA_LIFECYCLE_ENVIRONMENT_STRATEGY.md`
- `plan_docs/PLAN_V1_STAGE6B_P1_G_C_5_LIVE_PRODUCTION_EXECUTION.md`
- `ARCHITECTURE.md`
- the product feedback accepted on 2026-07-12 and the user's 2026-07-13 confirmation

Input evidence:
- Mimi's request to separate daily new-word study from review and show the system's suggested review amount.
- The user's accepted V2 requirements for mobile refinement, learning / memory outlook visualization, shorter English-first copy, Active practice, AI enrichment, and bounded paid-model usage.
- Current V1 code and schema behavior recorded in the V1 plans and architecture.

Consumer / next stage:
- Future derived V2 child plans created in the order defined by this document.
- `plan_docs/PLAN_VERSION_HOLD_MULTI_USER_CONFIDENTIAL_ISOLATION.md`

Document nature:
This is the canonical V2 product and engineering master plan. It is derived from the completed V1 plan and current Production architecture. It does not claim that any V2 feature, schema, external service, migration, or deployment has been implemented.

Current operational tier: Tier 3.

Target capability tier: Tier 3. V2 adds a bounded paid AI API（人工智能接口）and confidential vocabulary-derived data, but no material economic authority, public account registration, or high-consequence account action.

Working tier: Tier 3.

Status: accepted documentation baseline. No V2 code or live service action has been performed under this plan.

## Scope

- Replace the ambiguous combined daily task with separate Review and New Words zones for Recognition Vocabulary（阅读词汇）and Active Vocabulary（输出词汇）.
- Display four daily values for each Track（学习轨道）: `Added today`, `Suggested review`, `Review goal`, and `New-word goal`.
- Display distinct-word actuals for `Reviewed today` and `Learned today`.
- Treat a vocabulary entry as one count whether its surface text is a single word, a phrase, or a fixed collocation.
- Move a newly saved entry from `New` to `In review` only after the first valid memory rating for that Track / Review Profile（复习配置）.
- Keep Recognition and Active on the same FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）algorithm family while separating parameters, state, events, rebuild behavior, and tests.
- Add Active `Say it`, `Spell it`, and `Dictation` modes.
- Add a user-triggered pronunciation button for Recognition cards through browser SpeechSynthesis（浏览器文字转语音）.
- Add the first Production-capable AI enrichment flow for extra Chinese meanings, examples, similar words, and confusable words.
- Use deterministic lexical sources to generate candidates before AI filtering and explanation.
- Require editable preview and explicit human acceptance before AI-derived content enters formal learning data.
- Bound AI calls and cost through server-only credentials, strict request shape, atomic quotas, Cache（缓存）, rate limits, provider billing controls, and a Kill Switch（紧急关闭开关）.
- Refine mobile navigation, task surfaces, import preview, practice cards, dashboard density, and responsive behavior.
- Add `Today’s progress`, `Learning rhythm`, and `Memory outlook` visualizations with clear separation between observed actuals and FSRS estimates.
- Reduce visible copy and developer-like terms while preserving natural English immersion.
- Preserve V1 data compatibility, backup/export behavior, environment separation, and Tier 3 Production gates.

## Non-Scope

- No V2 implementation is authorized by this documentation baseline alone.
- No Production deployment, Production database migration, Production data mutation, credential change, paid-service setup, or provider-account action.
- No SSO（Single Sign-On，单点登录）, OAuth, public registration, roles, per-person authorization, or confidential multi-tenant isolation. These are held in `plan_docs/PLAN_VERSION_HOLD_MULTI_USER_CONFIDENTIAL_ISOLATION.md`.
- No PTE / IELTS question bank, external exam corpus, persisted exam-mode switch, writing question type, free-writing assessment, or exam speaking question type.
- No automated pronunciation score, long recording assessment, microphone upload, or Speech Recognition（语音识别）integration in the accepted V2 baseline. Sending audio to a future multimodal or speech model may be evaluated later, but V2 currently captures and transmits no microphone audio.
- No AI-generated voice requirement. Browser SpeechSynthesis owns first-generation word playback and dictation playback.
- No automatic provider failover from Gemini to Groq.
- No Google Search grounding, URL context, code execution, file upload, agent tools, or arbitrary user Prompt（提示词）in the AI route.
- No analytics, advertising tracking, notification, email, payment, scheduled background job, or PWA（Progressive Web App，渐进式 Web 应用）commitment.

## Safety / Side Effects

- The current private trusted group remains behind Production Basic Auth（基础认证）.
- `person_id` remains a convenience and data-separation field, not an authorization identity. Per-person AI quotas are fairness controls; global quotas are the security and cost boundary.
- Any paid provider, credential, environment variable, external API, remote migration, or Production action requires a new bounded child plan and explicit human approval.
- Preview must not receive the Production AI credential. AI must be disabled or use a non-billable local fixture until a separately approved non-production test route exists.
- Only the minimum lexical context may be sent externally: word / phrase, selected meanings, selected examples, and lexical candidates. Names, `person_id`, full study history, private notes, credentials, and unrelated vocabulary must not be sent.
- Paid Gemini terms must be stated accurately. When the API call is made through a Cloud Project linked to an active billing account, paid prompts and responses are not used to improve Google products; Google may record prompts and responses for a limited, unspecified period for prohibited-use detection, abuse prevention, and required legal / regulatory disclosure. Usage and technical metadata are handled separately. This limited retention is accepted when disclosed; the product must not claim Zero Retention（零保留）.
- Before any schema migration or destructive Production change, create and verify the backup required by the accepted V1 lifecycle policy.

## Exit Criteria

V2 is complete only when all of the following are true:

- Both Tracks display real values for the four daily dimensions; unfinished features do not show fake zero values.
- Review and New Words zones are separate and both honor freely chosen non-negative goals.
- Recognition and Active states cannot read or overwrite each other's FSRS parameters or history.
- Active `Say it`, `Spell it`, and `Dictation` work through the accepted first-generation scoring boundary.
- Recognition review cards expose an accessible word-playback button without creating a review event.
- The AI API is present on the formal V2 path and can produce structured, previewable enrichment that the user may accept, edit, reject, or add as a separate learning entry.
- Before the first external AI call, the UI shows the provider, lexical fields that will be sent, personal fields that will not be sent, limited prompt / response retention, separate usage / technical metadata collection, and the cost / quota boundary; the user must confirm that disclosure, and a material provider / terms / field change requires a new confirmation.
- AI cost is mechanically bounded and the Production route passes authentication, input-limit, concurrency, replay, quota, Cache, and Kill Switch tests.
- Mobile navigation and primary workflows pass the accepted responsive-width and accessibility checks.
- `Today’s progress`, `Learning rhythm`, and `Memory outlook` distinguish actual values from estimates and use the correct Track-specific data.
- Backup, restore, export, Postgres repository, API, local fallback, and migration tests cover the accepted V2 data shape.
- Staging migration rehearsal, Preview acceptance, pre-Production backup, and separately approved Production migration/deployment gates pass.
- Planning documents, architecture, changelog, and AI log match the implemented behavior.

## Accepted Product Decisions

### English-First Immersion

- Ordinary UI copy uses short, natural English.
- Chinese or bilingual copy remains appropriate for irreversible deletion, full-day reset, backup replacement, credential / privacy disclosure, and first external AI transmission.
- `Batch imported` remains the exact source chip for JSON batch imports.
- Developer-facing terms such as `empty array`, `null`, and `schema` do not appear in the main learning workflow. The JSON guide may keep technical details behind `Example format` or an Advanced section.
- The visual language remains soft sage, calm, low-pressure, and centered on learning rather than AI administration.

### Calm Schedule Language

Internal scheduler fields such as `dueAt` remain precise. The user-facing status vocabulary is:

- `New`
- `In review`
- `Ready today`
- `Coming later`

The visible product must not divide words into `overdue`, `expired`, or other pressure-oriented categories. Words internally scheduled before today and words ready today may both appear under `Ready today` without exposing a missed-day label.

## Daily Study Contract

Each Track presents the same four-value grid:

| UI label | Owner | Accepted definition |
| --- | --- | --- |
| `Added today` | System | Vocabulary entries successfully saved through single input or batch import during the selected person's local natural day and assigned to this Track. |
| `Suggested review` | System | Distinct entries that already had a valid prior rating for this Review Profile and are suitable for another review today. It excludes New entries and is not truncated by the user's goal. |
| `Review goal` | User | The number of review entries the user chooses for that Track today. |
| `New-word goal` | User | The number of New entries the user chooses to study for the first time in that Track today. |

Counting rule:

- One `VocabularyItem` / learning entry counts as one regardless of whether `surfaceText` contains one word, a phrase, or a fixed collocation.
- Distinct actuals are keyed by vocabulary-entry id, not by whitespace-separated token count and not by number of rating attempts.
- Repeated attempts for the same entry remain visible as attempt information but count once in `Reviewed today` or `Learned today`.
- `Added today` uses the immutable system creation time or an equivalent creation ledger, not the user-editable study timestamp.
- The later V2-1 contract must lock whether a hard-deleted or rolled-back entry remains in the historical `Added today` total; the initial recommendation is to preserve the successful-creation count while keeping no deleted lexical content in the ledger.

Actual values:

- `Learned today`: distinct entries whose first valid rating for this Review Profile occurred today.
- `Reviewed today`: distinct entries reviewed today that already had valid Review Profile history before today.
- A word that receives multiple same-session attempts contributes one actual learned/reviewed entry and multiple attempts.

Goal rules:

- `Review goal` and `New-word goal` accept `0` and any non-negative whole number that the database can safely represent.
- There is no product-imposed 1–80 study cap.
- `0` represents a rest choice; the system may still display `Suggested review` without forcing a session.
- The effective queue cannot exceed available entries.
- Queue construction must use bounded queries / pagination and must not allocate a huge in-memory array solely because a very large goal was entered.
- Lowering a goal below an already completed actual does not delete history; the UI shows the actual and marks the goal as reached.

### Daily Recommendation Snapshot

Initial V2 behavior:

- Create one local-date plan snapshot per person and Review Profile when today's plan is first resolved.
- `Suggested review` remains stable for that plan day while `Reviewed today` changes.
- The snapshot includes distinct ready entries available through the end of the local day under the Track-specific scheduler.
- It excludes entries that are still `New` at snapshot time.
- Recommendation version and calculation time must be recorded so later algorithm changes remain explainable.

### Separate Review And New Words Zones

- Review and New Words are separate task zones; one zone does not silently consume the other's goal.
- Review selects already-seen entries that are `Ready today`.
- New Words selects entries with no valid rating for the current Review Profile.
- A saved entry remains `New` after import, preview, open, or card reveal.
- The first submitted valid memory rating creates the Track-specific review state and moves the entry to `In review`.

### Whole-Day Reset

The current one-step confirmation becomes a two-gate action:

1. First dialog: `Reset today’s progress?` with `NO` and `YES`.
2. After `YES`, show: `真的要确定清空本日记录吗？这里不可以撤销哦`.

The second gate uses explicit `返回` and `确认清空` actions. It does not add a typed-phrase requirement unless a later human-approved child plan chooses that extra friction.

Accepted reset scope:

- Remove today's selected-person Recognition and Active learning / review events, including first-learning ratings.
- Rebuild affected Recognition and Active states from earlier retained history.
- Preserve vocabulary entries, import batches, daily goal settings, successful-addition facts, and accepted AI enrichment.
- Make the operation idempotent and transactional so repeat requests do not create additional damage.
- Keep `回退1词` as a separate bounded correction for the most recent completed entry.

## Track And Review Profile Design

### Recognition Vocabulary

- Keeps the V1 four memory ratings and same-session repeat behavior unless a later child plan explicitly changes them.
- Keeps Recognition-specific FSRS parameters and event replay.
- Adds a visible, accessible `Listen` / speaker button on the Recognition card.
- Pressing `Listen` invokes browser SpeechSynthesis for the entry's word, phrase, or fixed collocation.
- Playback does not create a review event, change a rating, alter FSRS state, or count as `Learned today` / `Reviewed today`.
- The user may replay pronunciation without a model call or AI quota charge.

### Active Vocabulary

V2 includes three first-generation modes:

| Mode | Prompt | User action | Result boundary |
| --- | --- | --- | --- |
| `Say it` | Show Chinese meaning | Say the English word / phrase aloud | Reveal the answer, then self-rate. No microphone capture or automated pronunciation score. |
| `Spell it` | Show Chinese meaning | Type the English word / phrase in the card | Normalize and compare the answer, reveal the target, then record the accepted memory rating. |
| `Dictation` | Initially show no lexical text | Browser SpeechSynthesis reads the target; user types it | Reveal English plus Chinese after submission, then record the accepted memory rating. |

Exam writing and speaking question types remain outside V2. `Say it` is word / phrase recall, not exam-speaking assessment.

### Independent FSRS Boundary

- Recognition and Active use the same `ts-fsrs` algorithm family.
- Each uses a different Parameter Set（参数集）with its own id / version, adapter, constants, calibration, state rebuild, and tests.
- Active must never import, copy, or fall back to Recognition parameters.
- The minimum future state identity is `(person_id, vocabulary_item_id, review_profile)`.
- Existing V1 review states and events migrate explicitly to `review_profile = recognition`.
- Active events record `activity_type = say | spell | dictation`.
- Initial V2 recommendation: the three Active modes share one Active Review Profile while retaining their activity type on each event. Splitting them into three independent profiles requires a later evidence-backed decision.
- Changing an entry's Track after history exists must not reinterpret old events. A later child plan must choose a guarded fresh-profile transition or a dedicated migration; silent state reuse is forbidden.

## AI Enrichment Contract

### Provider Direction

Accepted current candidate:

- Primary Production candidate: paid `gemini-3.1-flash-lite`.
- Quality / cost comparison: Groq `openai/gpt-oss-20b`.
- No Production commitment until the same 50–100 word corpus passes the V2-2 quality and security gate.
- Provider and model id stay behind a server-side adapter and versioned configuration so retirement does not require changing the vocabulary data model.
- `gemini-2.5-flash-lite` is not the V2 Production target: its published earliest shutdown date is 2026-10-16 and Google's published replacement is `gemini-3.1-flash-lite`.
- `gemini-3.1-flash-lite` is currently Stable / GA, with a published earliest shutdown date of 2027-05-07. Model abstraction and lifecycle re-checking remain required.
- If Groq enters a real comparison, re-check the actual account's retention controls. Current documents distinguish default inference non-retention, possible reliability / abuse recording for up to 30 days, retained usage metadata, and account-dependent ZDR（Zero Data Retention，零数据保留）availability.

Provider claims and pricing are time-sensitive. The child plan that creates a credential or paid project must re-check current official lifecycle, pricing, terms, rate limits, supported Structured Outputs（结构化输出）, retention controls, and billing controls immediately before action. It must also verify that the intended private learning application fits the current Gemini terms, including the published age and professional / business-purpose conditions, rather than assuming terms compatibility.

### Lexical Evidence Pipeline

```text
Vocabulary entry
  -> Datamuse candidate generation
  -> Free Dictionary API best-effort English evidence
  -> AI selection and difference explanation
  -> structured editable draft
  -> human edit / delete / reject / accept
  -> accepted enrichment or separate learning entry
```

Candidate categories:

- `similar`: synonym or near-synonym candidate.
- `spelling`: visually or orthographically similar candidate.
- `sound`: pronunciation-similar or homophone candidate.
- `usage`: meaning or usage pattern likely to be confused. This is an application / AI classification after comparing lexical evidence, not a native Datamuse relation type.

Rules:

- Datamuse proposes candidates; its score is ranking evidence, not a truth score.
- Free Dictionary API is temporary best-effort evidence. It publishes no accepted rate limit, SLA（服务等级协议）, or clear privacy / data-retention policy for this plan. Its repository's GPL-3.0 code license does not by itself prove that returned definitions and examples may be persisted in bulk. Until a source / license review closes that gap, do not save its original definition text as formal learning content; use it transiently for candidate screening and degrade cleanly on failure or missing phrase coverage.
- AI selects at most the small accepted number of useful candidates, explains differences, and creates bounded comparison examples.
- AI does not invent an unsupported dictionary source or mark a candidate as verified when lexical evidence is missing.
- Datamuse has announced that from 2027-01-01 every request requires an API key and each key is limited to 100,000 requests per day. Its query strings are temporarily logged and discarded at the end of the day after the request. The integration must therefore be server-side, key-ready, cached, and limited to non-sensitive lexical queries even if early testing can run without a key.

### Structured Draft

The first-generation structured result remains compact:

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

The API response is additionally wrapped in server-owned provenance such as provider, model, Prompt version, source hash, output schema version, token usage, latency, and status. Those fields do not need to clutter the learner-facing card.

### Human Acceptance And Separate Learning Entry

- Before the first outbound generation, show a versioned disclosure naming the provider, the exact lexical fields sent, excluded personal fields, limited prompt / response retention, separate technical / usage metadata, and the active quota / cost boundary. The user must confirm before the call; provider, terms, or outbound-field changes invalidate the prior confirmation.
- Generated content first enters an Editable Draft（可编辑草稿）.
- The user may edit, delete individual candidates, reject the draft, or accept selected content.
- No AI result automatically mutates formal vocabulary data.
- `Add to learning` creates a separate vocabulary entry for the chosen candidate.
- The form may default to the source entry's Track but must require a final Track confirmation.
- If the normalized candidate already exists for the selected person, link to the existing entry instead of creating an uncontrolled duplicate.
- The accepted relation stores source entry, target entry, relation type, and AI-run lineage.
- AI-created entries use their own clear source label. The existing JSON import chip remains exactly `Batch imported`.

### 50–100 Entry Quality Gate

The fixed evaluation corpus should include:

- common academic words;
- polysemous words;
- PTE-relevant terms;
- phrases and fixed collocations;
- spelling confusables;
- pronunciation confusables / homophones;
- usage confusables;
- less-common or dictionary-missing edge cases.

Blind evaluation records:

- supported Chinese-meaning accuracy;
- example naturalness and grammaticality;
- confusable-candidate relevance;
- unsupported or fabricated claims;
- Structured Output validity;
- human accept / edit / reject rate;
- latency;
- input, output, and thinking token usage;
- estimated and actual cost.

No model is declared higher quality solely from price, provider marketing, or one anecdotal result.

## AI Cost And Abuse Boundary

### Initial Hard Limits

The user approved doubling the initial request ceilings:

- per person: 100 provider attempts per local day;
- all Production: 200 provider attempts per authoritative budget day;
- all Production concurrency: 2 provider calls;
- per-call planning envelope: approximately 2,000 input tokens and 700 output / thinking tokens per provider attempt; V2-2 must configure the lowest supported thinking level and measure actual behavior because thinking cannot be assumed fully disabled;
- daily global token reservation: 400,000 input tokens and 140,000 output / thinking tokens;
- app-side estimated cost ceiling: US$0.40 per day and US$2 per month unless a later approved calibration changes it.

These are independent ceilings. The first reached ceiling stops new provider calls. Per-person limits remain fairness controls because `person_id` is not authentication. Global request, token, cost, and concurrency limits are the enforceable application boundary.

Accounting rules:

- Use one server-owned authoritative budget timezone, initially `Australia/Melbourne`, for the global daily reset. A user-editable person timezone cannot reset the global allowance.
- Reserve and count one request attempt immediately before calling the provider. Invalid or unauthorized requests rejected before that point do not consume an attempt.
- Once a provider call is submitted, provider `429`, timeout, network ambiguity, safety refusal, invalid Structured Output, and downstream validation failure still consume the request attempt. Reconcile or release unused token / cost reservation when reliable usage evidence permits, but do not restore the request count.
- The 100 / 200 request values are burst-abuse ceilings, not promised sustainable monthly throughput. At the current reviewed Gemini 3.1 pricing, the full daily token envelope is approximately US$0.31; a US$2 monthly ceiling therefore allows only about six full-envelope days.
- App-side cost is an estimate tied to a versioned provider / model / pricing configuration. Missing usage metadata, unknown model version, or stale / missing price configuration fails closed for new calls.
- The provider Spend Cap and application ledger operate together. Neither an application estimate nor a delayed provider cap alone is presented as an exact billing guarantee.

### Required Layers

1. Keep Production Basic Auth and re-check it inside the AI route.
2. Accept only same-origin JSON POST requests with strict Content-Type, Origin / Fetch Metadata checks, bounded body size, and no open CORS（跨来源资源共享）.
3. Accept only a vocabulary-entry id, fixed feature enum, and bounded options. Reject raw prompts, model names, token controls, URLs, files, audio, and unknown fields.
4. Re-read the selected entry server-side and send only the approved lexical fields.
5. Use Structured Output with server-side schema and length validation.
6. Disable model tools, Search grounding, URL context, code execution, and automatic retry.
7. Atomically reserve request, token, and estimated-cost quota in Postgres immediately before the provider call and apply the accounting rules above.
8. Reconcile the token / cost reservation against provider usage metadata after the response; fail closed when required accounting evidence is absent.
9. Use a unique Idempotency Key（幂等键）and Cache key derived from person, normalized entry, feature, source versions, Prompt version, and model.
10. Limit controlled variants such as another example; the browser cannot create arbitrary random Cache keys.
11. Apply Vercel WAF rate limiting to `/api/ai/*` as an outer shield. WAF is not the global cost ledger.
12. Keep the provider key server-only, non-public, and Production-scoped; never use a `NEXT_PUBLIC_` variable.
13. Use a dedicated Gemini project / billing boundary. Use Prepay（预付费）, disable Auto-reload（自动充值）, and set the smallest practical project Spend Cap（消费上限）only when those exact controls are visibly available for the approved account at execution time; do not assume every account exposes the same billing plan or control surface.
14. Keep an environment Kill Switch that disables new generations while preserving cached and deterministic features.
15. Do not automatically fail over to Groq; provider switching is a reviewed configuration change.

### Minimal AI Audit Ledger

Keep only what is necessary for cost and reliability:

- request id and timestamp;
- person id for app-local accounting;
- HMAC（带密钥哈希）of network identity if rate-limit evidence is needed, not raw long-term IP;
- feature, Cache hit, provider, model, Prompt version, and output-schema version;
- status category, latency, actual tokens, and estimated cost;
- provider response id / model version where available;
- structure-validation result.

Do not log credentials, Basic Auth values, provider keys, raw Authorization headers, private notes, full study history, unrestricted provider error bodies, or raw Prompt / response by default. Accepted structured enrichment is formal user data and follows the existing Production / backup lifecycle.

### Degraded Mode

When AI quota, billing, provider, or structure validation is unavailable:

- Recognition and Active scheduling continue.
- Recognition pronunciation and Active Dictation continue through browser SpeechSynthesis.
- Datamuse / dictionary results may continue when their own adapters are available and within policy.
- Valid cached AI drafts / accepted enrichment remain readable.
- New AI generation shows short calm English copy such as `AI suggestions are resting for now`.

## Mobile, Dashboard, And Copy Plan

### Known Structural Issue

Current navigation hides the bottom navigation at the `md` breakpoint while showing the desktop sidebar only at `lg`. V2 must close the 768–1023 px navigation gap before visual polish is considered complete.

### Mobile Information Architecture

- Recommended primary navigation: `Home`, `Study`, `Review`, `Library`, `More`.
- `More` may contain Add Words, Practice Lab, Settings, and Backup where space requires.
- Mobile Dashboard uses a Track switch or similarly compact selection instead of stacking two oversized Track cards.
- Batch import preview becomes a touch-friendly card list on narrow screens.
- Primary actions remain reachable above the software keyboard.
- Bottom navigation and dialogs respect device Safe Area（安全区）.
- Dictation exposes Replay and an available browser-voice selector without exposing technical voice-engine copy in the main flow.

### Compact Dashboard

Each Track card contains:

- one 2×2 daily-value grid;
- `Reviewed today` progress;
- `Learned today` progress;
- one concise next action;
- no large explanatory paragraphs that repeat the labels.

The two desktop cards should have symmetrical density and height. Mobile presents one Track at a time or a compact vertical equivalent.

### Visualizations

- `Today’s progress`: actual distinct learned/reviewed entries compared with chosen goals and system suggestion.
- `Learning rhythm`: observed distinct entries and attempts over the previous 7 / 14 days.
- `Memory outlook`: Track-specific future review-load buckets and FSRS Retrievability（可提取率）distribution.
- Prediction uses FSRS state, not AI guessing.
- New entries without a Review Profile state do not appear in forgetting / retrievability estimates.
- Actual and estimate series must be visually and textually distinguishable.
- Avoid red punishment states, overdue countdowns, streak-loss copy, or other pressure patterns.

### Responsive Acceptance

Validate at minimum:

- 320 px;
- 375 px;
- 390 px;
- 768 px;
- 1024 px;
- representative desktop width.

Checks include no horizontal scroll, reachable primary actions, readable charts, visible navigation, accessible dialogs, reduced-motion behavior, keyboard use, focus order, touch targets, and no content hidden behind the mobile keyboard or bottom Safe Area.

## Candidate V2 Data Model

The exact schema version is not locked by this master plan. Schema Version 6 is the current candidate because V2 needs new persisted semantics. The implementation child plan must inspect all local, Postgres, API, backup, restore, and export consumers before choosing the final version.

Candidate domains:

```text
daily_study_defaults
  -> person_id, review_profile, review_goal, new_goal, timezone

daily_study_plans
  -> person_id, local_date, review_profile
  -> suggested_review_count, goals, recommendation_version, calculated_at

review_states
  -> add review_profile and parameter_set_id
  -> unique person + vocabulary item + review profile

review_events
  -> add review_profile, activity_type, answer_result, parameter_set_id

ai_runs
  -> provider / model / prompt / input / schema lineage and bounded usage metadata

ai_enrichment_drafts
  -> structured editable draft plus accepted / rejected state

ai_usage_buckets
  -> atomic request, token, cost, and concurrency reservation

vocabulary_relations
  -> source item, target item, relation type, provenance
```

Rules:

- Existing V1 review rows migrate only to `recognition`.
- No V1 Active placeholder row may be reinterpreted as valid history.
- Existing executed migrations remain immutable. Any V2 SQL begins with a new migration after `0002_schema5_production_runtime.sql`.
- Local fallback, Postgres, repository contracts, API payloads, JSON backup / restore, CSV export, fixtures, and validation must move together.
- AI Cache and audit data must be classified as reproducible metadata, temporary draft, or accepted formal learning data; deletion and backup behavior differ by class.
- Destructive reset / delete behavior must define propagation across review states, events, drafts, relations, Cache, and later backup expiry.

## V2 Stage Sequence

### V2-0 Documentation Baseline

Status: accepted and initiated by this document set.

- Create this master plan.
- Create the Version-hold multi-user isolation plan.
- Synchronize README, architecture, AGENTS, changelog, and AI log.
- Make no code, schema, credential, provider, or Production change.

### V2-1 Product, Metric, And Data Contract

- Freeze daily metric queries and edge cases.
- Freeze phrase / collocation counting as one vocabulary entry.
- Freeze goal and queue behavior.
- Freeze reset scope and two-gate confirmation.
- Freeze Active event evidence and answer normalization.
- Decide the historical `Added today` behavior after hard delete / batch rollback.
- Produce schema and API contract diagrams before implementation.

### V2-2 AI Quality And Security Gate

- Re-verify official provider lifecycle, pricing, privacy, output, and billing controls.
- Verify intended-use terms, age / professional-purpose conditions, lexical-source licensing, query retention, attribution, and whether original dictionary text may be persisted before any paid project or stored external content.
- Define the fixed 50–100 entry corpus and human rubric.
- Implement or script only the separately approved non-Production comparison route.
- Prove the request, token, cost, concurrency, Cache, audit, and Kill Switch design before a Production key exists.
- Select the first Production model from evidence.

### V2-3 Data Model And Backup Parity

- Finalize schema version and new migration.
- Add Review Profile, daily plan, Active evidence, AI lineage, quota, and vocabulary-relation contracts.
- Migrate old rows to Recognition explicitly.
- Update local / Postgres repositories, API, backups, restore, CSV, fixtures, and tests.
- Run only local and approved Development / Staging migration rehearsals.

### V2-4 Mobile Foundation And Copy

- Close the 768–1023 px navigation gap.
- Rework mobile import preview, forms, dialogs, practice cards, Safe Area, and keyboard behavior.
- Reduce visible copy and retain English-first immersion.
- Preserve `Batch imported`, the cat Home Brand Button, soft sage palette, and reduced-motion behavior.

### V2-5 Daily Learning Engine

- Build independent Review and New Words zones.
- Implement all four values and both actual values per Track.
- Remove the 1–80 goal cap while keeping safe integer / query boundaries.
- Add daily snapshot semantics.
- Add transactional two-gate whole-day reset and preserve `回退1词`.
- Complete Recognition flow first; incomplete Active metrics show an unavailable state instead of a false zero.

### V2-6 Active Practice Engine

- Build `Say it`, `Spell it`, and `Dictation`.
- Add browser SpeechSynthesis playback and typed-answer normalization.
- Add independent Active FSRS parameters, state, events, rebuild, backup, and tests.
- Add the Recognition `Listen` button and prove it has no scheduling side effect.
- Keep Speech Recognition / microphone-AI scoring deferred.

### V2-7 AI Enrichment And Cost Guard

- Implement provider adapters and the accepted Gemini route.
- Integrate Datamuse and Free Dictionary adapters with Cache and graceful failure.
- Add structured draft review, edit, reject, accept, and `Add to learning`.
- Add atomic quotas, usage reconciliation, WAF rule, provider billing cap, Kill Switch, and minimal audit ledger.
- Run the accepted quality, privacy, cost, abuse, and degraded-mode tests.
- This stage is required for V2 completion.

### V2-8 Dashboard Insights And Release Gate

- Finish compact symmetric Track cards.
- Add actual and estimated visualizations.
- Pass the full mobile / accessibility acceptance matrix.
- Create a Production backup.
- Rehearse the migration and rollback in Staging.
- Verify Preview runtime, AI route, cost limits, and no Production data crossover.
- Obtain separate approval for Production migration and deployment.
- Complete authenticated Production smoke, schema, data, log, and budget acceptance.

## Validation Plan

Documentation baseline:

```bash
git diff --check
npm run governance:preflight
```

Later code / schema stages add the smallest relevant subset and finish with the full V2 gate:

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run build
```

V2-specific tests must cover:

- single-word, phrase, and fixed-collocation entries each count as one;
- distinct entry actuals versus repeated attempts;
- freely chosen `0` and large safe goals;
- pagination and huge-goal defense;
- daily recommendation snapshot and timezone rollover;
- Track/profile isolation and old-row Recognition migration;
- Active mode evidence and answer normalization;
- Recognition playback has no review-state side effect;
- two-gate reset, idempotency, rebuild, and rollback interaction;
- AI request schema, unknown-field rejection, input/output caps, and same-origin checks;
- global quota cannot be bypassed through `person_id` changes;
- global request accounting uses the server-owned budget timezone and does not refund submitted attempts after provider / structure failure;
- concurrency and replay do not create duplicate provider calls;
- Cache versioning and provider / Prompt lineage;
- missing usage metadata, stale price configuration, or unexpected model version fails closed;
- limited-retention disclosure and minimal outbound data;
- editable draft acceptance and duplicate-candidate linking;
- provider failure, quota exhaustion, Kill Switch, and no automatic fallback;
- actual / estimate visualization semantics;
- mobile navigation and no-overflow matrix;
- backup/restore/export round trip for the final V2 schema;
- Staging migration and rollback rehearsal before Production approval.

## Version-Hold And Later Directions

Held outside V2:

- SSO, public registration, per-person authorization, roles, account recovery, confidential tenant isolation, and account deletion propagation. See `plan_docs/PLAN_VERSION_HOLD_MULTI_USER_CONFIDENTIAL_ISOLATION.md`.
- Automated Speech Recognition, microphone upload, cloud AI pronunciation scoring, and long-form speaking assessment.
- PTE / IELTS writing and speaking question types, external question banks, source licensing, and exam-corpus updates.
- Free-writing feedback and sentence-quality grading.
- Separate FSRS profiles for each Active mode unless V2 evidence justifies them.
- Daily automated backups, separate Production database project, formal disaster-recovery automation, analytics, notifications, and PWA unless their existing upgrade triggers are met.

## Stop Conditions

Stop the relevant child stage if:

- current code or provider evidence differs from this plan's assumed baseline;
- a model, price, lifecycle, term, retention statement, or provider limit cannot be verified from current official documentation;
- an AI credential would be exposed to the browser or Preview;
- global quota reservation can be bypassed by person switching, replay, concurrency, or direct provider access;
- a migration would reinterpret Active data as Recognition history or reuse Recognition parameters;
- a backup cannot represent the new state before a destructive or Production change;
- Development / Preview resolves to Production data;
- mobile acceptance reveals unreachable destructive controls or hidden task actions;
- a provider action requests an unapproved payment, plan change, credential scope, or data transmission;
- local validation fails;
- the user changes the V2 boundary or asks to pause.

## Documentation Result

This master plan closes the V2 direction at the documentation level. It makes the first AI-enabled product version, independent Active practice, daily planning, mobile refinement, and evidence-based dashboard part of the same V2 release path. It preserves V1 as the live baseline and keeps every code, schema, credential, paid-provider, migration, and Production action behind its own derived child plan and approval boundary.
