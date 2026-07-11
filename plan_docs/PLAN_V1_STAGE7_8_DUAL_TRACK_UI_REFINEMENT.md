# Words Learning App For Mimi Stage 7.8: Dual-Track UI Refinement

Source plan: `plan_docs/PLAN_V1_MASTER.md`
Derived from: `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md`, `plan_docs/PLAN_V1_STAGE7_7_FINAL_ACCEPTANCE.md`, and the user-confirmed 2026-07-06 request to refine the current UI（用户界面）composition around future Recognition Vocabulary（阅读词汇）and Active Vocabulary（输出词汇）tracks before any Stage 6B Production（生产环境）execution.
Scope: refine local V1 UI composition, navigation（导航）, dashboard hierarchy, library filters, soft tags, mastery-dimension labels, and the cat Home Brand Button while preserving the existing soft sage, calm, low-stress visual style and fluid interaction animation（交互动效）.
Non-Scope: no AI API（人工智能接口）, no dictation engine（听写引擎）, no spelling checker（拼写检查器）, no writing feedback model, no real Recognition / Active persisted classification, no PTE / IELTS persisted toggle, no business logic（业务逻辑）change, no review scheduler（复习调度算法）change, no database schema（数据库结构）change, no API contracts（API 契约）change, no storage schema change, no JSON backup schema change, no CSV export change, no Postgres table change, no Vercel command, no Neon command, no Production deployment, no Production data mutation, no merge（合并）to `main`, no authentication（认证）, no analytics（分析追踪）, no notification, no background audio, and no 付费/扣款 feature.
Exit criteria: V1 dashboard clearly presents a Today Hub with Recognition and Active learning tracks; Practice Lab / 练习室 is visible as a planned calm module; sidebar navigation centers daily learning; Library prepares All Words / Recognition / Active / Weak Words / Archived filters and mastery labels; the cat brand area behaves like an accessible Home Brand Button; local validation passes; docs and logs record that this is UI-only V1 preparation, with actual Active Vocabulary behavior deferred to V2 or a later approved stage.

## Product Direction

V1 should make the future learning model visible before formal Stage 6B:

- Recognition Vocabulary is the current closest fit to the existing V1 review flow. It focuses on recognizing word meaning and example context. Daily volume can be higher.
- Active Vocabulary is a future output track for listening, spelling, sentence recall, and writing usage. Daily volume should be lower and more focused.
- The UI may reserve space for later active-practice work, but it must not imply that AI feedback, audio generation, real dictation, or persisted track assignment already exists.

## Implementation Decisions

- Dashboard becomes a Today Hub instead of a single generic progress surface.
- Recognition card uses the existing local review-session progress: reviewed today / current session limit.
- Active card shows a calm reserved target and links to Practice Lab. It does not create, classify, or mutate study data.
- Practice Lab is a route-level entry for planned Active Vocabulary practice. It is intentionally quiet and does not contain AI-heavy visuals.
- Main navigation becomes:
  - Dashboard / 首页
  - Study / 学习
  - Review / 复习
  - Library / 词库
  - Practice Lab / 练习室
  - Import / 导入
  - Settings / 设置
- `/add` and `/export` remain available routes, but they are demoted into Study, Library, and Quiet Tools rather than main navigation.
- Library filters prepare All Words, Recognition, Active, Weak Words, and Archived. Recognition maps to current non-archived V1 words. Active remains a reserved view until a later data model exists.
- Word items display soft tags for current context and mastery dimensions. Meaning is the current V1 usable dimension; Listening, Spelling, and Usage are muted future-ready labels.
- The cat image remains roughly the same visual size and becomes an intentional Home Brand Button with pointer cursor, subtle hover lift, soft border / focus highlight, and tiny press scale. The accessible label is `Go to dashboard`.

## Safety Notes

- This stage is local UI and documentation work only.
- The added `/study` and `/practice-lab` routes are presentational entry points. They do not add data writes, scheduler behavior, API endpoints, remote services, or persistent schema.
- Active Vocabulary remains an information-architecture reservation. It is not a stored category in V1.
- Any later real Active Vocabulary implementation must start from a separate plan that handles data model, backup/export semantics, scheduler impact, audio/AI boundaries, and privacy.

## Validation Plan

Local validation:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
npm run governance:preflight
```

Route smoke checks:

- `/`
- `/study`
- `/review`
- `/library`
- `/practice-lab`
- `/import`
- `/settings`
- existing quiet routes `/add` and `/export`

Manual / browser focus:

- Confirm cat Home Brand Button has hover / active / focus-visible state and keeps the same visual role.
- Confirm Today Hub is visually dominant.
- Confirm Practice Lab appears planned rather than broken.
- Confirm Library filters and mastery tags do not imply persisted Active Vocabulary classification.

## Implementation Record

Status: executed locally on 2026-07-06 23:39 AEST.

Implemented:

- Dashboard now centers a Today Hub with Recognition Vocabulary and Active Vocabulary cards.
- Recognition uses current local review progress; Active is a reserved track linked to Practice Lab.
- Main navigation now centers dashboard, study, review, library, practice lab, import, and settings.
- `/study` and `/practice-lab` are presentational local routes.
- `/add` and `/export` remain available as quieter tools.
- Library now prepares All Words, Recognition, Active, Weak Words, and Archived filters plus soft tag and mastery labels.
- Cat avatar brand link now has the accessible label `Go to dashboard`, pointer cursor, hover lift, active press scale, and focus-visible highlight.

Validation:

- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: `npm run test` with 14 files and 52 tests.
- Passed: `npm run backup:dry-run:fixture`.
- Passed: `npm run build`.
- Passed: route smoke checks for `/`, `/study`, `/review`, `/library`, `/practice-lab`, `/import`, `/settings`, `/add`, and `/export`.
- Passed: focused in-app browser checks for `/`, `/library`, and `/practice-lab`; no development overlay text or horizontal overflow was detected.
- Passed: `git diff --check`.
- Passed: `npm run governance:preflight`.

Residual risks / deferred work:

- At Stage 7.8 completion time, Active Vocabulary remained UI-only with no persisted track assignment.
- Practice Lab is a planned module entry, not an active dictation, spelling, writing, or AI feedback workflow.
- Stage 7.9 later added local `learningTrack`, nullable `tags`, schema version 4 backup/export semantics, and recognition-only scheduler filtering in `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`.
- Practice Lab, dictation, spelling, writing usage, AI feedback, and remote database migration still need separate later plans.
