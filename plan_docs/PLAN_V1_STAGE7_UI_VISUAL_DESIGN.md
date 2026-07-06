# Words Learning App For Mimi Stage 7: UI Visual Design

Source plan: `plan_docs/PLAN_V1_MASTER.md`
Derived from: `plan_docs/PLAN_V1_STAGE6A_PRODUCTION_RELEASE_GATE.md`, the Stage 7 handoff requirements, the user-provided ChatGPT UI prompt, and the uploaded LexiCalm-style visual reference.
Scope: redesign the existing Next.js App Router UI（用户界面）for a calm, darker sage green vocabulary flashcard experience; improve mobile and desktop layouts; add gentle but tactile interaction animation（交互动效）with Motion for React; preserve existing vocabulary import, local storage, review, export, and settings behavior.
Non-Scope: no PTE / IELTS toggle implementation, no external vocabulary source, no dictionary API（应用程序接口）, no business logic rewrite, no review scheduler rewrite, no database schema（数据库结构）change, no Vercel command, no Neon command, no Production（生产环境）deployment, no Production data mutation, no authentication（认证）implementation, no PWA（Progressive Web App，渐进式 Web 应用）implementation in this substage.
Exit criteria: the Stage 7 visual system is documented and implemented locally, core routes keep existing behavior, local validation passes, and remaining visual or accessibility（可访问性）risks are recorded.

## Design Guardrail

Stage 7 is the dedicated visual design stage before any future Stage 6B Production execution. The UI work must make the existing V1 product feel coherent and comfortable without expanding the product model.

The V1 product target remains:

- import user-provided vocabulary in batches through `.txt` or pasted text
- add individual vocabulary items manually
- review vocabulary with flashcards
- preserve local export and backup
- keep simple person switching visible as data separation, not security isolation

The reference image can guide atmosphere, spacing, card rhythm, and calm progress treatment. It must not be copied exactly.

## Stage 7.2 Refinement Note

Stage 7.2 is documented in `plan_docs/PLAN_V1_STAGE7_2_UI_REFINEMENT.md`.

This child plan keeps the Stage 7.1 darker sage baseline and refines only the brand and interaction layer:

- replace the visible `LexiCalm` brand area with the local cat avatar and `咪咪 Vocabulary`
- add a Mincho（明朝体）oriented CJK（中日韩文字）system fallback without loading remote fonts
- slightly reduce desktop dashboard action-card density
- strengthen hover / tap feedback while preserving reduced-motion behavior

It does not change the V1 product scope, storage model, review scheduler, import parser, PTE / IELTS toggle boundary, external vocabulary-source boundary, PWA boundary, or Production（生产环境）execution boundary.

## Stage 7.3 Font Trial Note

Stage 7.3 is documented in `plan_docs/PLAN_V1_STAGE7_3_CHILLROUND_FONT_TRIAL.md`.

This child plan supersedes the Stage 7.2 Mincho-oriented typography trial for Chinese UI（用户界面）text. The accepted trial self-hosts ChillRoundF 寒蝉全圆体 from Warren2060/ChillRound `v3.200`, includes the upstream OFL-1.1 license, and uses ChillRoundF before local system fallbacks for CJK（中日韩文字）text. It keeps Geist for Latin interface text and does not change route behavior, import behavior, review scheduling, storage, PTE / IELTS toggle boundaries, PWA boundaries, or Production（生产环境）execution boundaries.

## Stage 7.4 Theme Toggle Note

Stage 7.4 is documented in `plan_docs/PLAN_V1_STAGE7_4_THEME_TOGGLE.md`.

This child plan keeps the darker sage design as the default `dark` theme and adds a warm sage `light` theme. The theme preference is stored under the UI-only browser `localStorage`（本地浏览器存储）key `mimi-ui-theme-v1`; it is not part of vocabulary data, people, review settings, JSON backup, CSV export, Postgres tables, API payloads, or Production（生产环境）state.

## Stage 7.5 Sound Trial Note

Stage 7.5 is documented in `plan_docs/PLAN_V1_STAGE7_5_SOFT_CLICK_SOUND_TRIAL.md`.

This child plan adds one local Kenney CC0 click asset and a Settings audition control. The preview plays at low volume through a low-pass filter（低通滤波器）to keep the click muted rather than sharp. It does not enable global button sounds, notifications, background audio, storage schema changes, backup schema changes, API（应用程序接口）changes, PTE / IELTS toggle behavior, or Production（生产环境）execution.

## Stage 7.6 Sound Design Note

Stage 7.6 is documented in `plan_docs/PLAN_V1_STAGE7_6_SOUND_DESIGN.md`.

This child plan promotes the accepted Stage 7.5 generated soft click into normal app button feedback, adds a Settings `Sound` panel with separate ON / OFF controls for button sound and review-completion sound, and adds a calm `已完成今日复习任务` modal whose `确定` button can play the user-provided Mimi custom completion sound. The sound preference is stored only as UI（用户界面）preference under `mimi-ui-sound-v1`; it is not part of vocabulary data, review history, review settings, backup schemas, Postgres tables, API payloads, notification behavior, background audio, or Production（生产环境）state.

