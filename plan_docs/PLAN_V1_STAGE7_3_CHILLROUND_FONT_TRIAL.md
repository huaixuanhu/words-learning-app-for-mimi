# Words Learning App For Mimi Stage 7.3: ChillRound Font Trial

Source plan: `plan_docs/PLAN_V1_MASTER.md`
Derived from: `plan_docs/PLAN_V1_STAGE7_2_UI_REFINEMENT.md`, the user request to try Warren2060/ChillRound 寒蝉全圆体, and the upstream repository `https://github.com/Warren2060/ChillRound`.
Scope: replace the Stage 7.2 Mincho（明朝体）oriented CJK（中日韩文字）fallback with self-hosted ChillRoundF 寒蝉全圆体 for Chinese UI（用户界面）text, while preserving the existing darker sage visual system, Mimi cat brand area, local vocabulary import, and flashcard review behavior.
Non-Scope: no route changes, no PTE / IELTS toggle implementation, no external vocabulary source, no import parser change, no review scheduler change, no database schema（数据库结构）change, no Vercel command, no Neon command, no Production（生产环境）deployment, no Production data mutation, no authentication（认证）implementation, no PWA（Progressive Web App，渐进式 Web 应用）implementation.
Exit criteria: ChillRoundF is self-hosted from the upstream OFL-1.1 release, the license is included in the repository, Chinese UI text uses ChillRoundF before system fallbacks, Latin interface text remains readable, local validation passes, and browser checks confirm the font asset loads without layout breakage.

## Source Verification

Checked on 2026-07-06:

- Upstream repository: `https://github.com/Warren2060/ChillRound`.
- Upstream license: SIL Open Font License 1.1, with reserved font names `ChillRoundF` and `ChillRoundM`.
- Upstream release list includes `v3.200` named `寒蝉全圆体v3.200`.
- The `v3.200` asset `ChillRoundF_v3.200.zip` includes `ChillRoundFRegular.ttf`, bold variants, otf variants, a PDF update note, and `LICENSE.txt`.

Chosen asset:

- `ChillRoundFRegular.ttf` from `ChillRoundF_v3.200.zip`.

Reason:

- It is the requested full-round ChillRoundF family, not the semi-round ChillRoundM family.
- Regular weight is enough for this UI trial and avoids adding both regular and bold CJK font files before visual acceptance.
- Self-hosting avoids a third-party font CDN and keeps the app usable offline after load.

## Implementation Plan

1. Add the regular font asset under `public/fonts/chillround/`.
2. Add the upstream OFL license text next to the font asset.
3. Add `@font-face` in `src/app/globals.css`.
4. Replace the Stage 7.2 Mincho-oriented variable with a ChillRound-oriented CJK stack.
5. Keep Geist first for Latin text, then use ChillRoundF for Chinese characters.
6. Update documents and logs to record the source, license, and validation.

## Validation Plan

```bash
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
npm run governance:preflight
```

Manual / visual validation:

- Check `/` on desktop and mobile.
- Confirm `ChillRoundF` font asset returns HTTP 200.
- Confirm computed `font-family` for `咪咪 Vocabulary` includes `ChillRoundF`.
- Confirm cat avatar and existing Stage 7.2 layout still render.
- Confirm browser console has no font-loading errors.

## Implementation Record

Executed locally on 2026-07-06 15:22 AEST.

Changed implementation:

- Added `public/fonts/chillround/ChillRoundFRegular.ttf` from upstream release `v3.200`.
- Added `public/fonts/chillround/OFL-1.1.txt` from the same upstream release package.
- Added `@font-face` for `ChillRoundF` in `src/app/globals.css`.
- Replaced the Stage 7.2 Mincho-oriented CJK stack with `--font-cjk-rounded`, where `ChillRoundF` is the first CJK（中日韩文字）font before local system fallbacks.
- Preserved Geist as the first Latin UI（用户界面）font.

Validation result:

- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: `npm run test` with 13 files and 48 tests.
- Passed: `npm run build`.
- Passed: `git diff --check`.
- Passed: local HTTP check for `/fonts/chillround/ChillRoundFRegular.ttf`, returning HTTP 200 with `Content-Type: font/ttf` and `Content-Length: 6205268`.
- Passed: local HTTP check for `/fonts/chillround/OFL-1.1.txt`, returning HTTP 200 with `Content-Type: text/plain; charset=UTF-8`.
- Passed: local browser checks for desktop and mobile `/`: `咪咪 Vocabulary` computed `font-family` begins with `ChillRoundF`, `LexiCalm` is absent from body text, cat avatar renders, no horizontal overflow, mobile navigation remains visible, and browser console has no warning / error logs.

Safety result:

- Local font asset, CSS（层叠样式表）, and documentation changes only.
- No Vercel command, Neon command, database command, env var read/change, GitHub push, merge（合并）to `main`, Production（生产环境）deployment, Production migration, Production import, PTE / IELTS toggle implementation, external vocabulary source, authentication（认证）, analytics（分析追踪）, AI generation, PWA（Progressive Web App，渐进式 Web 应用）, email, notification, or 付费/扣款 feature was performed.
