# Words Learning App For Mimi V2 Stage 4: Mobile Foundation And Copy

Created: 2026-07-14 10:38 AEST
Last updated: 2026-07-14 11:14 AEST

Source plan:

- `plan_docs/PLAN_V2_MASTER.md`

Derived from:

- `plan_docs/PLAN_V2_MASTER.md`
- `plan_docs/PLAN_V2_STAGE3_1_REVIEW_INTERACTION_CONTEXT_WORD_ACTIONS.md`
- `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md`
- `plan_docs/PLAN_V1_STAGE7_8_DUAL_TRACK_UI_REFINEMENT.md`
- `plan_docs/PLAN_V1_STAGE7_9_DUAL_TRACK_DATA_IMPORT.md`
- `plan_docs/PLAN_V1_STAGE7_10_LIBRARY_REVIEW_CONTROLS.md`
- `plan_docs/PLAN_V1_STAGE7_11_REVIEW_ROLLBACK_AUTO_REFRESH.md`
- `ARCHITECTURE.md`
- the user's confirmed V2 mobile/copy direction and 2026-07-14 motion/screenshot clarifications

Scope:

- Close the current 768–1023 px navigation gap and make primary navigation continuously available from 320 px through desktop.
- Use the mobile primary navigation `Home`, `Study`, `Review`, `Library`, and `More`; expose `Add Words`, `Practice Lab`, `Settings`, and `Backup` inside an accessible responsive `More` panel.
- Make bottom navigation, responsive panels, confirmation dialogs, page content, and focused fields respect device Safe Area（安全区）and Software keyboard（软键盘）space.
- Replace the narrow-screen Batch import table with editable touch-friendly preview cards while retaining a compact editable table at desktop width.
- Improve the mobile layout of ordinary forms, Library controls, Backup restore preview, Review dialogs, and presentational Practice Lab cards without changing their data meaning.
- Align the presentational Active cards with the accepted future modes `Say it`, `Spell it`, and `Dictation`; remove the out-of-scope writing/sentence-practice promise.
- Reduce visible copy and apply short English-first labels to ordinary navigation and learning actions while preserving bilingual or Chinese safety copy where irreversible data changes need it.
- Preserve exact `Batch imported` source chips, the cat Home Brand Button, the soft sage visual language, both themes, and accessible focus states.
- Preserve fluid normal-mode interaction. Under `prefers-reduced-motion`, reduce conspicuous translation, scale, and long travel while retaining brief opacity, color, border, and surface transitions so state changes remain visually continuous.
- Add focused structural tests and synchronize the V2 master, architecture, README, AGENTS, changelog, and AI log.

Non-Scope:

- No V2-5 daily Review/New Words zones, daily metric calculation, daily Snapshot, goal editing, removal of the current 1–80 settings limit, or whole-day transactional reset implementation.
- No V2-6 Active practice engine, Active FSRS-6（Free Spaced Repetition Scheduler 6，自由间隔重复调度器第 6 版）state/events, typed-answer comparison, dictation playback, or Recognition headword `Listen` button.
- No V2-7 AI route, Gemini call, generated content, disclosure flow, quota ledger, credential, paid usage, WAF（防火墙）, or Kill Switch（紧急关闭开关）implementation.
- No V2-8 compact data Dashboard, chart, prediction, learning rhythm, or memory outlook implementation.
- No change to Stage 3.1 card reveal/hide rules, rating semantics, example-token actions, first-reveal timing, Review queue, rollback, reset meaning, or scheduler behavior.
- No schema/data-shape change, SQL migration, backup-version change, remote database connection, persistent remote-data mutation, Vercel change, deployment, commit, push, pull request, or merge.
- No SSO（Single Sign-On，单点登录）, public registration, confidential multi-user isolation, PTE/IELTS switch, writing question type, speaking question type, microphone capture, or Speech Recognition（语音识别）.

Exit criteria:

