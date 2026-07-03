# Words Learning App For Mimi PLAN V1 Master

Created: 2026-07-02 23:30 AEST
Last updated: 2026-07-04 01:14 AEST

Source plan:

- User request in the current Codex thread on 2026-07-02.

Derived from:

- `/Users/anoria/.codex/skills/human-ai-governance/SKILL.md`
- `/Users/anoria/.codex/skills/human-ai-governance/references/governance-patterns.md`
- `AGENTS.md`
- `ARCHITECTURE.md`

Input evidence:

- User wants a web app for girlfriend's PTE vocabulary study.
- User provided GitHub repository URL: `https://github.com/huaixuanhu/words-learning-app-for-mimi.git`

Consumer / next stage:

- Future product design child plan.
- Future technical implementation child plan.
- Future deployment plan.

Document nature:

This is the parent product and implementation plan. Child plans must cite this file in `Source plan` and state their scope, non-scope, and exit criteria.

## Scope

- Build a vocabulary learning web app for adding words, storing study context, and reviewing flashcards.
- Support both manual entry and first-version `.txt` text file import.
- Record creation time and review history.
- Let the user input self-rated rarity, while keeping it separate from proficiency.
- Use Spaced Repetition（间隔重复）and a practical Forgetting Curve（遗忘曲线）model to schedule review.
- Prepare for GitHub and Vercel deployment after local validation.
- Keep personal study data private and exportable.

## Non-Scope

- No production deployment without separate approval.
- No remote database migration without separate approval.
- No paid service setup without separate approval.
- No AI-generated definitions or examples until data sharing and quality boundaries are designed.
- No multi-user social features in the MVP.
- No `.docx` or PDF import in the first version.

## Governance Baseline

- Start as Tier 1 durable small app.
- Upgrade to Tier 3 before credentials, production services, external data sharing, or destructive persistent-data operations.
- Keep `AGENTS.md`, `ARCHITECTURE.md`, `CHANGELOG.md`, and `governance/AI_AGENT_LOG.md` updated when project boundaries change.

## Product Principles

- Daily capture must be faster than handwriting.
- Review sessions should feel light enough to use on a phone.
- Scheduling should be explainable to the learner.
- The app should preserve context, because PTE vocabulary is often learned from task-specific sentences.
- Export and backup matter from the start.

## Stage Plan

### Stage 0: Governance Bootstrap

Exit criteria:

- `AGENTS.md` exists.
- `ARCHITECTURE.md` exists.
- `CHANGELOG.md` exists.
- `governance/AI_AGENT_LOG.md` exists.
- This master plan exists.

### Stage 1: Product Design And MVP Definition

Exit criteria:

- Define first-screen workflow.
- Define add-word fields.
- Define `.txt` import workflow.
- Define flashcard feedback buttons.
- Define MVP storage strategy.
- Define privacy and export behavior.
- Identify initial validation commands.

### Stage 2: App Scaffold

Exit criteria:

- Local app runs.
- Package manager and framework are locked in.
- Core routes or screens exist.
- Basic visual design supports mobile use.
- First smoke test path is documented.

### Stage 3: Vocabulary CRUD

Status: implemented locally on 2026-07-04 in `plan_docs/PLAN_V1_STAGE3_VOCABULARY_CRUD_IMPORT.md`.

Exit criteria:

- Add, edit, archive, search, and list vocabulary items.
- Import a batch of words from `.txt` or pasted text after preview.
- Record timestamps.
- Handle duplicate candidates.
- Validate empty and malformed input.

### Stage 4: Review Scheduler And Flashcards

Exit criteria:

- Due cards are selected deterministically.
- Review feedback updates next due time.
- Missed-day backlog is smoothed.
- Edge cases are tested.

### Stage 5: Persistence, Export, And Backup

Exit criteria:

- Storage provider is chosen through a documented plan.
- Data model is implemented with migrations if needed.
- CSV or JSON export works.
- Import/export round trip is validated.

### Stage 6: GitHub And Vercel Deployment

Exit criteria:

- Local git repository is initialized or connected with human approval.
- Remote push is performed with human approval.
- Vercel project is connected with human approval.
- Deployment environment variables are documented but never committed.
- Production smoke test is completed.

### Stage 7: Polishing And Optional PWA

Exit criteria:

- Mobile interaction is comfortable.
- PWA installability is evaluated.
- Review session performance is checked.
- Remaining accessibility issues are documented.

## Scheduling Strategy

MVP scheduler should prioritize clarity:

- New words get short first intervals.
- Correct reviews increase interval.
- Failed reviews shorten interval and increase priority.
- New words do not have initial proficiency.
- The first review rating creates the first meaningful review state.
- Self-rated rarity may help sorting or backlog priority, but it must not pretend to know proficiency.
- Actual review feedback drives scheduling over time.

FSRS（Free Spaced Repetition Scheduler，自由间隔重复调度算法）is a candidate later. It should be introduced only after reviewing library fit, data requirements, and migration impact.

## Data And Privacy Assumptions

- Default user model is private single-user.
- Study data includes words, examples, import batches, self-rated rarity, review timestamps, and performance.
- No third-party data sharing by default.
- Export should exist before production-only persistence becomes the only storage path.

## Open Questions

- Should the MVP require login or stay single-user behind a private URL first?
- Should definitions be manually entered only, or can a dictionary source be added later?
- Should examples support audio or images in a later stage?
- Should the first database be local SQLite for development, Postgres for production, or a single Postgres path from the start?
- What daily review load feels right for Mimi?
- What `.txt` import shape does Mimi naturally produce: one word per line, comma-separated, or word plus Chinese meaning?

## Child Plan Rule

Every derived plan must begin with:

- `Source plan: plan_docs/PLAN_V1_MASTER.md`
- `Derived from: <relevant docs>`
- `Scope`
- `Non-Scope`
- `Safety / Side Effects`
- `Exit Criteria`
