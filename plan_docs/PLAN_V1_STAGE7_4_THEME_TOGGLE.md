# Words Learning App For Mimi Stage 7.4: Light / Dark Theme Toggle

Source plan: `plan_docs/PLAN_V1_MASTER.md`
Derived from: `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md`, `plan_docs/PLAN_V1_STAGE7_2_UI_REFINEMENT.md`, `plan_docs/PLAN_V1_STAGE7_3_CHILLROUND_FONT_TRIAL.md`, and the user request to add a light version while retaining light / dark switching in Settings.
Scope: add a local UI（用户界面）theme（主题）preference with `dark` and `light` modes, keep the existing darker sage design as the default, add a softer light sage version, and expose the switch in `/settings`.
Non-Scope: no review scheduler change, no import parser change, no vocabulary schema change, no JSON backup schema change, no Postgres data model change, no Vercel command, no Neon command, no Production（生产环境）deployment, no Production data mutation, no PTE / IELTS toggle implementation, no external vocabulary source, no authentication（认证）implementation, no PWA（Progressive Web App，渐进式 Web 应用）implementation.
Exit criteria: `/settings` can switch between light and dark themes, the preference persists in separate browser `localStorage`（本地浏览器存储）, refresh keeps the selected theme, both themes render mobile and desktop without horizontal overflow, local validation passes, and documents record that theme preference is UI-only rather than study data.

## Design Decision

Default theme:

- Keep `dark` as the default because Stage 7 intentionally moved away from a sleepy, high-white interface.

Light theme:

- Use a warm sage paper background rather than pure white.
- Keep cards ivory / parchment and borders low-contrast.
- Keep the sidebar readable with a softer green surface instead of a bright white rail.
- Preserve the existing cat brand, ChillRoundF 寒蝉全圆体, rounded cards, and calm motion.

Persistence:

- Store only the theme preference under a separate UI key: `mimi-ui-theme-v1`.
- Do not add this preference to vocabulary data, review settings, people, backup JSON, CSV export, Postgres tables, or API payloads.

## Implementation Plan

1. Add a client-side ThemeProvider（主题提供器）that applies `data-mimi-theme="dark"` or `data-mimi-theme="light"` to the document root.
2. Add a small theme repository / hook boundary for safe `localStorage` access.
3. Add light-mode CSS variable overrides and replace key shell / navigation hard-coded colors with theme variables.
4. Add `ThemeSettingsForm` to `/settings`.
5. Sync Stage 7 parent docs, changelog, architecture, README, AGENTS, and AI agent log.

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

- Check `/` and `/settings` in desktop and mobile widths.
- Toggle dark to light and light to dark in Settings.
- Confirm `localStorage["mimi-ui-theme-v1"]` persists the selected theme.
- Reload and confirm the selected theme remains active.
- Confirm no horizontal overflow and no browser console errors.

## Implementation Record

Status: executed locally on 2026-07-06 17:26 AEST.

Changed implementation:

- Added `ThemeProvider` and `useMimiTheme` in `src/components/theme-provider.tsx`.
- Wrapped the app with `ThemeProvider` from `src/app/layout.tsx`.
- Added a small inline theme boot script as the first child of `<body>` so a stored light theme applies before the main UI renders.
- Added `ThemeSettingsForm` in `src/components/settings/theme-settings-form.tsx`.
- Added the Theme panel to `/settings`.
- Added CSS（层叠样式表）variables for the existing dark sage theme and the new warm sage light theme.
- Replaced key shell, navigation, brand, panel, and review-schedule hard-coded colors with theme variables.

Validation completed:

- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: `npm run test` with 13 files and 48 tests.
- Passed: `npm run build`.
- Passed: in-app browser verification at 1280 x 720 for `/settings` and `/`.
- Passed: clicking Light changed `data-mimi-theme` to `light`, switched the active setting card, used the light background variable `#e8eee3`, and had no horizontal overflow.
- Passed: reloading `/settings` after selecting Light kept `data-mimi-theme="light"` and the Light setting card active.
- Passed: clicking Dark changed `data-mimi-theme` back to `dark`, used the dark background variable `#26362f`, and `/` kept the dark theme after navigation.
- Passed: `/` still shows `咪咪 Vocabulary`, does not show `LexiCalm`, and has no horizontal overflow at the verified viewport.
- Passed: after moving the boot script into `<body>`, the fresh browser verification produced no new warning / error console logs.

Validation limitation:

- The in-app Browser plugin available in this session does not expose a viewport resize API（应用程序接口）, and this repository does not currently have a local Playwright binary installed. Mobile-width behavior was not re-verified by automated viewport resize in this Stage 7.4 run; it remains covered by the existing responsive implementation and prior Stage 7 / Stage 7.2 browser checks.

Safety notes:

- Local UI and documentation changes only.
- No vocabulary data migration, review scheduler change, import parser change, JSON backup schema change, CSV export change, Postgres table change, API payload change, Vercel command, Neon command, env var read/change, Production（生产环境）deployment, Production migration, Production import, authentication（认证）, analytics（分析追踪）, AI generation, external vocabulary source, PTE / IELTS toggle implementation, PWA implementation, email, notification, or 付费/扣款 feature was performed.