- At every accepted width, at least one primary navigation surface is visible: bottom navigation below 1024 px and desktop rail from 1024 px upward. There is no 768–1023 px navigation gap or duplicate primary navigation at 1024 px.
- Mobile primary navigation is exactly `Home`, `Study`, `Review`, `Library`, and `More`; `More` exposes `Add Words`, `Practice Lab`, `Settings`, and `Backup`, indicates an active child route, closes on navigation/Escape/backdrop, traps focus while open, and returns focus to its trigger.
- The bottom navigation and main page padding include `env(safe-area-inset-bottom)`; no bottom action or final content is hidden behind the navigation or device Safe Area.
- Responsive dialogs use a bottom-sheet composition on narrow screens and a centered composition at wider screens, fit within the dynamic viewport, retain internal scrolling, lock background scrolling, and keep primary actions reachable when a field is focused.
- Batch import candidates render as editable cards below 1024 px and as the existing multi-column editing table from 1024 px upward. Both layouts edit the same candidate state and preserve selection, validation, duplicate, Track, meaning, example, tag, rarity, and save behavior.
- Page/forms remain free of horizontal document overflow at 320, 375, 390, 768, 820, 1023, 1024, and a representative desktop width. Touch actions remain at least 44 px high where practical.
- Presentational Practice Lab cards are `Say it`, `Spell it`, and `Dictation`; they make their resting/unavailable state clear without implying completed V2-6 functionality or promising writing/speaking exam questions.
- Ordinary navigation, headings, form actions, empty states, and explanatory copy are concise and English-first. Developer-oriented words such as visible `V1`, `local flow`, `empty array`, `null`, and `schema` are absent from ordinary learning flows; technical JSON field guidance is contained under `Example format`.
- `Batch imported`, destructive-action meaning, two-gate whole-day reset copy, backup-replacement warning, cat Home Brand Button, theme semantics, and Stage 3.1 interaction behavior remain intact.
- Normal motion retains the current calm 180–240 ms fluidity. Reduced-motion mode removes attention-demanding movement while preserving brief non-spatial feedback; neither mode loses active, hover, focus, dialog, or navigation state clarity.
- Local lint, typecheck, tests, all backup fixture dry-runs, Production build, Tier 3 governance preflight, final diff checks, and browser acceptance pass.
- Final handoff includes at least one 390 px mobile screenshot plus one additional narrow-screen or open-`More`/dialog screenshot so the user can inspect the implemented phone experience directly.

Status: complete locally on 2026-07-14. No external-service, remote-database, credential, Production, or deployment action occurred.

## Decision Summary

Stage 4 establishes one mobile shell that later daily learning, Active practice, AI, and Dashboard work can reuse. It resolves the current breakpoint gap and touch-layout problems without pulling later product engines into this stage.

The normal visual experience remains soft and fluid. `prefers-reduced-motion` is treated as a request to reduce spatial movement, not as a command to remove every transition. Color, border, shadow, and short opacity feedback remain available where they help a state change read naturally.

## Navigation Contract

### Breakpoints

- `0–1023 px`: mobile/tablet header plus fixed bottom navigation.
- `1024 px and above`: desktop sidebar; the bottom navigation and mobile `More` panel are unavailable.
- `768–1023 px` is an intentional tablet range with the same five-item bottom navigation, not an empty transition band.

### Primary mobile items

1. `Home` -> `/`
2. `Study` -> `/study`
3. `Review` -> `/review`
4. `Library` -> `/library`
5. `More` -> responsive local panel

`More` contains:

- `Add Words` -> `/import`
- `Practice Lab` -> `/practice-lab`
- `Settings` -> `/settings`
- `Backup` -> `/export`

When the active route is one of these four destinations, the `More` navigation item is visibly active. Opening `More` does not navigate or change study data.

## Responsive Surface Contract

### Shared dialog behavior

- A small shared responsive-dialog primitive may centralize Escape handling, focus containment/restoration, background scroll locking, backdrop dismissal, dynamic-height limits, and Safe Area padding.
- Narrow screens use a rounded-top bottom sheet; `sm` and wider screens may use a centered card where content permits.
- Destructive confirmations retain explicit `YES` / `NO` controls and their existing meaning. Stage 4 changes layout and focus behavior only.
- The existing Stage 3.1 example-word sheet may adopt the shared layout contract only if its accepted exact behavior and tests stay unchanged.

