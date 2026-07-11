# Words Learning App For Mimi Stage 7.2: UI Refinement

Source plan: `plan_docs/PLAN_V1_MASTER.md`
Derived from: `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md`, the committed Stage 7.1 UI（用户界面）visual design baseline, and the user-provided cat avatar image.
Scope: refine the local Stage 7 UI by replacing the LexiCalm wordmark with the Mimi cat avatar brand area, changing Chinese rendering toward Mincho（明朝体）, reducing desktop dashboard action-card density, and strengthening fluid hover / tap interaction feedback（交互反馈）.
Non-Scope: no route changes, no PTE / IELTS toggle implementation, no external vocabulary source, no import parser change, no review scheduler change, no database schema（数据库结构）change, no Vercel command, no Neon command, no Production（生产环境）deployment, no Production data mutation, no authentication（认证）implementation, no PWA（Progressive Web App，渐进式 Web 应用）implementation.
Exit criteria: the brand area shows the local cat avatar with `咪咪 Vocabulary`, Chinese text uses a Mincho-oriented system fallback, desktop dashboard action cards are less visually heavy, hover / tap feedback is more fluid, local validation passes, and browser visual checks confirm mobile and desktop routes remain usable.

## Design Adjustments

Stage 7.2 keeps the darker soft sage system from Stage 7.1. This substage should make the app feel more personally tied to Mimi while preserving the calm vocabulary-study atmosphere.

Brand:

- Replace the `LexiCalm` wordmark in the sidebar and mobile header.
- Use the user-provided cat image as a local static asset under `public/brand/`.
- Display the brand text as `咪咪 Vocabulary`.
- Keep the avatar treatment soft, compact, and consistent with the sage palette.

Typography:

- Keep Geist for Latin interface text where available.
- Add a Mincho-oriented CJK（中日韩文字）fallback stack so Chinese characters render closer to Japanese-style print Mincho.
- Prefer system fonts first; do not add a remote font provider in this substage.
- Keep English vocabulary words readable and distinct from Chinese explanatory text.

Dashboard density:

- Slightly reduce desktop homepage action-card width / padding.
- Preserve mobile tap targets near 44px or above.
- Keep the central study summary dominant.

Motion:

- Strengthen hover feedback on interactive cards, nav items, and buttons.
- Use small lift / scale / shadow changes, not flashy animation.
- Keep `prefers-reduced-motion` behavior.

## Validation Plan

```bash
npm run governance:preflight
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
```

Manual / visual validation:

- Check `/` on desktop and mobile.
- Confirm the cat avatar renders from the local asset.
- Confirm `LexiCalm` no longer appears in the visible brand area.
- Confirm mobile has no horizontal overflow.
- Confirm hover / tap feedback remains gentle and not distracting.

## Implementation Record

Executed locally on 2026-07-06 15:09 AEST.

Follow-up note: Stage 7.3 in `plan_docs/PLAN_V1_STAGE7_3_CHILLROUND_FONT_TRIAL.md` supersedes only this substage's Mincho（明朝体）oriented typography choice. The brand, card-density, hover / tap feedback, and non-scope boundaries from Stage 7.2 remain in force.

Changed implementation:

- Added `public/brand/mimi-cats.png` from the user-provided local image.
- Added a shared `BrandIdentity` component for the desktop sidebar and mobile header.
- Removed visible `LexiCalm` brand text from the app shell and navigation brand area.
- Added `咪咪 Vocabulary` brand text with a Mincho-oriented CJK system font fallback.
- Reduced desktop dashboard action-card width / padding / icon size.
- Strengthened hover / tap feedback on cards, brand block, navigation items, and buttons while preserving `prefers-reduced-motion`.

Validation result:

- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: `npm run test` with 13 files and 48 tests.
- Passed: `npm run build`.
- Passed: `git diff --check`.
- Passed: local browser visual checks for desktop and mobile `/`: cat image loaded, `咪咪 Vocabulary` visible, `LexiCalm` absent from body text, no horizontal overflow, mobile bottom navigation visible, and browser console had no error / warning logs.
- Note: automated hover-position probing in the in-app browser did not report a measurable bounding-box shift, likely because the probe did not trigger the React hover state in that browser automation surface. The code-level hover and tap feedback is present in CSS and Motion for React.

Safety result:

- Local UI（用户界面）and documentation changes only.
- No Vercel command, Neon command, database command, env var read/change, GitHub push, merge（合并）to `main`, Production（生产环境）deployment, Production migration, Production import, PTE / IELTS toggle implementation, external vocabulary source, authentication（认证）, analytics（分析追踪）, AI generation, PWA（Progressive Web App，渐进式 Web 应用）, email, notification, or 付费/扣款 feature was performed.
