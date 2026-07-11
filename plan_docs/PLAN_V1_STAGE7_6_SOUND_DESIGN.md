# Words Learning App For Mimi Stage 7.6: Sound Design

Source plan: `plan_docs/PLAN_V1_MASTER.md`
Derived from: `plan_docs/PLAN_V1_STAGE7_UI_VISUAL_DESIGN.md`, `plan_docs/PLAN_V1_STAGE7_5_SOFT_CLICK_SOUND_TRIAL.md`, and the user request to promote the accepted soft click into app-wide button feedback while adding a custom Mimi review-completion sound.
Scope: turn the accepted Stage 7.5 soft click into the app's standard button sound; add UI-only sound settings with separate ON / OFF controls for button sound and review-completion sound; add small audition buttons in Settings; add a review-completion modal with `已完成今日复习任务` and a `确定` button that plays the user-provided Mimi custom sound.
Non-Scope: no review scheduler（复习调度算法）change, no review interval change, no vocabulary data schema（数据结构）change, no JSON backup（JSON 备份）schema change, no CSV（逗号分隔值）export change, no Postgres table change, no API（应用程序接口）payload change, no PTE / IELTS toggle implementation, no external vocabulary source, no notification, no background audio, no analytics（分析追踪）, no AI generation, no Vercel command, no Neon command, no Production（生产环境）deployment, no Production data mutation, and no 付费/扣款 feature.
Exit criteria: Settings contains a `Sound` panel with two ON / OFF segmented controls and small audition buttons; normal app buttons play the accepted soft click only when button sound is ON; review completion opens a calm confirmation modal and plays the custom completion sound from the `确定` button only when review-completion sound is ON; the sound preferences are stored as UI-only local browser preference; local validation passes; docs record that no study data, backup data, remote data, or Production behavior changed.

## Design Decision

Stage 7.5 proved that the generated soft click feels acceptable after tuning. Stage 7.6 promotes that generated sound into the normal button feedback layer.

Button sound direction:

- Use the current generated soft click from Stage 7.5.
- Keep it very short, low-volume, and tactile.
- Keep the Kenney CC0 file only as fallback / provenance for the click trial, not as the normal playback layer.
- Apply it broadly to normal app buttons and button-like controls, while skipping dedicated sound audition buttons so preview playback stays clean.

Review-completion sound direction:

- Use the user-provided custom Mimi sound from `/Users/anoria/Desktop/LockChime.WAV`.
- Local inspection shows the uploaded file has a `.WAV` extension but is actually AAC / m4af audio, about 3.67 seconds long.
- Store the copied asset under an honest browser-facing name such as `public/sounds/mimi-review-complete.m4a`.
- Treat this as a local user-provided asset. No open-source license lookup is required because the user provided the file for this app.

Settings behavior:

- Replace the Stage 7.5 preview-only Settings block with a `Sound` settings block.
- Use two segmented ON / OFF button groups:
  - Button sound
  - Review completion sound
- Put a small audition button on the right side of each setting row.
- Persist the settings under a UI-only `localStorage`（本地浏览器存储）key.
- Default both sounds to ON, because the user explicitly accepted the button sound and requested the completion sound.

## Implementation Plan

1. Add pure sound-setting helpers for reading, normalizing, storing, and subscribing to UI-only sound preferences.
2. Add a client sound provider at the app root that listens for pointer-down events on enabled buttons and plays the accepted generated soft click when button sound is ON.
3. Replace `SoundPreviewCard` with a Settings sound form that has two ON / OFF segmented controls plus small audition buttons.
4. Copy the user-provided Mimi completion sound into `public/sounds/` as a local static asset.
5. Add a calm review-completion modal in `ReviewSession` after the last card in the current session is recorded.
6. Make the modal `确定` button close the modal and play the completion sound only when review-completion sound is ON.
7. Sync parent planning docs, architecture notes, changelog, README, AGENTS, and AI agent log.

## Validation Plan

```bash
npm run lint
npm run typecheck
npm run test
npm run build
git diff --check
npm run governance:preflight
```

Manual / browser validation:

- Open `/settings`.
- Confirm `Sound` shows two rows, each with ON / OFF buttons and a small audition button.
- Confirm ON / OFF preferences persist after reload.
- Confirm button audition plays the accepted soft click without console errors.
- Confirm review-completion audition plays the custom Mimi completion sound without console errors.
- Open `/review`, complete a session with available cards, and confirm the completion modal appears only after the last card is recorded.
- Click `确定` and confirm the modal closes; if review-completion sound is ON, the custom sound is attempted from the user gesture.

Safety notes:

- This stage changes local UI behavior and UI-only preferences.
- The new sound preference is not vocabulary data, review history, review settings, backup data, CSV export data, Postgres data, API data, or Production data.
- No remote command, env var read/change, database command, deployment, import, authentication（认证）, analytics, notification, background audio, external vocabulary source, PTE / IELTS toggle, PWA（Progressive Web App，渐进式 Web 应用）, email, or 付费/扣款 behavior is part of this stage.

## Implementation Record

Status: executed locally on 2026-07-06 21:55 AEST.

Changed implementation:

- Added `src/lib/ui/sound-settings.ts` for UI-only sound preference normalization and serialization.
- Added `src/lib/ui/sound-settings.test.ts` to cover defaults, malformed values, and serialized settings.
- Added `src/lib/ui/sound-player.ts` so the accepted Stage 7.5 generated click can be reused beyond Settings, and so the review-completion sound can be played from the local static asset.
- Added `src/components/sound-provider.tsx` and mounted it in `src/app/layout.tsx`.
- Replaced the Stage 7.5 preview-only component with `src/components/settings/sound-settings-form.tsx`.
- Updated `src/app/settings/page.tsx` so the Settings `Sound` panel now contains two ON / OFF controls and two small audition buttons.
- Added the user-provided Mimi completion sound as `public/sounds/mimi-review-complete.m4a`; local inspection showed the source file `/Users/anoria/Desktop/LockChime.WAV` is actually AAC / m4af audio, about 3.67 seconds long.
- Updated `src/components/review/review-session.tsx` so a calm completion modal appears after the last card in the current session is successfully recorded. The `确定` button closes the modal and plays the Mimi completion sound when review-completion sound is ON.

Behavior notes:

- Button sound defaults to ON and can be switched OFF in Settings.
- Review-completion sound defaults to ON and can be switched OFF in Settings.
- Dedicated audition buttons and the review-completion confirmation button use `data-mimi-sound-skip="true"` so the normal button click sound does not layer over preview or completion playback.
- Normal app button feedback is decorative. If browser audio playback is blocked, app actions continue.

Validation completed:

- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: `npm run test` with 14 files and 52 tests.
- Passed: `npm run build`.
- Passed: `git diff --check`.
- Passed: local HTTP check for `/settings`; response is normal HTML and contains the new `Button sound` / `Review complete` Settings text.
- Passed: local HTTP `HEAD` check for `public/sounds/mimi-soft-click.m4a` through `/sounds/mimi-soft-click.m4a`, returning HTTP 200 and `Content-Type: audio/mp4`.
- Passed: local HTTP `HEAD` check for `public/sounds/mimi-review-complete.m4a` through `/sounds/mimi-review-complete.m4a`, returning HTTP 200 and `Content-Type: audio/mp4`.
- Partially passed: in-app browser DOM verification initially confirmed the Settings `Sound` panel, default ON states, small audition buttons, and no horizontal overflow. During deeper click automation the in-app browser automation tab began rendering a Next RSC（React Server Components，React 服务器组件）stream instead of normal HTML, while shell `curl` continued to return normal HTML. This blocked a reliable automated click-through of the new controls in that browser surface.

Safety notes:

- Local UI, static audio asset, and documentation changes only.
- No vocabulary data mutation, review scheduler change, import parser change, JSON backup schema change, CSV export change, Postgres table change, API payload change, Vercel command, Neon command, env var read/change, Production（生产环境）deployment, Production migration, Production import, formal user backup import, notification, background audio, authentication（认证）, analytics（分析追踪）, AI generation, external vocabulary source, PTE / IELTS toggle implementation, PWA implementation, email, or 付费/扣款 feature was performed.

## Hotfix Record

Status: executed locally on 2026-07-06 22:13 AEST.

Issue:

- Refreshing localhost could trigger the Next.js development overlay errors `The result of getSnapshot should be cached to avoid an infinite loop` and `Maximum update depth exceeded`.
- Root cause: `SoundProvider` used `useSyncExternalStore`, but `readStoredSoundSettings()` parsed `localStorage` into a fresh object on each `getSnapshot` call. Even when the sound preference contents did not change, the object reference changed, so React treated the external snapshot as changed on every render.

Fix:

- Cached the raw `mimi-ui-sound-v1` value and the parsed `MimiSoundSettings` object in `src/components/sound-provider.tsx`.
- `readStoredSoundSettings()` now returns the existing object when the stored raw value is unchanged.
- `writeStoredSoundSettings()` updates both the cached raw value and the cached parsed object before notifying subscribers.

Validation completed:

- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: `npm run test` with 14 files and 52 tests.
- Passed: `npm run build`.
- Passed: local HTTP check for `/settings`, returning normal HTML.

## Button Sound Hotfix Record

Status: executed locally on 2026-07-06 22:18 AEST.

Issue:

- Button sound could be ON in Settings while normal app buttons still did not audibly play the soft click.
- Root cause: the global event listener called `playSoftButtonClick()`, but the playback path awaited `AudioContext.resume()` before scheduling the generated click. That can move the actual sound scheduling outside the browser's short user-gesture activation window.
- Secondary gap: the global target selector included styled `a.mimi-button` and `a.mimi-button-secondary`, but not all real link-button interactions.

Fix:

- `playSoftButtonClick()` now schedules the generated Web Audio API（网页音频接口）click synchronously during the pointer / keyboard event. If the audio context is suspended, it starts `resume()` without awaiting it.
- The global button-sound selector now covers `button`, `[role='button']`, and `a[href]`.
- `data-mimi-sound-skip="true"` remains the opt-out for dedicated audition buttons and the review-completion confirmation button.

Validation completed:

- Passed: `npm run lint`.
- Passed: `npm run typecheck`.
- Passed: `npm run test` with 14 files and 52 tests.
- Passed: `npm run build`.
- Passed: local HTTP check for `/settings`, confirming the Settings Sound UI still renders in normal HTML.