## Prompt Drift Boundary

The user-provided prompt mentions a PTE / IELTS toggle because the reference concept mixed broader exam-prep ideas into the UI direction. For this V1 stage:

- Do not implement a real PTE / IELTS toggle.
- Do not add exam-type filtering, storage fields, routes, or import parsing behavior.
- A future design note may mention that exam-mode segmentation could be considered after V1, only if product requirements add separate content types or external vocabulary sources.
- Existing copy may mention PTE study because the original app goal is PTE vocabulary learning, but the UI must not imply that vocabulary is currently separated by exam type.

## Visual Direction

The app should feel calm, focused, and serious enough for daily study. The earlier light sage concept is useful, but this implementation should use a darker, more grounded sage palette so large surfaces do not feel washed out or sleepy.

Target qualities:

- dark-soft sage green as the main environmental color
- warm off-white and muted parchment surfaces for cards
- subdued mist blue and muted clay accents only for secondary signals
- stronger text contrast than the reference image
- spacious but not empty layout
- one clear primary action per screen when possible
- no neon colors, bright red, ranking, coins, competitive badges, or pressure copy

Suggested Stage 7 token direction:

| Role | Token Intent |
| --- | --- |
| App background | deep sage charcoal / green-gray base |
| Main surface | warm ivory card with subtle green cast |
| Elevated surface | parchment surface with soft border |
| Primary | darker sage green |
| Primary hover | deeper forest sage |
| Primary soft | muted sage wash |
| Border | low-contrast sage-gray |
| Text primary | deep green-black |
| Text secondary | muted green-gray |
| Success | sage highlight with text or icon support |
| Warning | muted amber / beige only when needed |
| Error | muted rose only, with explanatory text |

## Layout Requirements

Mobile:

- Keep bottom navigation.
- Make each route task-focused.
- Dashboard should prioritize current learner, review/start action, queue state, and recent words.
- Review should show one card at a time with comfortable answer reveal and rating controls.
- Import and library may remain denser than review, but should still use larger tap targets and clearer grouping.

Desktop:

- Use a left sidebar navigation.
- Keep the central content column visually dominant.
- Dashboard should use a composed layout with a study summary, latest word card, review schedule/queue, and quiet support panels.
- Avoid admin-dashboard density.

## Motion Direction

Stage 7 may add `motion` as a dependency. The reason is to give the app more fluid feedback than static CSS alone:

- button press should feel tactile through small scale / y movement
- cards can enter with fade and slight upward movement
- selected quiz or rating controls should show soft state changes
- dashboard cards may use gentle staggered entrance
- review answer reveal may transition without harsh jumps

Motion must stay calm:

- common tap / hover transitions around 160ms to 280ms
- card transitions around 250ms to 420ms
- easing should feel soft and direct
- no bounce-heavy, celebratory, or distracting animation
- respect `prefers-reduced-motion`; reduce transform-heavy animation for users who request it

Reference checked on 2026-07-06:

- Motion for React documentation: `https://motion.dev/docs/react`
- Motion `useReducedMotion` documentation: `https://motion.dev/docs/react-use-reduced-motion`
- React Spring documentation as an alternative: `https://www.react-spring.dev/docs/getting-started`

Chosen implementation: Motion for React, because it fits React component interaction, tap / hover gesture feedback, layout animation, and reduced motion support with a small focused dependency.

## Route-Level Implementation Plan

1. Visual foundation
   - Update `src/app/globals.css` with Stage 7 tokens and reusable classes.
   - Keep Tailwind CSS 4 as the styling base.
   - Add motion-safe and reduced-motion behavior.

2. App shell
   - Keep `src/components/app-shell.tsx` as the shared shell.
   - Add desktop sidebar and mobile bottom navigation styling.
   - Make selected route visible without adding product state.

3. Dashboard
   - Redesign `src/components/vocabulary/home-dashboard.tsx` around existing local data.
   - Use real counts from active, archived, review states, settings, and selected person.
   - Avoid fake weekly data. If a chart-like element appears, it must be derived from available data or be framed as a quiet static support pattern without pretending to be real analytics.

4. Review
   - Redesign `src/components/review/review-session.tsx`.
   - Preserve the four existing review ratings and `recordReview()` behavior.
   - Add calm card reveal, progress, rating button feedback, and session-complete state.

5. Forms and data-work routes
   - Restyle add, import, library, export, and settings components.
   - Preserve form names, data writes, parser behavior, backup behavior, archive / restore behavior, and person switching behavior.

6. Documentation sync
   - Update changelog and AI agent log after implementation.
   - Update master / architecture docs only if Stage status or implementation summary changes.

## Validation Plan

Local validation:

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```

Manual / visual validation:

- Run local dev server after implementation.
- Check mobile width and desktop width.
- Confirm core routes render.
- Confirm review flow still records a rating.
- Confirm import preview still parses pasted text.
- Confirm reduced-motion CSS does not leave the UI visually broken.

No remote validation is part of this substage.