### Forms and keyboard

- Page and dialog form controls remain full-width on narrow screens and never depend on horizontal scrolling.
- Text inputs and textareas use at least 16 px text on phone widths to avoid accidental browser zoom behavior.
- The focused field, validation message, and next primary action remain reachable within the dynamic viewport.
- Fixed navigation must not cover the last focusable field or action after the keyboard closes.

### Batch preview

- Candidate state remains single-source; card and table renderers do not create separate draft copies.
- Below 1024 px, each candidate card groups selection/status, word/Track, meanings, examples, tags, and optional rarity in a readable vertical order.
- From 1024 px, the existing compact table remains available for high-density editing.
- Summary counts and `Save selected` remain visible without requiring horizontal page scrolling.

## English-First Copy Contract

Ordinary surface examples:

| Existing direction | Stage 4 direction |
| --- | --- |
| `首页` | `Home` |
| `学习` | `Study` |
| `复习` | `Review` |
| `词库` | `Library` |
| `导入` | `Add Words` |
| `设置` | `Settings` |
| `保存词条` | `Save word` |
| `生成预览` | `Preview words` |
| `确认保存` | `Save selected` |

These mappings do not force safety-critical copy into English-only form. Irreversible deletion, whole-day reset, and backup replacement may remain Chinese or bilingual for clarity.

The visible Batch import guide keeps one short instruction and places the actual JSON keys and nullable/array rules inside `Example format`. `Batch imported` remains unchanged everywhere.

## Motion Contract

### Normal motion

- Preserve short 180–240 ms easing, active-navigation surface movement, gentle panel entry, hover lift, and button press feedback.
- Avoid large travel, bounce-heavy motion, long entrance sequences, or animation that delays a learning action.

### Reduced motion

- Remove or greatly reduce translation, scale, layout-travel, and background parallax.
- Retain short opacity, color, border, and shadow changes so focus, active state, opening/closing, and successful action feedback do not feel abrupt.
- Do not globally force every transition to 1 ms; component movement is reduced selectively.

## Expected Files

Documentation and status:

- `plan_docs/PLAN_V2_STAGE4_MOBILE_FOUNDATION_COPY.md`
- `plan_docs/PLAN_V2_MASTER.md`
- `ARCHITECTURE.md`
- `README.md`
- `AGENTS.md`
- `CHANGELOG.md`
- `governance/AI_AGENT_LOG.md`

Likely application files:

- `src/lib/stage-two-data.ts`
- `src/components/app-nav.tsx`
- `src/components/app-shell.tsx`
- `src/components/ui/responsive-dialog.tsx`
- `src/app/globals.css`
- `src/components/vocabulary/import-workspace.tsx`
- `src/components/vocabulary/vocabulary-library.tsx`
- `src/components/export/export-workspace.tsx`
- `src/components/review/review-session.tsx`
- `src/app/page.tsx`
- `src/app/study/page.tsx`
- `src/app/review/page.tsx`
- `src/app/library/page.tsx`
- `src/app/import/page.tsx`
- `src/app/practice-lab/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/export/page.tsx`

The implementation may omit an expected file when inspection shows no change is required. New files remain limited to a small shared UI primitive and focused tests.

## Validation Plan

Static and behavioral validation:

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run backup:dry-run:fixture
npm run backup:dry-run:schema5-fixture
npm run backup:dry-run:schema6-fixture
npm run build
git diff --check
```

Browser acceptance uses a forced-local isolated localhost origin and disposable browser data. Required widths:

- 320 px
- 375 px
- 390 px
- 768 px
- 820 px
- 1023 px
- 1024 px
- representative desktop width

Required routes and states:

- Home shell and bottom/desktop navigation
- `More` closed/open/keyboard/Escape/navigation behavior
- Study and resting Practice Lab cards
- Review card plus existing Stage 3.1 reveal/actions and confirmation dialogs
- Library search/edit/actions/confirmation dialog
- Add Words single form, Batch input, empty preview, and populated editable preview
- Settings forms
- Backup download and restore-preview surfaces without executing a destructive restore
- dark and light themes
- normal and reduced-motion modes

Checks:

- meaningful content and no framework error overlay;
- no browser console error/warning attributable to Stage 4;
- no horizontal document overflow;
- no missing navigation at any accepted width;
- no duplicated navigation at 1024 px;
- reachable 44 px touch actions;
- visible focus order, Escape/backdrop behavior, focus containment/restoration, and scroll lock;
- content and actions clear the bottom Safe Area;
- focused form fields and primary actions remain reachable around the Software keyboard boundary;
- 390 px and additional narrow/open-panel screenshots saved outside tracked source unless the user later requests a committed artifact.

## Implementation And Acceptance Outcome

- Mobile/tablet navigation now remains available through 1023 px with exactly `Home`, `Study`, `Review`, `Library`, and `More`; the desktop rail takes over at 1024 px without overlap or a missing-navigation band.
- `More`, Review completion/reset surfaces, and Library confirmations use one responsive dialog primitive with Escape handling, focus containment/restoration, background scroll lock, dynamic viewport limits, and Safe Area padding.
- Batch candidates use one shared state with editable cards below 1024 px and one editable table from 1024 px. A desktop hidden-input containment defect found during browser acceptance was corrected so the scrollable table no longer expands the document.
- Ordinary navigation, page headings, actions, settings, import, Library, Review, and Backup copy is shorter and English-first. `Batch imported`, destructive Chinese warnings, the cat Home Brand Button, both themes, and Stage 3.1 Review behavior remain intact.
- Active presentation now names only `Say it`, `Spell it`, and `Dictation` and clearly remains resting until V2-6. No false Active progress or AI-generated result is shown.
- Normal interaction retains a measured 200 ms transition on the mobile navigation. Reduced motion keeps 120 ms animation and non-spatial visual feedback while removing the defined hover/press translations; it does not collapse the interface into abrupt 1 ms changes.
- Browser acceptance passed at 320, 375, 390, 768, 820, 1023, 1024, and 1280 px with no document-level horizontal overflow, missing navigation, duplicate breakpoint navigation, browser warning/error, or framework error overlay. Mobile navigation targets measured 56 px high.
- Focused browser checks passed for `More` focus wrap/Escape/focus return, responsive dialog scroll lock, mobile completion and delete confirmations, card-body answer reveal, the four rating actions, all primary routes, dark/light themes, populated Batch cards, desktop Batch table, and the resting Practice Lab mode set.
- A disposable local Recognition entry was created, reviewed, reset, inspected in Library, and removed only inside the isolated `127.0.0.1:3001` browser origin. The forced-local storage API rejected server persistence, and no remote data was read or changed.
- The browser harness cannot summon a real iOS or Android Software keyboard. Dynamic viewport, internal scrolling, 16 px phone inputs, bottom clearance, and focus reachability were validated structurally; physical-device keyboard behavior remains a final release-stage recheck.
- The current V1 `重置今日复习任务` control retains its existing single confirmation and meaning. The accepted two-gate whole-day learning reset remains reserved for V2-5 and was not pulled into Stage 4.
- Final local validation passed: ESLint, TypeScript, 32 test files / 207 tests with the existing Postgres integration test intentionally skipped, all three backup fixture dry-runs, and the Next.js Production build.
- User-facing screenshots are stored outside tracked source under `/Users/anoria/.codex/visualizations/2026/07/12/019f5666-33bb-7b00-9a86-f9f416237386/learningWordsformimi-stage4/`.

## Safety Boundary

- Run the local app only with storage forced to the browser-local path on an isolated localhost origin.
- Do not load `.env` files or inspect, print, copy, hash, or modify secrets.
- Do not call Gemini or any external provider.
- Do not connect to Development, Staging, Preview, or Production databases.
- Do not execute the unexecuted Schema Version 6 SQL migration.
- Do not restore, delete, or reset existing user study data during browser acceptance; use disposable isolated data only.
- Do not change Vercel, Production, GitHub remote state, or deployment state.
